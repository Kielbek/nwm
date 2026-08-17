import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, firstValueFrom, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from '../models/auth.models';

/**
 * Access tokens live only in memory (never localStorage — that would make
 * them readable by any injected script). The refresh token is an httpOnly
 * cookie the backend sets and reads itself; the SPA never touches it
 * directly, only calls /api/auth/refresh with `withCredentials` so the
 * browser attaches it. That means every page reload starts with no access
 * token and needs one silent refresh call to restore the session — see
 * `tryRestoreSession`, run once at bootstrap via APP_INITIALIZER.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = `${environment.apiUrl}/api/auth`;
  private readonly usersBase = `${environment.apiUrl}/api/users`;

  private readonly accessToken = signal<string | null>(null);
  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  /** Settles once the initial silent-refresh attempt (on page load) has resolved either way. */
  readonly ready = signal(false);

  constructor(private readonly http: HttpClient) {}

  getAccessToken(): string | null {
    return this.accessToken();
  }

  async tryRestoreSession(): Promise<void> {
    try {
      await firstValueFrom(this.refresh());
    } catch {
      // No valid session yet — expected for a first visit or a signed-out user.
    } finally {
      this.ready.set(true);
    }
  }

  register(payload: RegisterPayload): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>(`${this.base}/register`, payload, { withCredentials: true })
      .pipe(
        tap((res) => this.applySession(res)),
        map((res) => res.user)
      );
  }

  login(payload: LoginPayload): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>(`${this.base}/login`, payload, { withCredentials: true })
      .pipe(
        tap((res) => this.applySession(res)),
        map((res) => res.user)
      );
  }

  refresh(): Observable<AuthUser> {
    return this.http.post<AuthResponse>(`${this.base}/refresh`, {}, { withCredentials: true }).pipe(
      tap((res) => this.applySession(res)),
      map((res) => res.user)
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/logout`, {}, { withCredentials: true }).pipe(
      tap(() => this.clearSession()),
      catchError(() => {
        // Drop local session state even if the network call itself failed —
        // the user clicked "sign out," the UI should reflect that regardless.
        this.clearSession();
        return of(void 0);
      })
    );
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.base}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/reset-password`, { token, newPassword });
  }

  verifyEmail(token: string): Observable<void> {
    return this.http.post<void>(`${this.base}/verify-email`, { token });
  }

  resendVerificationEmail(): Observable<void> {
    return this.http.post<void>(`${this.base}/verify-email/resend`, {});
  }

  googleLoginUrl(): string {
    return `${environment.apiUrl}/oauth2/authorization/google`;
  }

  /** Used by the OAuth callback page — the access token arrives directly in the redirect's query string. */
  async applyOAuthToken(accessToken: string): Promise<AuthUser> {
    this.accessToken.set(accessToken);
    const user = await firstValueFrom(this.fetchCurrentUser());
    this.currentUser.set(user);
    return user;
  }

  refreshCurrentUser(): Observable<AuthUser> {
    return this.fetchCurrentUser().pipe(tap((user) => this.currentUser.set(user)));
  }

  updateName(name: string): Observable<AuthUser> {
    return this.http
      .patch<AuthUser>(`${this.usersBase}/me`, { name })
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  /** Clears local session state without calling the backend — used when a token refresh itself fails (interceptor). */
  forceLogout(): void {
    this.clearSession();
  }

  private fetchCurrentUser(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.usersBase}/me`);
  }

  private applySession(res: AuthResponse): void {
    this.accessToken.set(res.accessToken);
    this.currentUser.set(res.user);
  }

  private clearSession(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
  }
}
