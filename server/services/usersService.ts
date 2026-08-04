import bcrypt from 'bcryptjs';
import { RowDataPacket } from 'mysql2';
import { query, queryOne, execute } from '../config/database';
import { ConflictError, NotFoundError, AppError } from '../utils/errors';
import { ROLES } from '../config/permissions';
import { normalizePhone } from '../helpers/generators';

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
}

const ASSIGNABLE_ROLES = new Set([ROLES.ADMIN, ROLES.STAFF]);

export async function listUsers() {
  return query<UserRow[]>(
    `SELECT id, name, email, phone, role, is_active, last_login_at, created_at
     FROM users WHERE deleted_at IS NULL ORDER BY
       FIELD(role, 'super_admin', 'admin', 'staff'), name`
  );
}

export async function createUser(data: {
  name: string;
  email: string;
  phone?: string | null;
  password: string;
  role: string;
}) {
  const role = data.role || ROLES.STAFF;
  if (!ASSIGNABLE_ROLES.has(role as typeof ROLES.ADMIN)) {
    throw new AppError('Invalid role. Choose admin or staff.', 400);
  }

  const email = data.email.toLowerCase().trim();
  const dup = await queryOne<UserRow>(
    `SELECT id FROM users WHERE email = :email AND deleted_at IS NULL`,
    { email }
  );
  if (dup) throw new ConflictError('A user with this email already exists');

  const hash = await bcrypt.hash(data.password, 12);
  const phone = data.phone ? normalizePhone(String(data.phone)) : null;

  const result = await execute(
    `INSERT INTO users (name, email, phone, password_hash, role, is_active)
     VALUES (:name, :email, :phone, :hash, :role, 1)`,
    {
      name: data.name.trim(),
      email,
      phone,
      hash,
      role,
    }
  );

  return queryOne<UserRow>(
    `SELECT id, name, email, phone, role, is_active, last_login_at, created_at
     FROM users WHERE id = :id`,
    { id: result.insertId }
  );
}

/** @deprecated use createUser — kept for compatibility */
export async function createStaff(data: {
  name: string;
  email: string;
  phone?: string | null;
  password: string;
}) {
  return createUser({ ...data, role: ROLES.STAFF });
}

export async function updateRole(id: number, role: string) {
  if (!ASSIGNABLE_ROLES.has(role as typeof ROLES.ADMIN)) {
    throw new AppError('Invalid role. Choose admin or staff.', 400);
  }

  const user = await queryOne<UserRow>(
    `SELECT id, role FROM users WHERE id = :id AND deleted_at IS NULL`,
    { id }
  );
  if (!user) throw new NotFoundError('User');
  if (user.role === ROLES.SUPER_ADMIN) {
    throw new AppError('Cannot change super admin role', 400);
  }

  await execute(`UPDATE users SET role = :role WHERE id = :id`, { role, id });

  return queryOne<UserRow>(
    `SELECT id, name, email, phone, role, is_active, last_login_at, created_at
     FROM users WHERE id = :id`,
    { id }
  );
}

export async function setActive(id: number, isActive: boolean) {
  const user = await queryOne<UserRow>(
    `SELECT id, role FROM users WHERE id = :id AND deleted_at IS NULL`,
    { id }
  );
  if (!user) throw new NotFoundError('User');
  if (user.role === ROLES.SUPER_ADMIN) {
    throw new AppError('Cannot deactivate super admin', 400);
  }

  await execute(`UPDATE users SET is_active = :active WHERE id = :id`, {
    active: isActive ? 1 : 0,
    id,
  });

  return queryOne<UserRow>(
    `SELECT id, name, email, phone, role, is_active, last_login_at, created_at
     FROM users WHERE id = :id`,
    { id }
  );
}

/** Ensure a demo staff account exists for local testing */
export async function ensureDefaultStaff() {
  const email = 'staff@komalsmakeovers.com';
  const existing = await queryOne<UserRow>(
    `SELECT id FROM users WHERE email = :email AND deleted_at IS NULL`,
    { email }
  );
  const hash = await bcrypt.hash('Staff@123', 12);

  if (!existing) {
    await execute(
      `INSERT INTO users (name, email, phone, password_hash, role, is_active)
       VALUES ('Staff Member', :email, '9876500011', :hash, 'staff', 1)`,
      { email, hash }
    );
  }
}
