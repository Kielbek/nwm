import { Component, HostListener, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { HeaderComponent } from './layout/header/header.component';
import { AskPanelComponent } from './layout/ask-panel/ask-panel.component';
import { CookieBannerComponent } from './shared/components/cookie-banner/cookie-banner.component';
import { CommandPaletteComponent } from './shared/components/command-palette/command-palette.component';
import { InviteModalComponent } from './shared/components/invite-modal/invite-modal.component';

const MOBILE_BREAKPOINT = 780;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent,
    HeaderComponent,
    AskPanelComponent,
    CookieBannerComponent,
    CommandPaletteComponent,
    InviteModalComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly isMobile = signal(this.matchesMobile());
  readonly sidebarOpen = signal(!this.matchesMobile());
  readonly askOpen = signal(false);
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

    router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      if (this.isMobile()) {
        this.closeSidebar();
        this.closeAsk();
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
    if (this.sidebarOpen() && this.isMobile()) {
      this.askOpen.set(false);
    }
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleAsk(): void {
    this.askOpen.update((open) => !open);
    if (this.askOpen() && this.isMobile()) {
      this.sidebarOpen.set(false);
    }
  }

  closeAsk(): void {
    this.askOpen.set(false);
  }

  @HostListener('window:resize')
  onResize(): void {
    const mobile = this.matchesMobile();
    if (mobile !== this.isMobile()) {
      this.isMobile.set(mobile);
      this.sidebarOpen.set(!mobile);
      this.askOpen.set(false);
    }
  }

  private matchesMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
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
