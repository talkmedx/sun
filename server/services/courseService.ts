import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { query, queryOne, execute, withTransaction } from '../config/database';
import { NotFoundError, ConflictError } from '../utils/errors';
import { likePattern } from '../helpers/queryHelpers';

let ensureTablePromise: Promise<void> | null = null;

async function ensureFeeHistoryTable() {
  await execute(`
    CREATE TABLE IF NOT EXISTS course_fee_history (
      id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      course_id       BIGINT UNSIGNED NOT NULL,
      default_fee     DECIMAL(12,2)   NOT NULL,
      effective_from  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      effective_to    DATETIME        NULL COMMENT 'NULL = current fee',
      changed_by      BIGINT UNSIGNED NULL,
      change_reason   VARCHAR(255)    NULL,
      created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at      DATETIME        NULL,
      PRIMARY KEY (id),
      KEY idx_cfh_course (course_id),
      KEY idx_cfh_effective (course_id, effective_from, effective_to),
      CONSTRAINT fk_cfh_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Backfill history for existing courses missing a row
  const courses = await query<RowDataPacket[]>(
    `SELECT c.id, c.default_fee, c.created_at
     FROM courses c
     WHERE c.deleted_at IS NULL
       AND c.default_fee IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM course_fee_history h
         WHERE h.course_id = c.id AND h.deleted_at IS NULL
       )`
  );
  for (const c of courses) {
    await execute(
      `INSERT INTO course_fee_history
        (course_id, default_fee, effective_from, effective_to, change_reason)
       VALUES (:course_id, :default_fee, :effective_from, NULL, 'Initial fee')`,
      {
        course_id: c.id,
        default_fee: c.default_fee,
        effective_from: c.created_at,
      }
    );
  }
}

async function ensureTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      try {
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
        if (count && Number(count.total) === 0) {
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

        await ensureFeeHistoryTable();
      } catch (err) {
        ensureTablePromise = null;
        throw err;
      }
    })();
  }
  return ensureTablePromise;
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

  return withTransaction(async (conn) => {
    const [existing] = await conn.execute<RowDataPacket[]>(
      `SELECT id FROM courses WHERE name = ? AND deleted_at IS NULL`,
      [data.name]
    );
    if (existing[0]) throw new ConflictError('Course with this name already exists');

    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO courses (name, duration_days, default_fee, description, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.name,
        Number(data.duration_days) || 90,
        data.default_fee != null ? Number(data.default_fee) : null,
        data.description || null,
        data.created_by || null,
      ]
    );

    const courseId = result.insertId;

    if (data.default_fee != null) {
      await conn.execute(
        `INSERT INTO course_fee_history
          (course_id, default_fee, effective_from, effective_to, changed_by, change_reason)
         VALUES (?, ?, NOW(), NULL, ?, 'Initial fee')`,
        [courseId, Number(data.default_fee), data.created_by || null]
      );
    }

    const [rows] = await conn.execute<RowDataPacket[]>(`SELECT * FROM courses WHERE id = ?`, [courseId]);
    return rows[0];
  });
}

export async function updateCourse(
  id: number,
  data: {
    name?: string;
    duration_days?: number;
    default_fee?: number | null;
    description?: string;
    is_active?: number;
    change_reason?: string;
  },
  userId?: number
) {
  await ensureTable();
  const course = await getCourse(id);

  if (data.name) {
    const existing = await queryOne<RowDataPacket>(
      `SELECT id FROM courses WHERE name = :name AND id != :id AND deleted_at IS NULL`,
      { name: data.name, id }
    );
    if (existing) throw new ConflictError('Another course with this name already exists');
  }

  return withTransaction(async (conn) => {
    const feeChanged =
      data.default_fee !== undefined &&
      Number(data.default_fee ?? 0) !== Number(course.default_fee ?? 0);

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.duration_days !== undefined) {
      updates.push('duration_days = ?');
      params.push(Number(data.duration_days));
    }
    if (data.default_fee !== undefined) {
      updates.push('default_fee = ?');
      params.push(data.default_fee != null ? Number(data.default_fee) : null);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description || null);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(Number(data.is_active));
    }

    if (updates.length) {
      params.push(id);
      await conn.execute(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    if (feeChanged && data.default_fee != null) {
      await conn.execute(
        `UPDATE course_fee_history
         SET effective_to = NOW()
         WHERE course_id = ? AND effective_to IS NULL AND deleted_at IS NULL`,
        [id]
      );

      await conn.execute(
        `INSERT INTO course_fee_history
          (course_id, default_fee, effective_from, effective_to, changed_by, change_reason)
         VALUES (?, ?, NOW(), NULL, ?, ?)`,
        [
          id,
          Number(data.default_fee),
          userId || null,
          data.change_reason || 'Fee update',
        ]
      );
    }

    const [rows] = await conn.execute<RowDataPacket[]>(`SELECT * FROM courses WHERE id = ?`, [id]);
    return rows[0];
  });
}

export async function getFeeHistory(courseId: number) {
  await ensureTable();
  await getCourse(courseId);
  return query<RowDataPacket[]>(
    `SELECT h.*, u.name AS changed_by_name
     FROM course_fee_history h
     LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.course_id = :courseId AND h.deleted_at IS NULL
     ORDER BY h.effective_from DESC, h.id DESC`,
    { courseId }
  );
}

export async function deleteCourse(id: number) {
  await ensureTable();
  await getCourse(id);
  await execute(`UPDATE courses SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id`, { id });
  return { success: true };
}
