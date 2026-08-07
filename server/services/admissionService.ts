import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { query, queryOne, execute, withTransaction } from '../config/database';
import { NotFoundError, AppError } from '../utils/errors';
import { paginate, likePattern } from '../helpers/queryHelpers';
import { generateToken, normalizePhone, generateStudentCode } from '../helpers/generators';
import * as notificationService from './notificationService';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export async function listAdmissions(params: ListParams) {
  const { page, limit, offset } = paginate(params.page, params.limit);
  const conditions = ['a.deleted_at IS NULL'];
  const q: Record<string, unknown> = {};

  if (params.search) {
    conditions.push('(a.first_name LIKE :search OR a.last_name LIKE :search OR a.phone LIKE :search OR a.city LIKE :search OR b.name LIKE :search)');
    q.search = likePattern(params.search);
  }
  if (params.status) {
    conditions.push('a.status = :status');
    q.status = params.status;
  }

  const where = conditions.join(' AND ');
  const countRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM admissions a LEFT JOIN batches b ON b.id = a.batch_id WHERE ${where}`,
    q
  );

  const rows = await query<RowDataPacket[]>(
    `SELECT a.*, b.name AS batch_name
     FROM admissions a
     LEFT JOIN batches b ON b.id = a.batch_id
     WHERE ${where}
     ORDER BY a.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    q
  );

  const total = Number(countRow?.total ?? 0);
  return { rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getAdmission(id: number) {
  const row = await queryOne<RowDataPacket>(
    `SELECT a.*,
            b.name AS batch_name,
            b.start_date AS batch_start_date,
            b.end_date AS batch_end_date,
            b.course_fee AS batch_course_fee,
            b.offer_fee AS batch_offer_fee,
            COALESCE(s.fees_committed, b.offer_fee, b.course_fee, 0) AS fees_committed,
            COALESCE(s.fees_paid, 0) AS fees_collected,
            s.student_code,
            s.id AS student_id
     FROM admissions a
     LEFT JOIN batches b ON b.id = a.batch_id
     LEFT JOIN students s ON (s.admission_id = a.id OR (s.phone = a.phone AND s.batch_id = a.batch_id AND s.deleted_at IS NULL))
     WHERE a.id = :id AND a.deleted_at IS NULL`,
    { id }
  );
  if (!row) throw new NotFoundError('Admission');
  return row;
}

export async function submitAdmission(
  data: Record<string, unknown>,
  photoUrl?: string,
  proofUrl?: string
) {
  const phone = normalizePhone(String(data.phone));

  const result = await execute(
    `INSERT INTO admissions
      (first_name, last_name, email, phone, date_of_birth, gender,
       address_line1, address_line2, city, state, pincode,
       photo_url, proof_url, batch_id, preferred_batch_note, status)
     VALUES
      (:first_name, :last_name, :email, :phone, :date_of_birth, :gender,
       :address_line1, :address_line2, :city, :state, :pincode,
       :photoUrl, :proofUrl, :batch_id, :preferred_batch_note, 'pending')`,
    {
      first_name: data.first_name,
      last_name: data.last_name || null,
      email: data.email || null,
      phone,
      date_of_birth: data.date_of_birth || null,
      gender: data.gender || null,
      address_line1: data.address_line1 || null,
      address_line2: data.address_line2 || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      photoUrl: photoUrl || null,
      proofUrl: proofUrl || null,
      batch_id: data.batch_id || null,
      preferred_batch_note: data.preferred_batch_note || null,
    }
  );

  await notificationService.create({
    title: 'New Admission Application',
    message: `${data.first_name} ${data.last_name || ''} submitted an admission form`,
    type: 'admission',
    link: `/admissions/${result.insertId}`,
  });

  return getAdmission(result.insertId);
}

export async function approveAdmission(id: number, userId: number) {
  return withTransaction(async (conn) => {
    const [admissions] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM admissions WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
      [id]
    );
    const admission = admissions[0];
    if (!admission) throw new NotFoundError('Admission');
    if (admission.status === 'approved') throw new AppError('Already approved', 400);

    // Determine fees from batch
    let feesCommitted = 0;
    if (admission.batch_id) {
      const [batches] = await conn.execute<RowDataPacket[]>(
        `SELECT course_fee, offer_fee FROM batches WHERE id = ?`,
        [admission.batch_id]
      );
      if (batches[0]) {
        feesCommitted = Number(batches[0].offer_fee ?? batches[0].course_fee);
      }
    }

    const [seqRows] = await conn.execute<RowDataPacket[]>(
      `SELECT COUNT(*) + 1 AS seq FROM students`
    );
    const code = generateStudentCode(Number(seqRows[0]?.seq ?? 1));

    const [studentResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO students
        (student_code, first_name, last_name, email, phone, date_of_birth, gender,
         address_line1, address_line2, city, state, pincode, photo_url,
         batch_id, admission_id, fees_committed, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        code,
        admission.first_name,
        admission.last_name,
        admission.email,
        admission.phone,
        admission.date_of_birth,
        admission.gender,
        admission.address_line1,
        admission.address_line2,
        admission.city,
        admission.state,
        admission.pincode,
        admission.photo_url,
        admission.batch_id,
        id,
        feesCommitted,
        userId,
      ]
    );

    await conn.execute(
      `UPDATE admissions
       SET status = 'approved', student_id = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [studentResult.insertId, userId, id]
    );

    // Copy proof as document if present
    if (admission.proof_url) {
      await conn.execute(
        `INSERT INTO documents (entity_type, entity_id, title, file_url, uploaded_by)
         VALUES ('student', ?, 'Admission Proof', ?, ?)`,
        [studentResult.insertId, admission.proof_url, userId]
      );
    }

    return { studentId: studentResult.insertId, admissionId: id };
  });
}

export async function rejectAdmission(id: number, reason: string, userId: number) {
  const admission = await getAdmission(id);
  if (admission.status === 'approved') throw new AppError('Cannot reject approved admission', 400);

  await execute(
    `UPDATE admissions
     SET status = 'rejected', rejection_reason = :reason, reviewed_by = :userId, reviewed_at = NOW()
     WHERE id = :id`,
    { reason, userId, id }
  );
  return getAdmission(id);
}

export async function generateEditLink(id: number) {
  const admission = await getAdmission(id);
  if (admission.status === 'approved') {
    throw new AppError('Cannot generate edit link for approved admission', 400);
  }

  const token = generateToken(32);
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  await execute(
    `UPDATE admissions
     SET edit_token = :token, edit_token_expires = :expires, status = 'edit_requested'
     WHERE id = :id`,
    {
      token,
      expires: expires.toISOString().slice(0, 19).replace('T', ' '),
      id,
    }
  );

  return {
    editToken: token,
    expiresAt: expires.toISOString(),
    editUrl: `/admission/edit/${token}`,
  };
}

export async function getByEditToken(token: string) {
  const row = await queryOne<RowDataPacket>(
    `SELECT a.*, b.name AS batch_name FROM admissions a
     LEFT JOIN batches b ON b.id = a.batch_id
     WHERE a.edit_token = :token
       AND a.edit_token_expires > NOW()
       AND a.deleted_at IS NULL`,
    { token }
  );
  if (!row) throw new AppError('Invalid or expired edit link', 400);
  return row;
}

export async function updateByEditToken(
  token: string,
  data: Record<string, unknown>,
  photoUrl?: string,
  proofUrl?: string
) {
  const admission = await getByEditToken(token);

  const fields = [
    'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender',
    'address_line1', 'address_line2', 'city', 'state', 'pincode',
    'batch_id', 'preferred_batch_note',
  ];
  const sets: string[] = ["status = 'pending'", 'edit_token = NULL', 'edit_token_expires = NULL'];
  const params: Record<string, unknown> = { id: admission.id };

  for (const f of fields) {
    if (data[f] !== undefined) {
      sets.push(`${f} = :${f}`);
      params[f] = f === 'phone' ? normalizePhone(String(data[f])) : data[f] === '' ? null : data[f];
    }
  }
  if (photoUrl) {
    sets.push('photo_url = :photoUrl');
    params.photoUrl = photoUrl;
  }
  if (proofUrl) {
    sets.push('proof_url = :proofUrl');
    params.proofUrl = proofUrl;
  }

  await execute(`UPDATE admissions SET ${sets.join(', ')} WHERE id = :id`, params);

  await notificationService.create({
    title: 'Admission Updated',
    message: `${admission.first_name} updated their admission form`,
    type: 'admission',
    link: `/admissions/${admission.id}`,
  });

  return getAdmission(admission.id as number);
}
