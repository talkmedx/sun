import { Request, Response, NextFunction } from 'express';
import { success } from '../utils/response';
import { AppError } from '../utils/errors';
import * as googleDrive from '../services/googleDriveService';

export async function status(_req: Request, res: Response, next: NextFunction) {
  try {
    return success(res, await googleDrive.getDriveStatus());
  } catch (e) {
    next(e);
  }
}

export async function connect(_req: Request, res: Response, next: NextFunction) {
  try {
    return success(res, await googleDrive.startConnect());
  } catch (e) {
    next(e instanceof Error ? new AppError(e.message, 400) : e);
  }
}

export async function callback(req: Request, res: Response) {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    if (!code || !state) {
      throw new Error('Missing OAuth code');
    }
    const redirectTo = await googleDrive.handleOAuthCallback(code, state);
    return res.redirect(redirectTo);
  } catch (e) {
    const message = encodeURIComponent((e as Error).message || 'Google Drive connect failed');
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3001'}/sun/settings?drive=error&message=${message}`);
  }
}

export async function disconnect(_req: Request, res: Response, next: NextFunction) {
  try {
    await googleDrive.disconnectDrive();
    return success(res, { connected: false }, 'Google Drive disconnected');
  } catch (e) {
    next(e);
  }
}
