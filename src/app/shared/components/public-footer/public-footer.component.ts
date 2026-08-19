import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { TranslateService } from '../../../core/services/translate.service';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  templateUrl: './public-footer.component.html',
  styleUrl: './public-footer.component.scss',
})
export class PublicFooterComponent {
  /** Reskins the footer to the landing page's paper palette — see PublicNavComponent's identical input for why. */
  @Input() paper = false;

  readonly currentYear = new Date().getFullYear();

  constructor(readonly translate: TranslateService) {}
}
