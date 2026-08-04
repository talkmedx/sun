import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { query, queryOne, execute, withTransaction } from '../config/database';
import { NotFoundError, ConflictError, AppError } from '../utils/errors';
import { paginate, likePattern, buildSort } from '../helpers/queryHelpers';
import { generateStudentCode, normalizePhone } from '../helpers/generators';
import { getFinancialYear } from '../helpers/queryHelpers';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  batch_id?: number;
  status?: string;
  sort?: string;
  order?: string;
}

export async function listStudents(params: ListParams) {
  const { page, limit, offset } = paginate(params.page, params.limit);
  const conditions = ['s.deleted_at IS NULL'];
  const q: Record<string, unknown> = {};

  if (params.search) {
    conditions.push(
      `(s.first_name LIKE :search OR s.last_name LIKE :search OR s.phone LIKE :search OR s.email LIKE :search OR s.student_code LIKE :search)`
    );
    q.search = likePattern(params.search);
  }
  if (params.batch_id) {
    conditions.push('s.batch_id = :batchId');
    q.batchId = params.batch_id;
  }
  if (params.status) {
    conditions.push('s.status = :status');
    q.status = params.status;
  }

  const where = conditions.join(' AND ');
  const sort = buildSort(params.sort, params.order, [
    'created_at', 'first_name', 'fees_paid', 'fees_committed', 'student_code',
  ]);

  const countRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM students s WHERE ${where}`,
    q
  );

  const rows = await query<RowDataPacket[]>(
    `SELECT s.*, b.name AS batch_name,
            (s.fees_committed - s.fees_paid) AS pending_fees
     FROM students s
     LEFT JOIN batches b ON b.id = s.batch_id
     WHERE ${where}
     ORDER BY s.${sort}
     LIMIT ${limit} OFFSET ${offset}`,
    q
  );

  const total = Number(countRow?.total ?? 0);
  return {
    rows,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

export async function getStudent(id: number) {
  const student = await queryOne<RowDataPacket>(
    `SELECT s.*, b.name AS batch_name,
            (s.fees_committed - s.fees_paid) AS pending_fees
     FROM students s
     LEFT JOIN batches b ON b.id = s.batch_id
     WHERE s.id = :id AND s.deleted_at IS NULL`,
    { id }
  );
  if (!student) throw new NotFoundError('Student');
  return student;
}

export async function createStudent(data: Record<string, unknown>, userId: number) {
  const phone = normalizePhone(String(data.phone));

  const dup = await queryOne<RowDataPacket>(
    `SELECT id FROM students WHERE phone = :phone AND deleted_at IS NULL`,
    { phone }
  );
  if (dup) throw new ConflictError('Student with this phone already exists');

  // Generate student code
  const seqRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) + 1 AS seq FROM students`
  );
  const code = generateStudentCode(Number(seqRow?.seq ?? 1));

  let feesCommitted = data.fees_committed as number | undefined;
  if (feesCommitted == null && data.batch_id) {
    const batch = await queryOne<RowDataPacket>(
      `SELECT course_fee, offer_fee FROM batches WHERE id = :id AND deleted_at IS NULL`,
      { id: data.batch_id }
    );
    if (batch) {
      feesCommitted = Number(batch.offer_fee ?? batch.course_fee);
    }
  }

  const result = await execute(
    `INSERT INTO students
      (student_code, first_name, last_name, email, phone, alternate_phone, date_of_birth, gender,
       address_line1, address_line2, city, state, pincode, batch_id, fees_committed, status, notes, created_by)
     VALUES
      (:code, :first_name, :last_name, :email, :phone, :alternate_phone, :date_of_birth, :gender,
       :address_line1, :address_line2, :city, :state, :pincode, :batch_id, :fees_committed, :status, :notes, :created_by)`,
    {
      code,
      first_name: data.first_name,
      last_name: data.last_name || null,
      email: data.email || null,
      phone,
      alternate_phone: data.alternate_phone || null,
      date_of_birth: data.date_of_birth || null,
      gender: data.gender || null,
      address_line1: data.address_line1 || null,
      address_line2: data.address_line2 || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      batch_id: data.batch_id || null,
      fees_committed: feesCommitted ?? 0,
      status: data.status || 'active',
      notes: data.notes || null,
      created_by: userId,
    }
  );

  return getStudent(result.insertId);
}

export async function updateStudent(id: number, data: Record<string, unknown>) {
  await getStudent(id);

  if (data.phone) {
    const phone = normalizePhone(String(data.phone));
    const dup = await queryOne<RowDataPacket>(
      `SELECT id FROM students WHERE phone = :phone AND id != :id AND deleted_at IS NULL`,
      { phone, id }
    );
    if (dup) throw new ConflictError('Student with this phone already exists');
    data.phone = phone;
  }

  const fields = [
    'first_name', 'last_name', 'email', 'phone', 'alternate_phone', 'date_of_birth', 'gender',
    'address_line1', 'address_line2', 'city', 'state', 'pincode', 'batch_id',
    'fees_committed', 'status', 'notes',
  ];

  const sets: string[] = [];
  const params: Record<string, unknown> = { id };

  for (const f of fields) {
    if (data[f] !== undefined) {
      sets.push(`${f} = :${f}`);
      params[f] = data[f] === '' ? null : data[f];
    }
  }

  if (!sets.length) return getStudent(id);

  await execute(`UPDATE students SET ${sets.join(', ')} WHERE id = :id`, params);
  return getStudent(id);
}

