import bcrypt from 'bcryptjs';
import { RowDataPacket } from 'mysql2';
import { query, queryOne, execute } from '../config/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { generateToken } from '../helpers/generators';

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  role: string;
  avatar_url: string | null;
  is_active: number;
  refresh_token: string | null;
  reset_token: string | null;
  reset_token_expires: string | null;
}

export async function login(email: string, password: string) {
  const user = await queryOne<UserRow>(
    `SELECT * FROM users WHERE email = :email AND deleted_at IS NULL LIMIT 1`,
    { email }
  );

  if (!user || !user.is_active) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await execute(
    `UPDATE users SET refresh_token = :refreshToken, last_login_at = NOW() WHERE id = :id`,
    { refreshToken, id: user.id }
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar_url: user.avatar_url,
    },
  };
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const user = await queryOne<UserRow>(
    `SELECT * FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1`,
    { id: payload.userId }
  );

  if (!user || user.refresh_token !== refreshToken || !user.is_active) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const newPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(newPayload);
  const newRefresh = signRefreshToken(newPayload);

  await execute(`UPDATE users SET refresh_token = :rt WHERE id = :id`, {
    rt: newRefresh,
    id: user.id,
  });

  return { accessToken, refreshToken: newRefresh };
}

export async function logout(userId: number) {
  await execute(`UPDATE users SET refresh_token = NULL WHERE id = :id`, { id: userId });
}

export async function getMe(userId: number) {
  const user = await queryOne<UserRow>(
    `SELECT id, name, email, phone, role, avatar_url, last_login_at, created_at
     FROM users WHERE id = :id AND deleted_at IS NULL`,
    { id: userId }
  );
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
) {
  const user = await queryOne<UserRow>(
    `SELECT * FROM users WHERE id = :id AND deleted_at IS NULL`,
    { id: userId }
  );
  if (!user) throw new NotFoundError('User');

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new AppError('Current password is incorrect', 400);

  const hash = await bcrypt.hash(newPassword, 12);
  await execute(
    `UPDATE users SET password_hash = :hash, refresh_token = NULL WHERE id = :id`,
    { hash, id: userId }
  );
}

export async function forgotPassword(email: string) {
  const user = await queryOne<UserRow>(
    `SELECT id FROM users WHERE email = :email AND deleted_at IS NULL`,
    { email }
  );

  // Always return success to prevent email enumeration
  if (!user) return { message: 'If the email exists, a reset link has been sent' };

  const token = generateToken(32);
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await execute(
    `UPDATE users SET reset_token = :token, reset_token_expires = :expires WHERE id = :id`,
    { token, expires: expires.toISOString().slice(0, 19).replace('T', ' '), id: user.id }
  );

  // In production: send email. For now return token in development.
  return {
    message: 'If the email exists, a reset link has been sent',
    ...(process.env.NODE_ENV !== 'production' ? { resetToken: token } : {}),
  };
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await queryOne<UserRow>(
    `SELECT * FROM users
     WHERE reset_token = :token
       AND reset_token_expires > NOW()
       AND deleted_at IS NULL`,
    { token }
  );

  if (!user) throw new AppError('Invalid or expired reset token', 400);

  const hash = await bcrypt.hash(newPassword, 12);
  await execute(
    `UPDATE users SET password_hash = :hash, reset_token = NULL, reset_token_expires = NULL, refresh_token = NULL
     WHERE id = :id`,
    { hash, id: user.id }
  );
}

/** Ensure default admin exists with known password */
export async function ensureDefaultAdmin() {
  const existing = await queryOne<UserRow>(
    `SELECT id FROM users WHERE email = :email AND deleted_at IS NULL`,
    { email: 'admin@komalsmakeovers.com' }
  );

  const hash = await bcrypt.hash('Admin@123', 12);

  if (!existing) {
    await execute(
      `INSERT INTO users (name, email, phone, password_hash, role, is_active)
       VALUES ('Komal Admin', 'admin@komalsmakeovers.com', '9876543210', :hash, 'super_admin', 1)`,
      { hash }
    );
  } else {
    // Keep password in sync for local/dev seed convenience
    await execute(`UPDATE users SET password_hash = :hash WHERE id = :id`, {
      hash,
      id: existing.id,
    });
  }
}

export async function listUsers() {
  return query<UserRow[]>(
    `SELECT id, name, email, phone, role, is_active, last_login_at, created_at
     FROM users WHERE deleted_at IS NULL ORDER BY id`
  );
}
