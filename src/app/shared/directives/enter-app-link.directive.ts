import { Directive, HostBinding, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LoginModalService } from '../../core/services/login-modal.service';
import { isMobileViewport } from '../../core/utils/viewport';

/**
 * Drop-in replacement for `routerLink="/app"` on every public marketing page
 * (landing, pricing, the public nav). A signed-out visitor navigating there
 * directly would just get bounced straight back to /login by the auth
 * guard — on desktop, show the login popup right here instead; on mobile,
 * where there's no room for a modal, fall through to a normal navigation
 * (the guard's own redirect to /login is the right behavior there).
 *
 * Implemented as a directive (not a per-page click handler) because
 * `routerLink`'s own click listener can win a race against a template
 * `(click)` handler on the same element — see onEnterApp() history in
 * public-nav.component.ts — so this owns navigation outright instead of
 * trying to intercept routerLink's.
 */
@Directive({
  selector: 'a[appEnterApp]',
  standalone: true,
})
export class EnterAppLinkDirective {
  @HostBinding('attr.href') readonly href = '/app';

  constructor(
    private readonly auth: AuthService,
    private readonly loginModal: LoginModalService,
    private readonly router: Router
  ) {}

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    event.preventDefault();
    if (this.auth.isAuthenticated() || isMobileViewport()) {
      this.router.navigateByUrl('/app');
      return;
    }
    this.loginModal.open();
  }
}
