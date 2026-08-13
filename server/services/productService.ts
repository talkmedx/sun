import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { query, queryOne, execute, withTransaction } from '../config/database';
import { NotFoundError, ConflictError, AppError } from '../utils/errors';
import { paginate, likePattern } from '../helpers/queryHelpers';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  vendor_id?: number;
  is_active?: boolean;
  stock_status?: 'available' | 'out_of_stock' | 'all';
}

export async function listProducts(params: ListParams) {
  const { page, limit, offset } = paginate(params.page, params.limit);
  const conditions = ['p.deleted_at IS NULL'];
  const q: Record<string, unknown> = {};

  if (params.search) {
    conditions.push('(p.name LIKE :search OR p.sku LIKE :search OR v.name LIKE :search)');
    q.search = likePattern(params.search);
  }
  if (params.vendor_id) {
    conditions.push('p.vendor_id = :vendorId');
    q.vendorId = params.vendor_id;
  }
  if (params.is_active !== undefined) {
    conditions.push('p.is_active = :isActive');
    q.isActive = params.is_active ? 1 : 0;
  }
  if (params.stock_status === 'available') {
    conditions.push('p.quantity_available > 0');
  } else if (params.stock_status === 'out_of_stock') {
    conditions.push('p.quantity_available = 0');
  }

  const where = conditions.join(' AND ');
  const countRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM products p LEFT JOIN vendors v ON v.id = p.vendor_id WHERE ${where}`,
    q
  );

  const rows = await query<RowDataPacket[]>(
    `SELECT p.*, v.name AS vendor_name,
            (p.quantity_available * p.cost_price) AS stock_value
     FROM products p
     LEFT JOIN vendors v ON v.id = p.vendor_id
     WHERE ${where}
     ORDER BY p.name ASC
     LIMIT ${limit} OFFSET ${offset}`,
    q
  );

  const total = Number(countRow?.total ?? 0);
  return { rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getProductSummary() {
  const stockSummary = await queryOne<RowDataPacket>(
    `SELECT
       COALESCE(SUM(quantity_available), 0) AS units_available,
       COALESCE(SUM(quantity_available * cost_price), 0) AS total_cost_available,
       COALESCE(SUM(quantity_available * selling_price), 0) AS total_selling_available,
       COALESCE(SUM(quantity_available * (selling_price - cost_price)), 0) AS total_profit_available
     FROM products
     WHERE deleted_at IS NULL AND is_active = 1`
  );

  const salesSummary = await queryOne<RowDataPacket>(
    `SELECT
       COALESCE(SUM(quantity), 0) AS units_sold,
       COALESCE(SUM(quantity * unit_cost_price), 0) AS total_cost_sold,
       COALESCE(SUM(total_amount), 0) AS total_selling_sold,
       COALESCE(SUM(total_amount - (quantity * unit_cost_price)), 0) AS total_profit_sold
     FROM student_products
     WHERE deleted_at IS NULL`
  );

  return {
    units_available: Number(stockSummary?.units_available || 0),
    total_cost_available: Number(stockSummary?.total_cost_available || 0),
    total_selling_available: Number(stockSummary?.total_selling_available || 0),
    total_profit_available: Number(stockSummary?.total_profit_available || 0),
    units_sold: Number(salesSummary?.units_sold || 0),
    total_cost_sold: Number(salesSummary?.total_cost_sold || 0),
    total_selling_sold: Number(salesSummary?.total_selling_sold || 0),
    total_profit_sold: Number(salesSummary?.total_profit_sold || 0),
  };
}

export async function getProduct(id: number) {
  const product = await queryOne<RowDataPacket>(
    `SELECT p.*, v.name AS vendor_name
     FROM products p
     LEFT JOIN vendors v ON v.id = p.vendor_id
     WHERE p.id = :id AND p.deleted_at IS NULL`,
    { id }
  );
  if (!product) throw new NotFoundError('Product');
  return product;
}

export async function createProduct(data: Record<string, unknown>, userId: number) {
  const dup = await queryOne<RowDataPacket>(
    `SELECT id FROM products WHERE name = :name AND deleted_at IS NULL`,
    { name: data.name }
  );
  if (dup) throw new ConflictError('Product with this name already exists');

  if (data.sku) {
    const dupSku = await queryOne<RowDataPacket>(
      `SELECT id FROM products WHERE sku = :sku AND deleted_at IS NULL`,
      { sku: data.sku }
    );
    if (dupSku) throw new ConflictError('Product with this SKU already exists');
  }

  return withTransaction(async (conn) => {
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO products
        (sku, name, description, vendor_id, cost_price, selling_price, quantity_available,
         low_stock_threshold, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        (data.sku as string) || null,
        data.name as string,
        (data.description as string) || null,
        (data.vendor_id as number) || null,
        data.cost_price as number,
        data.selling_price as number,
        (data.quantity_available as number) ?? 0,
        (data.low_stock_threshold as number) ?? 5,
        data.is_active === false ? 0 : 1,
        userId,
      ]
    );

    // Initial price history row
    await conn.execute(
      `INSERT INTO product_price_history
        (product_id, cost_price, selling_price, effective_from, effective_to, changed_by, change_reason)
       VALUES (?, ?, ?, NOW(), NULL, ?, 'Initial pricing')`,
      [result.insertId, Number(data.cost_price), Number(data.selling_price), userId]
    );

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM products WHERE id = ?`,
      [result.insertId]
    );
    return rows[0];
  });
}

