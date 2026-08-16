import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { DropdownComponent } from '../../shared/components/dropdown/dropdown.component';
import { ThemeMode, ThemeService } from '../../core/services/theme.service';
import { Lang, TranslateService } from '../../core/services/translate.service';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, DropdownComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();

  readonly themeIcon: Record<ThemeMode, IconName> = {
    light: 'sun',
    dark: 'moon',
    system: 'monitor',
  };

  constructor(readonly theme: ThemeService, readonly translate: TranslateService) {}

  selectTheme(mode: ThemeMode, dropdown: DropdownComponent): void {
    this.theme.setMode(mode);
    dropdown.close();
  }

  selectLang(lang: Lang, dropdown: DropdownComponent): void {
    this.translate.setLang(lang);
    dropdown.close();
  }
}
