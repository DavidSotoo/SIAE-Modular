/**
 * Error de aplicación con código HTTP y código semántico opcional.
 * Todos los handlers de error usan esta clase para devolver respuestas
 * consistentes: { error: string, code?: string }
 */
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, code?: string): AppError =>
  new AppError(message, 400, code ?? 'BAD_REQUEST');

export const unauthorized = (message = 'No autenticado'): AppError =>
  new AppError(message, 401, 'UNAUTHORIZED');

export const forbidden = (message = 'Sin permiso para esta operación', code?: string): AppError =>
  new AppError(message, 403, code ?? 'FORBIDDEN');

export const notFound = (message: string, code?: string): AppError =>
  new AppError(message, 404, code ?? 'NOT_FOUND');

export const conflict = (message: string, code?: string): AppError =>
  new AppError(message, 409, code ?? 'CONFLICT');