export async function updateProduct(id: number, data: Record<string, unknown>, userId: number) {
  const product = await getProduct(id);

  if (data.name) {
    const dup = await queryOne<RowDataPacket>(
      `SELECT id FROM products WHERE name = :name AND id != :id AND deleted_at IS NULL`,
      { name: data.name, id }
    );
    if (dup) throw new ConflictError('Product with this name already exists');
  }

  return withTransaction(async (conn) => {
    const costChanged =
      data.cost_price !== undefined && Number(data.cost_price) !== Number(product.cost_price);
    const sellChanged =
      data.selling_price !== undefined &&
      Number(data.selling_price) !== Number(product.selling_price);

    const fields = [
      'sku', 'name', 'description', 'vendor_id', 'cost_price', 'selling_price',
      'quantity_available', 'low_stock_threshold', 'is_active',
    ];
    const sets: string[] = [];
    const values: (string | number | null)[] = [];

    for (const f of fields) {
      if (data[f] !== undefined) {
        sets.push(`${f} = ?`);
        const val = typeof data[f] === 'boolean' ? (data[f] ? 1 : 0) : data[f] === '' ? null : data[f];
        values.push(val as string | number | null);
      }
    }

    if (sets.length) {
      values.push(id);
      await conn.execute(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, values);
    }

    // Never mutate historical price rows — close old, insert new
    if (costChanged || sellChanged) {
      const newCost = data.cost_price !== undefined ? Number(data.cost_price) : Number(product.cost_price);
      const newSell =
        data.selling_price !== undefined ? Number(data.selling_price) : Number(product.selling_price);

      await conn.execute(
        `UPDATE product_price_history
         SET effective_to = NOW()
         WHERE product_id = ? AND effective_to IS NULL AND deleted_at IS NULL`,
        [id]
      );

      await conn.execute(
        `INSERT INTO product_price_history
          (product_id, cost_price, selling_price, effective_from, effective_to, changed_by, change_reason)
         VALUES (?, ?, ?, NOW(), NULL, ?, ?)`,
        [id, newCost, newSell, userId, (data as { change_reason?: string }).change_reason || 'Price update']
      );
    }

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM products WHERE id = ?`,
      [id]
    );
    return rows[0];
  });
}

export async function deleteProduct(id: number) {
  const product = await getProduct(id);
  if (Number(product.quantity_sold) > 0) {
    throw new AppError('Cannot delete product that has already been sold', 400);
  }

  const sales = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS count FROM student_products WHERE product_id = :id AND deleted_at IS NULL`,
    { id }
  );
  if (Number(sales?.count) > 0) {
    throw new AppError('Cannot delete product that has already been sold', 400);
  }

  await execute(`UPDATE products SET deleted_at = NOW() WHERE id = :id`, { id });
}

export async function getPriceHistory(productId: number) {
  await getProduct(productId);
  return query<RowDataPacket[]>(
    `SELECT pph.*, u.name AS changed_by_name
     FROM product_price_history pph
     LEFT JOIN users u ON u.id = pph.changed_by
     WHERE pph.product_id = :productId AND pph.deleted_at IS NULL
     ORDER BY pph.effective_from DESC`,
    { productId }
  );
}

export async function adjustStock(productId: number, quantity: number, type: 'add' | 'remove') {
  return withTransaction(async (conn) => {
    const [products] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM products WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
      [productId]
    );
    const product = products[0];
    if (!product) throw new NotFoundError('Product');

    if (type === 'remove' && product.quantity_available < quantity) {
      throw new AppError('Insufficient stock', 400);
    }

    const delta = type === 'add' ? quantity : -quantity;
    await conn.execute(
      `UPDATE products SET quantity_available = quantity_available + ? WHERE id = ?`,
      [delta, productId]
    );

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM products WHERE id = ?`,
      [productId]
    );
    return rows[0];
  });
}
