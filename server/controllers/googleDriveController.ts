import { Request, Response, NextFunction } from 'express';
import { success } from '../utils/response';
import { AppError } from '../utils/errors';
import * as googleDrive from '../services/googleDriveService';

function requestHost(req: Request) {
  const forwarded = req.get('x-forwarded-host');
  if (forwarded) return forwarded;
  const origin = req.get('origin') || req.get('referer') || '';
  try {
    if (origin) return new URL(origin).host;
  } catch {
    // ignore
  }
  return String(req.get('host') || '');
}

export async function status(req: Request, res: Response, next: NextFunction) {
  try {
    return success(res, await googleDrive.getDriveStatus(requestHost(req)));
  } catch (e) {
    next(e);
  }
}

export async function saveCredentials(req: Request, res: Response, next: NextFunction) {
  try {
    await googleDrive.saveAppCredentials(String(req.body.clientId || ''), String(req.body.clientSecret || ''));
    return success(res, await googleDrive.getDriveStatus(requestHost(req)), 'Google Drive credentials saved');
  } catch (e) {
    next(e instanceof Error ? new AppError(e.message, 400) : e);
  }
}

export async function connect(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await googleDrive.connectWithCredentials(
      {
        clientId: String(req.body.clientId || ''),
        clientSecret: String(req.body.clientSecret || ''),
        refreshToken: String(req.body.refreshToken || ''),
      },
      requestHost(req)
    );
    return success(
      res,
      result,
      result.connected ? 'Google Drive connected' : 'Continue on Google to allow Drive access'
    );
  } catch (e) {
    next(e instanceof Error ? (e instanceof AppError ? e : new AppError(e.message, 400)) : e);
  }
}

export async function callback(req: Request, res: Response) {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    if (!code) {
      throw new Error('Missing OAuth code');
    }
    const redirectTo = await googleDrive.handleOAuthCallback(code, state, requestHost(req));
    return res.redirect(redirectTo);
  } catch (e) {
    const message = encodeURIComponent((e as Error).message || 'Google Drive connect failed');
    const { clientUrl } = googleDrive.resolvePublicUrls(requestHost(req));
    return res.redirect(`${clientUrl}/sun/settings?drive=error&message=${message}`);
  }
}

export async function disconnect(req: Request, res: Response, next: NextFunction) {
  try {
    await googleDrive.disconnectDrive();
    return success(res, await googleDrive.getDriveStatus(requestHost(req)), 'Google Drive disconnected');
  } catch (e) {
    next(e);
  }
}
