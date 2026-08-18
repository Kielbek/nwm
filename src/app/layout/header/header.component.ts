import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { DropdownComponent } from '../../shared/components/dropdown/dropdown.component';
import { ThemeMode, ThemeService } from '../../core/services/theme.service';
import { Lang, TranslateService } from '../../core/services/translate.service';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationItem, NotificationsService } from '../../core/services/notifications.service';
import { ReferralService } from '../../core/services/referral.service';
import { CommandPaletteService } from '../../core/services/command-palette.service';
import { FileManagerModalService } from '../../core/services/file-manager-modal.service';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, DropdownComponent, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  @Input() askOpen = false;
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() toggleAsk = new EventEmitter<void>();

  readonly themeIcon: Record<ThemeMode, IconName> = {
    light: 'sun',
    dark: 'moon',
    system: 'monitor',
  };

  constructor(
    readonly theme: ThemeService,
    readonly translate: TranslateService,
    readonly account: AccountService,
    private readonly auth: AuthService,
    readonly notifications: NotificationsService,
    readonly referral: ReferralService,
    readonly palette: CommandPaletteService,
    readonly fileManagerModal: FileManagerModalService,
    private readonly router: Router
  ) {}

  signOut(dropdown: DropdownComponent): void {
    dropdown.close();
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }

  selectTheme(mode: ThemeMode, dropdown: DropdownComponent): void {
    this.theme.setMode(mode);
    dropdown.close();
  }

  selectLang(lang: Lang, dropdown: DropdownComponent): void {
    this.translate.setLang(lang);
    dropdown.close();
  }

  openNotification(item: NotificationItem, dropdown: DropdownComponent): void {
    this.notifications.markRead(item.id);
    dropdown.close();
    if (item.link) {
      this.router.navigateByUrl(item.link);
    }
  }
}
