import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { FlagComponent } from '../flag/flag.component';
import { EnterAppLinkDirective } from '../../directives/enter-app-link.directive';
import { TranslateService, Lang } from '../../../core/services/translate.service';
import { ThemeService, ThemeMode } from '../../../core/services/theme.service';

@Component({
  selector: 'app-public-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent, FlagComponent, EnterAppLinkDirective],
  templateUrl: './public-nav.component.html',
  styleUrl: './public-nav.component.scss',
})
export class PublicNavComponent {
  /** Reskins the bar to the landing page's paper palette instead of the app's default surface tokens, so it reads as one continuous surface with the hero below it. */
  @Input() paper = false;

  constructor(
    readonly translate: TranslateService,
    readonly theme: ThemeService
  ) {}

  setLang(lang: Lang): void {
    this.translate.setLang(lang);
  }

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }
}
