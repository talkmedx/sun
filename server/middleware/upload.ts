import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { AppError } from '../utils/errors';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function storageFor(subdir: string) {
  const dest = path.join(process.cwd(), config.upload.dir, subdir);
  ensureDir(dest);

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });
}

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new AppError('Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF', 400));
  }
  cb(null, true);
}

const limits = {
  fileSize: config.upload.maxFileSizeMb * 1024 * 1024,
};

export const uploadProfile = multer({ storage: storageFor('profiles'), fileFilter, limits });
export const uploadDocument = multer({ storage: storageFor('documents'), fileFilter, limits });
export const uploadExpense = multer({ storage: storageFor('expenses'), fileFilter, limits });
export const uploadBill = multer({ storage: storageFor('bills'), fileFilter, limits });
export const uploadPayment = multer({ storage: storageFor('payments'), fileFilter, limits });
export const uploadAdmission = multer({ storage: storageFor('admissions'), fileFilter, limits });

export function publicUploadPath(subdir: string, filename: string): string {
  return `/uploads/${subdir}/${filename}`;
}
