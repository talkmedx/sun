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
            (s.fees_committed - s.fees_paid) AS pending_fees,
            (SELECT COALESCE(SUM(e.amount), 0)
             FROM expenses e
             WHERE e.deleted_at IS NULL AND (e.description LIKE CONCAT('%', s.student_code, '%') OR e.title LIKE CONCAT('%', s.student_code, '%') OR e.title LIKE CONCAT('%', s.first_name, '%'))) AS expense_amount
     FROM students s
     LEFT JOIN batches b ON b.id = s.batch_id
     WHERE s.id = :id AND s.deleted_at IS NULL`,
    { id }
  );
  if (!student) throw new NotFoundError('Student');
  return student;
}

let columnsEnsured = false;
async function ensureStudentColumns() {
  if (columnsEnsured) return;
  const cols = [
    'ALTER TABLE students ADD COLUMN age INT NULL',
    'ALTER TABLE students ADD COLUMN designation VARCHAR(100) NULL',
    'ALTER TABLE students ADD COLUMN admission_date DATE NULL',
  ];
  for (const sql of cols) {
    try {
      await execute(sql);
    } catch {
      // Column already exists
    }
  }
  columnsEnsured = true;
}

export async function createStudent(data: Record<string, unknown>, userId: number) {
  await ensureStudentColumns();
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
       address_line1, address_line2, city, state, pincode, batch_id, fees_committed, status, notes,
       age, designation, admission_date, created_by)
     VALUES
      (:code, :first_name, :last_name, :email, :phone, :alternate_phone, :date_of_birth, :gender,
       :address_line1, :address_line2, :city, :state, :pincode, :batch_id, :fees_committed, :status, :notes,
       :age, :designation, :admission_date, :created_by)`,
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
      age: data.age != null && data.age !== '' ? Number(data.age) : null,
      designation: data.designation || null,
      admission_date: data.admission_date || null,
      created_by: userId,
    }
  );

  return getStudent(result.insertId);
}

