import bcrypt from 'bcryptjs';
import { RowDataPacket } from 'mysql2';
import { query, queryOne, execute } from '../config/database';
import { ConflictError, NotFoundError, AppError } from '../utils/errors';
import { ROLES } from '../config/permissions';
import { normalizePhone } from '../helpers/generators';
import { encryptPassword, decryptPassword } from '../helpers/passwordDisplay';

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  deleted_at?: string | null;
  password_encrypted?: string | null;
}

function isDuplicateEmailError(err: unknown) {
  const e = err as { code?: string; errno?: number };
  return e?.code === 'ER_DUP_ENTRY' || e?.errno === 1062;
}

const USER_COLUMNS = `id, name, email, phone, role, is_active, last_login_at, created_at, password_encrypted`;
const ASSIGNABLE_ROLES = new Set([ROLES.SUPER_ADMIN, ROLES.STAFF]);

let passwordColumnEnsured = false;
export async function ensurePasswordColumn() {
  if (passwordColumnEnsured) return;
  try {
    await execute('ALTER TABLE users ADD COLUMN password_encrypted TEXT NULL');
  } catch {
    // Column already exists
  }
  passwordColumnEnsured = true;
}

function toPublicUser(row: UserRow) {
  const { password_encrypted, ...rest } = row;
  return {
    ...rest,
    password: decryptPassword(password_encrypted),
  };
}

export async function persistPassword(id: number, plain: string) {
  await ensurePasswordColumn();
  const hash = await bcrypt.hash(plain, 12);
  const encrypted = encryptPassword(plain);
  await execute(
    `UPDATE users SET password_hash = :hash, password_encrypted = :encrypted WHERE id = :id`,
    { hash, encrypted, id }
  );
}

export async function listUsers() {
  await ensurePasswordColumn();
  const rows = await query<UserRow[]>(
    `SELECT ${USER_COLUMNS}
     FROM users WHERE deleted_at IS NULL ORDER BY
       FIELD(role, 'super_admin', 'staff'), name`
  );
  return rows.map(toPublicUser);
}

export async function createUser(data: {
  name: string;
  email: string;
  phone?: string | null;
  password: string;
  role: string;
}) {
  await ensurePasswordColumn();
  const role = data.role || ROLES.STAFF;
  if (!ASSIGNABLE_ROLES.has(role as typeof ROLES.STAFF)) {
    throw new AppError('Invalid role. Choose Super Admin or Staff Member.', 400);
  }

  const email = data.email.toLowerCase().trim();
  const existing = await queryOne<UserRow>(
    `SELECT id, deleted_at FROM users WHERE email = :email`,
    { email }
  );
  if (existing && !existing.deleted_at) {
    throw new ConflictError('A user with this email already exists');
  }

  const hash = await bcrypt.hash(data.password, 12);
  const encrypted = encryptPassword(data.password);
  const phone = data.phone ? normalizePhone(String(data.phone)) : null;
  const name = data.name.trim();

  if (existing?.deleted_at) {
    await execute(
      `UPDATE users SET
         name = :name,
         phone = :phone,
         password_hash = :hash,
         password_encrypted = :encrypted,
         role = :role,
         is_active = 1,
         deleted_at = NULL,
         refresh_token = NULL
       WHERE id = :id`,
      { name, phone, hash, encrypted, role, id: existing.id }
    );
    const restored = await queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = :id`,
      { id: existing.id }
    );
    return restored ? toPublicUser(restored) : restored;
  }

  try {
    const result = await execute(
      `INSERT INTO users (name, email, phone, password_hash, password_encrypted, role, is_active)
       VALUES (:name, :email, :phone, :hash, :encrypted, :role, 1)`,
      { name, email, phone, hash, encrypted, role }
    );

    const created = await queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = :id`,
      { id: result.insertId }
    );
    return created ? toPublicUser(created) : created;
  } catch (err) {
    if (isDuplicateEmailError(err)) {
      throw new ConflictError('A user with this email already exists');
    }
    throw err;
  }
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

