import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { FlagComponent } from '../flag/flag.component';
import { TranslateService, Lang } from '../../../core/services/translate.service';
import { ThemeService, ThemeMode } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { LoginModalService } from '../../../core/services/login-modal.service';
import { isMobileViewport } from '../../../core/utils/viewport';

@Component({
  selector: 'app-public-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent, FlagComponent],
  templateUrl: './public-nav.component.html',
  styleUrl: './public-nav.component.scss',
})
export class PublicNavComponent {
  /** Reskins the bar to the landing page's paper palette instead of the app's default surface tokens, so it reads as one continuous surface with the hero below it. */
  @Input() paper = false;

  constructor(
    readonly translate: TranslateService,
    readonly theme: ThemeService,
    readonly auth: AuthService,
    private readonly loginModal: LoginModalService,
    private readonly router: Router
  ) {}

  setLang(lang: Lang): void {
    this.translate.setLang(lang);
  }

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  /**
   * A logged-out visitor clicking "open app" would otherwise navigate to
   * /app and immediately get bounced to the full /login page by the auth
   * guard. On desktop that round trip isn't needed — show the login modal
   * right here instead. On mobile there's no room for a modal, so keep the
   * normal navigate-then-redirect behavior.
   *
   * This owns navigation entirely (no routerLink on the anchor) — a click
   * handler calling preventDefault() can't reliably win a race against
   * RouterLink's own click listener on the same element, since listener
   * order between a directive and a template binding isn't guaranteed.
   */
  onEnterApp(event: MouseEvent): void {
    event.preventDefault();
    if (this.auth.isAuthenticated() || isMobileViewport()) {
      this.router.navigateByUrl('/app');
      return;
    }
    this.loginModal.open();
  }
}
