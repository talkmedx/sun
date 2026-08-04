import { Response } from 'express';

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export function success<T>(
  res: Response,
  data: T,
  message = 'OK',
  status = 200,
  meta?: ApiMeta
) {
  return res.status(status).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function created<T>(res: Response, data: T, message = 'Created') {
  return success(res, data, message, 201);
}

export function fail(
  res: Response,
  message: string,
  status = 400,
  errors?: Array<{ field?: string; message: string }>
) {
  return res.status(status).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
}