export async function updateUser(
  id: number,
  data: {
    name?: string;
    email?: string;
    phone?: string | null;
    password?: string;
    role?: string;
  }
) {
  await ensurePasswordColumn();
  const user = await queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = :id AND deleted_at IS NULL`,
    { id }
  );
  if (!user) throw new NotFoundError('User');

  if (data.role && data.role !== user.role) {
    if (!ASSIGNABLE_ROLES.has(data.role as typeof ROLES.STAFF)) {
      throw new AppError('Invalid role. Choose Super Admin or Staff Member.', 400);
    }
    if (user.role === ROLES.SUPER_ADMIN && data.role !== ROLES.SUPER_ADMIN) {
      const countRow = await queryOne<RowDataPacket>(
        `SELECT COUNT(*) AS total FROM users WHERE role = :role AND deleted_at IS NULL`,
        { role: ROLES.SUPER_ADMIN }
      );
      if (Number(countRow?.total || 0) <= 1) {
        throw new AppError('Cannot change the last Super Admin role', 400);
      }
    }
  }

  if (data.email) {
    const email = data.email.toLowerCase().trim();
    const dup = await queryOne<UserRow>(
      `SELECT id FROM users WHERE email = :email AND id != :id AND deleted_at IS NULL`,
      { email, id }
    );
    if (dup) throw new ConflictError('A user with this email already exists');
  }

  const phone =
    data.phone === undefined
      ? undefined
      : data.phone
        ? normalizePhone(String(data.phone))
        : null;

  await execute(
    `UPDATE users SET
       name = COALESCE(:name, name),
       email = COALESCE(:email, email),
       phone = IF(:phoneSet = 1, :phone, phone),
       role = COALESCE(:role, role)
     WHERE id = :id`,
    {
      name: data.name?.trim() || null,
      email: data.email ? data.email.toLowerCase().trim() : null,
      phoneSet: data.phone !== undefined ? 1 : 0,
      phone: phone ?? null,
      role: data.role || null,
      id,
    }
  );

  if (data.password) {
    await persistPassword(id, data.password);
  }

  const updated = await queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = :id`,
    { id }
  );
  return updated ? toPublicUser(updated) : updated;
}

export async function updateRole(id: number, role: string) {
  return updateUser(id, { role });
}

export async function setActive(id: number, isActive: boolean) {
  const user = await queryOne<UserRow>(
    `SELECT id, role FROM users WHERE id = :id AND deleted_at IS NULL`,
    { id }
  );
  if (!user) throw new NotFoundError('User');
  if (user.role === ROLES.SUPER_ADMIN) {
    throw new AppError('Cannot deactivate Super Admin', 400);
  }

  await execute(`UPDATE users SET is_active = :active WHERE id = :id`, {
    active: isActive ? 1 : 0,
    id,
  });

  await ensurePasswordColumn();
  const updated = await queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = :id`,
    { id }
  );
  return updated ? toPublicUser(updated) : updated;
}

export async function deleteUser(id: number, actorId: number) {
  if (id === actorId) {
    throw new AppError('Cannot delete your own account', 400);
  }

  const user = await queryOne<UserRow>(
    `SELECT id, role FROM users WHERE id = :id AND deleted_at IS NULL`,
    { id }
  );
  if (!user) throw new NotFoundError('User');

  if (user.role === ROLES.SUPER_ADMIN) {
    const countRow = await queryOne<RowDataPacket>(
      `SELECT COUNT(*) AS total FROM users WHERE role = :role AND deleted_at IS NULL`,
      { role: ROLES.SUPER_ADMIN }
    );
    if (Number(countRow?.total || 0) <= 1) {
      throw new AppError('Cannot delete the last Super Admin', 400);
    }
  }

  await execute(`UPDATE users SET deleted_at = NOW(), refresh_token = NULL WHERE id = :id`, { id });
}

/** Ensure a demo staff account exists for local testing */
export async function ensureDefaultStaff() {
  await ensurePasswordColumn();
  const email = 'staff@komalsmakeovers.com';
  const existing = await queryOne<UserRow>(
    `SELECT id FROM users WHERE email = :email AND deleted_at IS NULL`,
    { email }
  );
  const plain = 'Staff@123';
  const hash = await bcrypt.hash(plain, 12);
  const encrypted = encryptPassword(plain);

  if (!existing) {
    await execute(
      `INSERT INTO users (name, email, phone, password_hash, password_encrypted, role, is_active)
       VALUES ('Staff Member', :email, '9876500011', :hash, :encrypted, 'staff', 1)`,
      { email, hash, encrypted }
    );
  } else {
    await execute(
      `UPDATE users SET password_hash = :hash, password_encrypted = :encrypted WHERE id = :id`,
      { hash, encrypted, id: existing.id }
    );
  }
}
