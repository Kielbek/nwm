import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgSwitch, NgSwitchCase } from '@angular/common';

export type FlagCode = 'pl' | 'en';

/**
 * Small inline-SVG flag graphics for the language switcher — used instead
 * of flag emoji, which render as inconsistent (sometimes missing, sometimes
 * a two-letter code) depending on the OS/browser's emoji font rather than
 * looking like an actual flag.
 */
@Component({
  selector: 'app-flag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size * 0.7"
      viewBox="0 0 30 20"
      class="flag"
      role="img"
      [attr.aria-label]="code === 'pl' ? 'Polski' : 'English'"
    >
      <ng-container [ngSwitch]="code">
        <ng-container *ngSwitchCase="'pl'">
          <rect width="30" height="20" fill="#fff" />
          <rect y="10" width="30" height="10" fill="#dc143c" />
        </ng-container>
        <ng-container *ngSwitchCase="'en'">
          <rect width="30" height="20" fill="#00247d" />
          <path d="M0 0 30 20M30 0 0 20" stroke="#fff" stroke-width="4" />
          <path d="M0 0 30 20M30 0 0 20" stroke="#cf142b" stroke-width="1.5" />
          <path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="7" />
          <path d="M15 0V20M0 10H30" stroke="#cf142b" stroke-width="4" />
        </ng-container>
      </ng-container>
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex-shrink: 0;
      }
      .flag {
        display: block;
        border-radius: 2px;
      }
    `,
  ],
  imports: [NgSwitch, NgSwitchCase],
})
export class FlagComponent {
  @Input() code!: FlagCode;
  @Input() size = 18;
}
