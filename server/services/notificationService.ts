import { RowDataPacket } from 'mysql2';
import { query, queryOne, execute } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { paginate } from '../helpers/queryHelpers';

interface CreateNotification {
  user_id?: number | null;
  title: string;
  message: string;
  type?: string;
  link?: string;
  meta_json?: unknown;
}

export async function create(data: CreateNotification) {
  const result = await execute(
    `INSERT INTO notifications (user_id, title, message, type, link, meta_json)
     VALUES (:user_id, :title, :message, :type, :link, :meta_json)`,
    {
      user_id: data.user_id ?? null,
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      link: data.link || null,
      meta_json: data.meta_json ? JSON.stringify(data.meta_json) : null,
    }
  );
  return queryOne<RowDataPacket>(`SELECT * FROM notifications WHERE id = :id`, {
    id: result.insertId,
  });
}

export async function list(userId: number, page = 1, limit = 20) {
  const p = paginate(page, limit);

  const countRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM notifications
     WHERE deleted_at IS NULL AND (user_id IS NULL OR user_id = :userId)`,
    { userId }
  );

  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM notifications
     WHERE deleted_at IS NULL AND (user_id IS NULL OR user_id = :userId)
     ORDER BY created_at DESC
     LIMIT ${p.limit} OFFSET ${p.offset}`,
    { userId }
  );

  const unread = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS count FROM notifications
     WHERE deleted_at IS NULL AND is_read = 0 AND (user_id IS NULL OR user_id = :userId)`,
    { userId }
  );

  const total = Number(countRow?.total ?? 0);
  return {
    rows,
    unreadCount: Number(unread?.count ?? 0),
    meta: { page: p.page, limit: p.limit, total, totalPages: Math.ceil(total / p.limit) || 1 },
  };
}

export async function markRead(id: number, userId: number) {
  const row = await queryOne<RowDataPacket>(
    `SELECT * FROM notifications
     WHERE id = :id AND deleted_at IS NULL AND (user_id IS NULL OR user_id = :userId)`,
    { id, userId }
  );
  if (!row) throw new NotFoundError('Notification');

  await execute(
    `UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = :id`,
    { id }
  );
  return queryOne<RowDataPacket>(`SELECT * FROM notifications WHERE id = :id`, { id });
}

export async function markAllRead(userId: number) {
  await execute(
    `UPDATE notifications SET is_read = 1, read_at = NOW()
     WHERE deleted_at IS NULL AND is_read = 0 AND (user_id IS NULL OR user_id = :userId)`,
    { userId }
  );
}

export async function remove(id: number, userId: number) {
  await execute(
    `UPDATE notifications SET deleted_at = NOW()
     WHERE id = :id AND (user_id IS NULL OR user_id = :userId)`,
    { id, userId }
  );
}
