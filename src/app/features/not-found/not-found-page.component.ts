import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { TranslateService } from '../../core/services/translate.service';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.scss',
})
export class NotFoundPageComponent {
  constructor(readonly translate: TranslateService) {}
}
