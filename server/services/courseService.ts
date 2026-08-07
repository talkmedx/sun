import { RowDataPacket } from 'mysql2';
import { query, queryOne, execute } from '../config/database';
import { NotFoundError, ConflictError } from '../utils/errors';
import { likePattern } from '../helpers/queryHelpers';

async function ensureTable() {
  await execute(`
    CREATE TABLE IF NOT EXISTS courses (
      id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name            VARCHAR(200)    NOT NULL,
      duration_days   INT UNSIGNED    NOT NULL DEFAULT 90,
      default_fee     DECIMAL(12,2)   NULL,
      description     TEXT            NULL,
      is_active       TINYINT(1)      NOT NULL DEFAULT 1,
      created_by      BIGINT UNSIGNED NULL,
      created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at      DATETIME        NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_courses_name (name),
      KEY idx_courses_active (is_active),
      KEY idx_courses_deleted (deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const count = await queryOne<RowDataPacket>(`SELECT COUNT(*) as total FROM courses WHERE deleted_at IS NULL`);
  if (count && count.total === 0) {
    const defaultCourses = [
      { name: 'Nail Art', duration_days: 60, default_fee: 25000, description: 'Complete Nail Art & Extensions Training' },
      { name: 'Hair Styling', duration_days: 75, default_fee: 35000, description: 'Professional Hair Styling & Treatments' },
      { name: 'Professional Makeup', duration_days: 90, default_fee: 55000, description: 'Masterclass in HD & Airbrush Makeup' },
      { name: 'Bridal Makeup', duration_days: 90, default_fee: 45000, description: 'Advanced Bridal Artistry & Styling' },
      { name: 'Cosmetology', duration_days: 180, default_fee: 85000, description: 'Comprehensive Beauty & Skincare Science' },
      { name: 'Personal Grooming', duration_days: 30, default_fee: 15000, description: 'Self Grooming & Everyday Makeup' },
    ];
    for (const c of defaultCourses) {
      await execute(
        `INSERT INTO courses (name, duration_days, default_fee, description) VALUES (:name, :duration_days, :default_fee, :description) ON DUPLICATE KEY UPDATE name=name`,
        c
      );
    }
  }
}

export async function listCourses(search?: string) {
  await ensureTable();
  const conditions = ['deleted_at IS NULL'];
  const params: Record<string, unknown> = {};

  if (search) {
    conditions.push('(name LIKE :search OR description LIKE :search)');
    params.search = likePattern(search);
  }

  return query<RowDataPacket[]>(
    `SELECT * FROM courses WHERE ${conditions.join(' AND ')} ORDER BY name ASC`,
    params
  );
}

export async function getCourse(id: number) {
  await ensureTable();
  const c = await queryOne<RowDataPacket>(`SELECT * FROM courses WHERE id = :id AND deleted_at IS NULL`, { id });
  if (!c) throw new NotFoundError('Course');
  return c;
}

export async function createCourse(data: {
  name: string;
  duration_days: number;
  default_fee?: number;
  description?: string;
  created_by?: number;
}) {
  await ensureTable();
  const existing = await queryOne<RowDataPacket>(`SELECT id FROM courses WHERE name = :name AND deleted_at IS NULL`, {
    name: data.name,
  });
  if (existing) throw new ConflictError('Course with this name already exists');

  const res = await execute(
    `INSERT INTO courses (name, duration_days, default_fee, description, created_by)
     VALUES (:name, :duration_days, :default_fee, :description, :created_by)`,
    {
      name: data.name,
      duration_days: Number(data.duration_days) || 90,
      default_fee: data.default_fee ? Number(data.default_fee) : null,
      description: data.description || null,
      created_by: data.created_by || null,
    }
  );

  return getCourse(res.insertId);
}

export async function updateCourse(
  id: number,
  data: {
    name?: string;
    duration_days?: number;
    default_fee?: number;
    description?: string;
    is_active?: number;
  }
) {
  await ensureTable();
  await getCourse(id);

  if (data.name) {
    const existing = await queryOne<RowDataPacket>(
      `SELECT id FROM courses WHERE name = :name AND id != :id AND deleted_at IS NULL`,
      { name: data.name, id }
    );
    if (existing) throw new ConflictError('Another course with this name already exists');
  }

  const updates: string[] = [];
  const params: Record<string, unknown> = { id };

  if (data.name !== undefined) {
    updates.push('name = :name');
    params.name = data.name;
  }
  if (data.duration_days !== undefined) {
    updates.push('duration_days = :duration_days');
    params.duration_days = Number(data.duration_days);
  }
  if (data.default_fee !== undefined) {
    updates.push('default_fee = :default_fee');
    params.default_fee = data.default_fee ? Number(data.default_fee) : null;
  }
  if (data.description !== undefined) {
    updates.push('description = :description');
    params.description = data.description || null;
  }
  if (data.is_active !== undefined) {
    updates.push('is_active = :is_active');
    params.is_active = Number(data.is_active);
  }

  if (updates.length > 0) {
    await execute(`UPDATE courses SET ${updates.join(', ')} WHERE id = :id`, params);
  }

  return getCourse(id);
}

export async function deleteCourse(id: number) {
  await ensureTable();
  await getCourse(id);
  await execute(`UPDATE courses SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id`, { id });
  return { success: true };
}
