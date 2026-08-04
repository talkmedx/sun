import crypto from 'crypto';

export function generateStudentCode(seq: number, year = new Date().getFullYear()): string {
  return `KM-${year}-${String(seq).padStart(3, '0')}`;
}

export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ''));
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}
