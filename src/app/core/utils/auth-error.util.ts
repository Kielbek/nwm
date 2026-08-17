import { HttpErrorResponse } from '@angular/common/http';

export type AuthErrorKind =
  | 'invalid-credentials'
  | 'account-exists'
  | 'locked'
  | 'rate-limited'
  | 'validation'
  | 'invalid-or-expired-token'
  | 'unknown';

/**
 * The backend returns English error messages (see ApiError/GlobalExceptionHandler)
 * that aren't meant for display — we classify by HTTP status instead and let
 * each page pick its own translated copy for the resulting kind.
 */
export function classifyAuthError(error: unknown): AuthErrorKind {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 401:
        return 'invalid-credentials';
      case 409:
        return 'account-exists';
      case 423:
        return 'locked';
      case 429:
        return 'rate-limited';
      case 400:
        return typeof error.error?.message === 'string' &&
          error.error.message.toLowerCase().includes('token')
          ? 'invalid-or-expired-token'
          : 'validation';
      default:
        return 'unknown';
    }
  }
  return 'unknown';
}