export async function updateStudent(id: number, data: Record<string, unknown>) {
  await ensureStudentColumns();
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
    'fees_committed', 'status', 'notes', 'age', 'designation', 'admission_date',
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

    if (data.mark_as_expense === true || data.mark_as_expense === 'true' || data.mark_as_expense === '1') {
      const vendorId = data.vendor_id && data.vendor_id !== 'none' ? Number(data.vendor_id) : null;
      const title = `Student Fee Expense: ${student.first_name} ${student.last_name || ''}`.trim();
      const description = `Fee collection marked as expense for ${student.first_name} ${student.last_name || ''} (${student.student_code}). ${data.notes || ''}`.trim();
      await conn.execute(
        `INSERT INTO expenses
          (title, description, amount, category, batch_id, vendor_id, expense_date, payment_mode, screenshot_url, financial_year, recorded_by)
         VALUES (?, ?, ?, 'Student Fee Expense', ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          description,
          amount,
          student.batch_id || null,
          vendorId,
          data.payment_date,
          data.payment_mode || 'cash',
          screenshotUrl || null,
          fy,
          userId,
        ]
      );
    }

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
    `SELECT sp.*, p.name AS product_name, p.sku, v.name AS vendor_name
     FROM student_products sp
     JOIN products p ON p.id = sp.product_id
     LEFT JOIN vendors v ON v.id = p.vendor_id
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

export async function updateDocument(
  studentId: number,
  docId: number,
  title?: string,
  fileUrl?: string,
  fileType?: string,
  fileSize?: number
) {
  await getStudent(studentId);
  const sets: string[] = [];
  const params: Record<string, unknown> = { docId, studentId };

  if (title) {
    sets.push('title = :title');
    params.title = title;
  }
  if (fileUrl) {
    sets.push('file_url = :fileUrl');
    params.fileUrl = fileUrl;
  }
  if (fileType) {
    sets.push('file_type = :fileType');
    params.fileType = fileType;
  }
  if (fileSize) {
    sets.push('file_size = :fileSize');
    params.fileSize = fileSize;
  }

  if (sets.length > 0) {
    await execute(
      `UPDATE documents SET ${sets.join(', ')} WHERE id = :docId AND entity_type = 'student' AND entity_id = :studentId`,
      params
    );
  }

  return queryOne<RowDataPacket>(`SELECT * FROM documents WHERE id = :docId`, { docId });
}

export async function deleteDocument(studentId: number, docId: number) {
  await getStudent(studentId);
  await execute(
    `UPDATE documents SET deleted_at = NOW() WHERE id = :docId AND entity_type = 'student' AND entity_id = :studentId`,
    { docId, studentId }
  );
}

export async function updateFee(
  studentId: number,
  feeId: number,
  data: Record<string, unknown>,
  screenshotUrl?: string
) {
  return withTransaction(async (conn) => {
    const [fees] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM fee_transactions WHERE id = ? AND student_id = ? AND deleted_at IS NULL FOR UPDATE`,
      [feeId, studentId]
    );
    const fee = fees[0];
    if (!fee) throw new NotFoundError('Fee transaction');

    const oldAmount = Number(fee.amount);
    const newAmount = data.amount !== undefined ? Number(data.amount) : oldAmount;
    const diff = newAmount - oldAmount;

    const paymentDate = String(data.payment_date || fee.payment_date);
    const fy = getFinancialYear(new Date(paymentDate));

    await conn.execute(
      `UPDATE fee_transactions
       SET amount = ?,
           payment_mode = ?,
           payment_date = ?,
           screenshot_url = COALESCE(?, screenshot_url),
           reference_no = ?,
           notes = ?,
           financial_year = ?
       WHERE id = ? AND student_id = ?`,
      [
        newAmount,
        data.payment_mode || fee.payment_mode,
        paymentDate,
        screenshotUrl || null,
        data.reference_no !== undefined ? (data.reference_no || null) : fee.reference_no,
        data.notes !== undefined ? (data.notes || null) : fee.notes,
        fy,
        feeId,
        studentId,
      ]
    );

    if (diff !== 0) {
      await conn.execute(
        `UPDATE students SET fees_paid = fees_paid + ? WHERE id = ?`,
        [diff, studentId]
      );
    }

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM fee_transactions WHERE id = ?`,
      [feeId]
    );
    return rows[0];
  });
}

export async function deleteFee(studentId: number, feeId: number) {
  return withTransaction(async (conn) => {
    const [fees] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM fee_transactions WHERE id = ? AND student_id = ? AND deleted_at IS NULL FOR UPDATE`,
      [feeId, studentId]
    );
    const fee = fees[0];
    if (!fee) throw new NotFoundError('Fee transaction');

    const amount = Number(fee.amount);

    await conn.execute(
      `UPDATE fee_transactions SET deleted_at = NOW() WHERE id = ?`,
      [feeId]
    );

    await conn.execute(
      `UPDATE students SET fees_paid = GREATEST(0, fees_paid - ?) WHERE id = ?`,
      [amount, studentId]
    );
  });
}

export async function updateStudentProduct(
  studentId: number,
  spId: number,
  data: Record<string, unknown>
) {
  return withTransaction(async (conn) => {
    const [sps] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM student_products WHERE id = ? AND student_id = ? AND deleted_at IS NULL FOR UPDATE`,
      [spId, studentId]
    );
    const sp = sps[0];
    if (!sp) throw new NotFoundError('Student product purchase');

    const oldQty = Number(sp.quantity);
    const newQty = data.quantity !== undefined ? Number(data.quantity) : oldQty;
    const qtyDiff = newQty - oldQty;

    if (qtyDiff !== 0) {
      const [products] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM products WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
        [sp.product_id]
      );
      const product = products[0];
      if (!product) throw new NotFoundError('Product');

      if (qtyDiff > 0 && product.quantity_available < qtyDiff) {
        throw new AppError('Insufficient stock to increase quantity', 400);
      }

      await conn.execute(
        `UPDATE products
         SET quantity_available = quantity_available - ?,
             quantity_sold = quantity_sold + ?
         WHERE id = ?`,
        [qtyDiff, qtyDiff, sp.product_id]
      );
    }

    const unitSell = Number(sp.unit_selling_price);
    const total = unitSell * newQty;

    await conn.execute(
      `UPDATE student_products
       SET quantity = ?,
           total_amount = ?,
           purchase_date = ?,
           payment_mode = ?,
           notes = ?
       WHERE id = ? AND student_id = ?`,
      [
        newQty,
        total,
        data.purchase_date || sp.purchase_date,
        data.payment_mode || sp.payment_mode,
        data.notes !== undefined ? (data.notes || null) : sp.notes,
        spId,
        studentId,
      ]
    );

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT sp.*, p.name AS product_name FROM student_products sp
       JOIN products p ON p.id = sp.product_id WHERE sp.id = ?`,
      [spId]
    );
    return rows[0];
  });
}

export async function deleteStudentProduct(studentId: number, spId: number) {
  return withTransaction(async (conn) => {
    const [sps] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM student_products WHERE id = ? AND student_id = ? AND deleted_at IS NULL FOR UPDATE`,
      [spId, studentId]
    );
    const sp = sps[0];
    if (!sp) throw new NotFoundError('Student product purchase');

    const qty = Number(sp.quantity);

    await conn.execute(
      `UPDATE student_products SET deleted_at = NOW() WHERE id = ?`,
      [spId]
    );

    await conn.execute(
      `UPDATE products
       SET quantity_available = quantity_available + ?,
           quantity_sold = GREATEST(0, quantity_sold - ?)
       WHERE id = ?`,
      [qty, qty, sp.product_id]
    );
  });
}
