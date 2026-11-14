// One error type for all expected problems. The error handler turns it into a JSON response.

export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string) => new AppError(400, 'VALIDATION', message);
export const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
// Same message for "missing" and "not yours", so nobody can probe other players' data.
export const notFound = () => new AppError(404, 'NOT_FOUND', 'This item is not available.');
export const conflict = (code: string, message: string) => new AppError(409, code, message);
