import { RowDataPacket } from 'mysql2';
import { query, queryOne, execute } from '../config/database';
import { NotFoundError, ConflictError, AppError } from '../utils/errors';
import { paginate, likePattern } from '../helpers/queryHelpers';

export async function listBatches(search?: string, status?: string) {
  const conditions = ['b.deleted_at IS NULL'];
  const params: Record<string, unknown> = {};

  if (search) {
    conditions.push('b.name LIKE :search');
    params.search = likePattern(search);
  }
  if (status) {
    conditions.push('b.status = :status');
    params.status = status;
  }

  return query<RowDataPacket[]>(
    `SELECT b.*,
            (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id AND s.deleted_at IS NULL) AS student_count,
            COALESCE((SELECT batch_profit FROM vw_batch_summary v WHERE v.id = b.id), 0) AS profit
     FROM batches b
     WHERE ${conditions.join(' AND ')}
     ORDER BY b.start_date DESC, b.id DESC`,
    params
  );
}

export async function getBatch(id: number) {
  const batch = await queryOne<RowDataPacket>(
    `SELECT b.*,
            (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id AND s.deleted_at IS NULL) AS student_count
     FROM batches b WHERE b.id = :id AND b.deleted_at IS NULL`,
    { id }
  );
  if (!batch) throw new NotFoundError('Batch');

  const summary = await queryOne<RowDataPacket>(
    `SELECT * FROM vw_batch_summary WHERE id = :id`,
    { id }
  );

  return { ...batch, summary };
}

export async function createBatch(data: Record<string, unknown>, userId: number) {
  const dup = await queryOne<RowDataPacket>(
    `SELECT id FROM batches WHERE name = :name AND deleted_at IS NULL`,
    { name: data.name }
  );
  if (dup) throw new ConflictError('Batch with this name already exists');

  const result = await execute(
    `INSERT INTO batches
      (name, description, course_fee, offer_fee, start_date, end_date, status, max_students, notes, created_by)
     VALUES
      (:name, :description, :course_fee, :offer_fee, :start_date, :end_date, :status, :max_students, :notes, :created_by)`,
    {
      name: data.name,
      description: data.description || null,
      course_fee: data.course_fee,
      offer_fee: data.offer_fee ?? null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      status: data.status || 'upcoming',
      max_students: data.max_students || null,
      notes: data.notes || null,
      created_by: userId,
    }
  );

  return getBatch(result.insertId);
}

export async function updateBatch(id: number, data: Record<string, unknown>) {
  await getBatch(id);

  if (data.name) {
    const dup = await queryOne<RowDataPacket>(
      `SELECT id FROM batches WHERE name = :name AND id != :id AND deleted_at IS NULL`,
      { name: data.name, id }
    );
    if (dup) throw new ConflictError('Batch with this name already exists');
  }

  const fields = [
    'name', 'description', 'course_fee', 'offer_fee', 'start_date', 'end_date',
    'status', 'max_students', 'notes',
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
    await execute(`UPDATE batches SET ${sets.join(', ')} WHERE id = :id`, params);
  }
  return getBatch(id);
}

export async function deleteBatch(id: number) {
  await getBatch(id);

  const students = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS count FROM students WHERE batch_id = :id AND deleted_at IS NULL`,
    { id }
  );

  if (Number(students?.count) > 0) {
    throw new AppError('Cannot delete batch with existing students', 400);
  }

  await execute(`UPDATE batches SET deleted_at = NOW() WHERE id = :id`, { id });
}

export async function listBatchesDropdown() {
  return query<RowDataPacket[]>(
    `SELECT id, name, status, course_fee, offer_fee FROM batches
     WHERE deleted_at IS NULL ORDER BY name`
  );
}
