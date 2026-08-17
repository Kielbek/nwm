import { Component, HostListener, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { AskPanelComponent } from '../ask-panel/ask-panel.component';
import { CommandPaletteComponent } from '../../shared/components/command-palette/command-palette.component';
import { InviteModalComponent } from '../../shared/components/invite-modal/invite-modal.component';
import { UpgradeModalComponent } from '../../shared/components/upgrade-modal/upgrade-modal.component';
import { SeoService } from '../../core/services/seo.service';

const MOBILE_BREAKPOINT = 780;

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent,
    HeaderComponent,
    AskPanelComponent,
    CommandPaletteComponent,
    InviteModalComponent,
    UpgradeModalComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  readonly isMobile = signal(this.matchesMobile());
  readonly sidebarOpen = signal(!this.matchesMobile());
  readonly askOpen = signal(false);

  constructor(router: Router, seo: SeoService) {
    seo.removeJsonLd('ld-organization');
    seo.removeJsonLd('ld-faq');
    seo.setNoIndex();
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
}
