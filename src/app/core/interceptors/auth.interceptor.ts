import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * The only auth endpoints that are genuinely public (no bearer token
 * needed, and a 401 from them should never trigger a refresh-and-retry).
 * Everything else under /api/auth/** — notably logout and
 * verify-email/resend — requires the same Bearer token as any other
 * protected endpoint.
 */
const PUBLIC_AUTH_PATHS = new Set([
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
]);

/**
 * Attaches the in-memory access token as a Bearer header to every request
 * except the public auth endpoints above. On a 401 from any other endpoint,
 * attempts exactly one silent refresh-and-retry before giving up and
 * dropping the local session, so an expired 15-minute access token doesn't
 * interrupt the user mid-session.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isPublicAuthEndpoint = PUBLIC_AUTH_PATHS.has(pathOnly(req.url));
  const token = auth.getAccessToken();

  const authorized =
    token && !isPublicAuthEndpoint
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isPublicAuthEndpoint) {
        return auth.refresh().pipe(
          switchMap(() => {
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${auth.getAccessToken()}` },
            });
            return next(retried);
          }),
          catchError(() => {
            auth.forceLogout();
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};

function pathOnly(url: string): string {
  const queryIndex = url.indexOf('?');
  return queryIndex === -1 ? url : url.slice(0, queryIndex);
}
