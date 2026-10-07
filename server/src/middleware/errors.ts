import { NextFunction, Request, Response } from 'express';

export function notFound(_req: Request, res: Response) { res.status(404).json({ success: false, error: 'Endpoint not found.' }); }
export function errorHandler(error: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) {
  const status = error.statusCode ?? 500;
  res.status(status).json({ success: false, error: status >= 500 ? (status === 500 ? 'Something went wrong. Please try again.' : error.message) : error.message });
}