export async function deleteStudent(id: number) {
  await getStudent(id);
  await execute(`UPDATE students SET deleted_at = NOW() WHERE id = :id`, { id });
}

export async function updatePhoto(id: number, photoUrl: string) {
  await getStudent(id);
  await execute(`UPDATE students SET photo_url = :photoUrl WHERE id = :id`, { photoUrl, id });
  return getStudent(id);
}

export async function listFees(studentId: number) {
  await getStudent(studentId);
  return query<RowDataPacket[]>(
    `SELECT * FROM fee_transactions
     WHERE student_id = :studentId AND deleted_at IS NULL
     ORDER BY payment_date DESC`,
    { studentId }
  );
}

export async function addFee(
  studentId: number,
  data: Record<string, unknown>,
  userId: number,
  screenshotUrl?: string
) {
  return withTransaction(async (conn) => {
    const [students] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM students WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
      [studentId]
    );
    const student = students[0];
    if (!student) throw new NotFoundError('Student');

    const amount = Number(data.amount);
    const fy = getFinancialYear(new Date(String(data.payment_date)));

    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO fee_transactions
        (student_id, batch_id, amount, payment_mode, payment_date, screenshot_url, reference_no, notes, financial_year, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId,
        student.batch_id,
        amount,
        data.payment_mode || 'upi',
        data.payment_date,
        screenshotUrl || null,
        data.reference_no || null,
        data.notes || null,
        fy,
        userId,
      ]
    );

    await conn.execute(
      `UPDATE students SET fees_paid = fees_paid + ? WHERE id = ?`,
      [amount, studentId]
    );

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM fee_transactions WHERE id = ?`,
      [result.insertId]
    );
    return rows[0];
  });
}

export async function listStudentProducts(studentId: number) {
  await getStudent(studentId);
  return query<RowDataPacket[]>(
    `SELECT sp.*, p.name AS product_name, p.sku
     FROM student_products sp
     JOIN products p ON p.id = sp.product_id
     WHERE sp.student_id = :studentId AND sp.deleted_at IS NULL
     ORDER BY sp.purchase_date DESC`,
    { studentId }
  );
}

export async function addStudentProduct(
  studentId: number,
  data: Record<string, unknown>,
  userId: number
) {
  return withTransaction(async (conn) => {
    const [students] = await conn.execute<RowDataPacket[]>(
      `SELECT id FROM students WHERE id = ? AND deleted_at IS NULL`,
      [studentId]
    );
    if (!students[0]) throw new NotFoundError('Student');

    const productId = Number(data.product_id);
    const qty = Number(data.quantity);

    const [products] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM products WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
      [productId]
    );
    const product = products[0];
    if (!product) throw new NotFoundError('Product');
    if (product.quantity_available < qty) {
      throw new AppError('Insufficient stock', 400);
    }

    // Get current price history row
    const [history] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM product_price_history
       WHERE product_id = ? AND effective_to IS NULL AND deleted_at IS NULL
       ORDER BY effective_from DESC LIMIT 1`,
      [productId]
    );
    const priceRow = history[0];
    const unitCost = Number(priceRow?.cost_price ?? product.cost_price);
    const unitSell = Number(priceRow?.selling_price ?? product.selling_price);
    const total = unitSell * qty;

    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO student_products
        (student_id, product_id, price_history_id, quantity, unit_cost_price, unit_selling_price,
         total_amount, purchase_date, payment_mode, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId,
        productId,
        priceRow?.id ?? null,
        qty,
        unitCost,
        unitSell,
        total,
        data.purchase_date,
        data.payment_mode || 'cash',
        data.notes || null,
        userId,
      ]
    );

    await conn.execute(
      `UPDATE products
       SET quantity_available = quantity_available - ?,
           quantity_sold = quantity_sold + ?
       WHERE id = ?`,
      [qty, qty, productId]
    );

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT sp.*, p.name AS product_name FROM student_products sp
       JOIN products p ON p.id = sp.product_id WHERE sp.id = ?`,
      [result.insertId]
    );
    return rows[0];
  });
}

export async function listDocuments(studentId: number) {
  return query<RowDataPacket[]>(
    `SELECT * FROM documents
     WHERE entity_type = 'student' AND entity_id = :studentId AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    { studentId }
  );
}

export async function addDocument(
  studentId: number,
  title: string,
  fileUrl: string,
  fileType: string | undefined,
  fileSize: number | undefined,
  userId: number
) {
  await getStudent(studentId);
  const result = await execute(
    `INSERT INTO documents (entity_type, entity_id, title, file_url, file_type, file_size, uploaded_by)
     VALUES ('student', :studentId, :title, :fileUrl, :fileType, :fileSize, :userId)`,
    { studentId, title, fileUrl, fileType: fileType || null, fileSize: fileSize || null, userId }
  );
  return queryOne<RowDataPacket>(`SELECT * FROM documents WHERE id = :id`, {
    id: result.insertId,
  });
}
