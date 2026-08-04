import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { query, queryOne, execute, withTransaction } from '../config/database';
import { NotFoundError, AppError } from '../utils/errors';
import { paginate, likePattern, getFinancialYear } from '../helpers/queryHelpers';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  batch_id?: number;
  vendor_id?: number;
  category?: string;
}

export async function listExpenses(params: ListParams) {
  const { page, limit, offset } = paginate(params.page, params.limit);
  const conditions = ['e.deleted_at IS NULL'];
  const q: Record<string, unknown> = {};

  if (params.search) {
    conditions.push('(e.title LIKE :search OR e.description LIKE :search OR e.category LIKE :search)');
    q.search = likePattern(params.search);
  }
  if (params.batch_id) {
    conditions.push('e.batch_id = :batchId');
    q.batchId = params.batch_id;
  }
  if (params.vendor_id) {
    conditions.push('e.vendor_id = :vendorId');
    q.vendorId = params.vendor_id;
  }
  if (params.category) {
    conditions.push('e.category = :category');
    q.category = params.category;
  }

  const where = conditions.join(' AND ');
  const countRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM expenses e WHERE ${where}`,
    q
  );

  const rows = await query<RowDataPacket[]>(
    `SELECT e.*, b.name AS batch_name, v.name AS vendor_name
     FROM expenses e
     LEFT JOIN batches b ON b.id = e.batch_id
     LEFT JOIN vendors v ON v.id = e.vendor_id
     WHERE ${where}
     ORDER BY e.expense_date DESC, e.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    q
  );

  const total = Number(countRow?.total ?? 0);
  return { rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getExpense(id: number) {
  const row = await queryOne<RowDataPacket>(
    `SELECT e.*, b.name AS batch_name, v.name AS vendor_name
     FROM expenses e
     LEFT JOIN batches b ON b.id = e.batch_id
     LEFT JOIN vendors v ON v.id = e.vendor_id
     WHERE e.id = :id AND e.deleted_at IS NULL`,
    { id }
  );
  if (!row) throw new NotFoundError('Expense');
  return row;
}

export async function createExpense(
  data: Record<string, unknown>,
  userId: number,
  screenshotUrl?: string
) {
  return withTransaction(async (conn) => {
    const useCredit = Boolean(data.use_vendor_credit) || data.payment_mode === 'vendor_credit';
    const amount = Number(data.amount);
    const vendorId = data.vendor_id ? Number(data.vendor_id) : null;
    const fy = getFinancialYear(new Date(String(data.expense_date)));

    if (useCredit) {
      if (!vendorId) throw new AppError('Vendor is required when using vendor credit', 400);

      const [vendors] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM vendors WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
        [vendorId]
      );
      const vendor = vendors[0];
      if (!vendor) throw new NotFoundError('Vendor');
      if (Number(vendor.pending_credit) < amount) {
        throw new AppError('Insufficient vendor credit', 400);
      }
    }

    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO expenses
        (title, description, amount, category, batch_id, vendor_id, expense_date,
         payment_mode, use_vendor_credit, screenshot_url, financial_year, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.description || null,
        amount,
        data.category || null,
        data.batch_id || null,
        vendorId,
        data.expense_date,
        useCredit ? 'vendor_credit' : data.payment_mode || 'cash',
        useCredit ? 1 : 0,
        screenshotUrl || null,
        fy,
        userId,
      ] as (string | number | null)[]
    );

    if (useCredit && vendorId) {
      await conn.execute(
        `UPDATE vendors SET pending_credit = pending_credit - ? WHERE id = ?`,
        [amount, vendorId]
      );
      await conn.execute(
        `INSERT INTO vendor_credits
          (vendor_id, amount, type, expense_id, description, transaction_date, recorded_by)
         VALUES (?, ?, 'credit_used', ?, ?, ?, ?)`,
        [
          vendorId,
          amount,
          result.insertId,
          `Expense: ${String(data.title)}`,
          String(data.expense_date),
          userId,
        ]
      );
    }

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM expenses WHERE id = ?`,
      [result.insertId]
    );
    return rows[0];
  });
}

export async function updateExpense(id: number, data: Record<string, unknown>) {
  await getExpense(id);

  const fields = [
    'title', 'description', 'amount', 'category', 'batch_id', 'vendor_id',
    'expense_date', 'payment_mode',
  ];
  const sets: string[] = [];
  const params: Record<string, unknown> = { id };

  for (const f of fields) {
    if (data[f] !== undefined) {
      sets.push(`${f} = :${f}`);
      params[f] = data[f] === '' ? null : data[f];
    }
  }

  if (sets.length) {
    await execute(`UPDATE expenses SET ${sets.join(', ')} WHERE id = :id`, params);
  }
  return getExpense(id);
}

export async function deleteExpense(id: number) {
  const expense = await getExpense(id);

  // If used vendor credit, restore it
  if (expense.use_vendor_credit && expense.vendor_id) {
    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE vendors SET pending_credit = pending_credit + ? WHERE id = ?`,
        [expense.amount, expense.vendor_id]
      );
      await conn.execute(
        `UPDATE vendor_credits SET deleted_at = NOW()
         WHERE expense_id = ? AND deleted_at IS NULL`,
        [id]
      );
      await conn.execute(`UPDATE expenses SET deleted_at = NOW() WHERE id = ?`, [id]);
    });
  } else {
    await execute(`UPDATE expenses SET deleted_at = NOW() WHERE id = :id`, { id });
  }
}

export async function updateScreenshot(id: number, url: string) {
  await getExpense(id);
  await execute(`UPDATE expenses SET screenshot_url = :url WHERE id = :id`, { url, id });
  return getExpense(id);
}
