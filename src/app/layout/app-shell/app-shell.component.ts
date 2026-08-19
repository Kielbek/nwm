import { Component, HostListener, computed, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { AskPanelComponent } from '../ask-panel/ask-panel.component';
import { CommandPaletteComponent } from '../../shared/components/command-palette/command-palette.component';
import { InviteModalComponent } from '../../shared/components/invite-modal/invite-modal.component';
import { UpgradeModalComponent } from '../../shared/components/upgrade-modal/upgrade-modal.component';
import { GenerationPlayerComponent } from '../../features/text-to-speech/generation-player/generation-player.component';
import { HistoryDetailModalComponent } from '../../shared/components/history-detail-modal/history-detail-modal.component';
import { FileManagerModalComponent } from '../../shared/components/file-manager-modal/file-manager-modal.component';
import { GenerationHistoryService } from '../../core/services/generation-history.service';
import { SeoService } from '../../core/services/seo.service';
import { MOBILE_BREAKPOINT } from '../../core/utils/viewport';

// Mirrors .sidebar's width in sidebar.component.scss.
const SIDEBAR_WIDTH_PX = 248;

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
    GenerationPlayerComponent,
    HistoryDetailModalComponent,
    FileManagerModalComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  readonly isMobile = signal(this.matchesMobile());
  readonly sidebarOpen = signal(!this.matchesMobile());
  readonly askOpen = signal(false);
  readonly playerCollapsed = signal(false);
  // On mobile the sidebar overlays content rather than pushing it, so the
  // persistent player should still span the full width there — only on
  // desktop, with the sidebar actually reserving space, does it need to
  // start after it (see the player's :host, which reads --sidebar-width).
  readonly sidebarWidthPx = computed(() =>
    !this.isMobile() && this.sidebarOpen() ? SIDEBAR_WIDTH_PX : 0
  );

  constructor(router: Router, seo: SeoService, readonly history: GenerationHistoryService) {
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
