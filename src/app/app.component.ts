import { Component, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { CookieBannerComponent } from './shared/components/cookie-banner/cookie-banner.component';
import { LoginModalComponent } from './shared/components/login-modal/login-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CookieBannerComponent, LoginModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly progressState = signal<'idle' | 'loading' | 'finishing'>('idle');

  private resetTimeout?: ReturnType<typeof setTimeout>;

  constructor(router: Router) {
    router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.startProgress();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.finishProgress();
      }
    });
  }

  private startProgress(): void {
    clearTimeout(this.resetTimeout);
    this.progressState.set('loading');
  }

  private finishProgress(): void {
    if (this.progressState() === 'idle') {
      return;
    }
    this.progressState.set('finishing');
    this.resetTimeout = setTimeout(() => this.progressState.set('idle'), 350);
  }
}
