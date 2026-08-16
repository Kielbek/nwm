import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { TranslateService, Lang } from '../../../core/services/translate.service';
import { ThemeService, ThemeMode } from '../../../core/services/theme.service';

@Component({
  selector: 'app-public-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './public-nav.component.html',
  styleUrl: './public-nav.component.scss',
})
export class PublicNavComponent {
  constructor(readonly translate: TranslateService, readonly theme: ThemeService) {}

  setLang(lang: Lang): void {
    this.translate.setLang(lang);
  }

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }
}
