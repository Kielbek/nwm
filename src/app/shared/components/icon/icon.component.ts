import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgSwitch, NgSwitchCase } from '@angular/common';

export type IconName =
  | 'home' | 'voices' | 'studio' | 'flows' | 'templates' | 'assets'
  | 'text-to-speech' | 'sound-effects' | 'image-video' | 'voice-isolator'
  | 'voice-changer' | 'music' | 'speech-to-text' | 'more'
  | 'chevron-down' | 'chevron-right' | 'search' | 'bell' | 'folder'
  | 'sparkle' | 'close' | 'play' | 'download' | 'panel' | 'invite'
  | 'sun' | 'moon' | 'monitor' | 'globe' | 'check' | 'pause' | 'send' | 'trash'
  | 'help' | 'link' | 'book' | 'logout' | 'edit';

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 20 20" fill="none"
         stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
         class="icon" aria-hidden="true">
      <ng-container [ngSwitch]="name">
        <ng-container *ngSwitchCase="'home'">
          <path d="M3 9.5 10 3l7 6.5" /><path d="M5 8.5V17h10V8.5" />
        </ng-container>
        <ng-container *ngSwitchCase="'voices'">
          <circle cx="10" cy="6.5" r="3" /><path d="M4 17c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
        </ng-container>
        <ng-container *ngSwitchCase="'studio'">
          <rect x="3" y="3" width="6" height="6" rx="1" /><rect x="11" y="3" width="6" height="6" rx="1" />
          <rect x="3" y="11" width="6" height="6" rx="1" /><rect x="11" y="11" width="6" height="6" rx="1" />
        </ng-container>
        <ng-container *ngSwitchCase="'flows'">
          <circle cx="5" cy="5" r="2" /><circle cx="15" cy="15" r="2" />
          <path d="M5 7v3a3 3 0 0 0 3 3h4" />
        </ng-container>
        <ng-container *ngSwitchCase="'templates'">
          <rect x="3" y="3" width="14" height="14" rx="2" /><path d="M3 8h14" /><path d="M8 8v9" />
        </ng-container>
        <ng-container *ngSwitchCase="'assets'">
          <path d="M3 6a2 2 0 0 1 2-2h3l1.5 2H15a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />
        </ng-container>
        <ng-container *ngSwitchCase="'text-to-speech'">
          <path d="M3 8v4" /><path d="M6 6v8" /><path d="M9 4v12" /><path d="M12 6v8" /><path d="M15 8v4" /><path d="M17.5 8v4" />
        </ng-container>
        <ng-container *ngSwitchCase="'sound-effects'">
          <path d="M3 13V7l4-2v14l-4-2Z" /><path d="M10 5a7 7 0 0 1 0 10" /><path d="M13 7.5a3.5 3.5 0 0 1 0 5" />
        </ng-container>
        <ng-container *ngSwitchCase="'image-video'">
          <rect x="3" y="4" width="14" height="12" rx="2" /><circle cx="7.5" cy="9" r="1.5" /><path d="M4 15l4-4 3 3 3-2.5L17 15" />
        </ng-container>
        <ng-container *ngSwitchCase="'voice-isolator'">
          <path d="M10 3v14" /><path d="M6 6v8" /><path d="M14 6v8" /><path d="M3 9v2" /><path d="M17 9v2" />
        </ng-container>
        <ng-container *ngSwitchCase="'voice-changer'">
          <path d="M4 7h9l-2.5-2.5" /><path d="M16 13H7l2.5 2.5" />
        </ng-container>
        <ng-container *ngSwitchCase="'music'">
          <circle cx="6" cy="15" r="2" /><circle cx="14" cy="13" r="2" /><path d="M8 15V5l8-2v10" />
        </ng-container>
        <ng-container *ngSwitchCase="'speech-to-text'">
          <rect x="3" y="5" width="14" height="10" rx="2" /><path d="M6 9h8" /><path d="M6 12h5" />
        </ng-container>
        <ng-container *ngSwitchCase="'more'">
          <circle cx="4.5" cy="10" r="1" /><circle cx="10" cy="10" r="1" /><circle cx="15.5" cy="10" r="1" />
        </ng-container>
        <ng-container *ngSwitchCase="'chevron-down'">
          <path d="M5 8l5 5 5-5" />
        </ng-container>
        <ng-container *ngSwitchCase="'chevron-right'">
          <path d="M8 5l5 5-5 5" />
        </ng-container>
        <ng-container *ngSwitchCase="'search'">
          <circle cx="8.5" cy="8.5" r="5" /><path d="M16 16l-3.5-3.5" />
        </ng-container>
        <ng-container *ngSwitchCase="'bell'">
          <path d="M5 8a5 5 0 0 1 10 0c0 4 1.5 5 1.5 5h-13S5 12 5 8Z" /><path d="M8.5 16a1.5 1.5 0 0 0 3 0" />
        </ng-container>
        <ng-container *ngSwitchCase="'folder'">
          <path d="M3 6a1 1 0 0 1 1-1h4l1.5 2H16a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z" />
        </ng-container>
        <ng-container *ngSwitchCase="'sparkle'">
          <path d="M10 3l1.3 4.7L16 9l-4.7 1.3L10 15l-1.3-4.7L4 9l4.7-1.3L10 3Z" />
        </ng-container>
        <ng-container *ngSwitchCase="'close'">
          <path d="M5 5l10 10" /><path d="M15 5L5 15" />
        </ng-container>
        <ng-container *ngSwitchCase="'play'">
          <path d="M6 4.5v11l9-5.5-9-5.5Z" />
        </ng-container>
        <ng-container *ngSwitchCase="'download'">
          <path d="M10 3v9" /><path d="M6 8.5 10 12.5 14 8.5" /><path d="M4 16h12" />
        </ng-container>
        <ng-container *ngSwitchCase="'panel'">
          <rect x="3" y="4" width="14" height="12" rx="2" /><path d="M8 4v12" />
        </ng-container>
        <ng-container *ngSwitchCase="'invite'">
          <circle cx="7" cy="7" r="3" /><path d="M2 17c0-3 2.2-5 5-5s5 2 5 5" /><path d="M14 5v6" /><path d="M11 8h6" />
        </ng-container>
        <ng-container *ngSwitchCase="'sun'">
          <circle cx="10" cy="10" r="3.5" />
          <path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7" />
        </ng-container>
        <ng-container *ngSwitchCase="'moon'">
          <path d="M16 12.2A6.8 6.8 0 0 1 7.8 4 6.8 6.8 0 1 0 16 12.2Z" />
        </ng-container>
        <ng-container *ngSwitchCase="'monitor'">
          <rect x="3" y="4" width="14" height="9.5" rx="1.5" /><path d="M7.5 17h5" /><path d="M10 13.5V17" />
        </ng-container>
        <ng-container *ngSwitchCase="'globe'">
          <circle cx="10" cy="10" r="7" />
          <path d="M3 10h14" /><path d="M10 3c2.2 2 3.3 4.5 3.3 7s-1.1 5-3.3 7c-2.2-2-3.3-4.5-3.3-7s1.1-5 3.3-7Z" />
        </ng-container>
        <ng-container *ngSwitchCase="'check'">
          <path d="M4.5 10.5l3.5 3.5 7.5-8" />
        </ng-container>
        <ng-container *ngSwitchCase="'pause'">
          <path d="M6.5 4.5v11" /><path d="M13.5 4.5v11" />
        </ng-container>
        <ng-container *ngSwitchCase="'send'">
          <path d="M10 15.5V5" /><path d="M5.5 9.5 10 5l4.5 4.5" />
        </ng-container>
        <ng-container *ngSwitchCase="'trash'">
          <path d="M4.5 6h11" /><path d="M8 6V4.5h4V6" />
          <path d="M6 6l.7 9.5A1 1 0 0 0 7.7 16.5h4.6a1 1 0 0 0 1-.9L14 6" />
        </ng-container>
        <ng-container *ngSwitchCase="'help'">
          <circle cx="10" cy="10" r="7" />
          <path d="M7.8 7.8a2.2 2.2 0 1 1 3.3 1.9c-.7.4-1.1.9-1.1 1.8v.3" />
          <path d="M10 14.5v.1" />
        </ng-container>
        <ng-container *ngSwitchCase="'link'">
          <path d="M8.5 11.5a3 3 0 0 0 4 .2l2-2a3 3 0 0 0-4.2-4.2l-1 1" />
          <path d="M11.5 8.5a3 3 0 0 0-4-.2l-2 2a3 3 0 0 0 4.2 4.2l1-1" />
        </ng-container>
        <ng-container *ngSwitchCase="'book'">
          <path d="M4 4.5h5A2 2 0 0 1 11 6.5v9A1.5 1.5 0 0 0 9.5 14H4Z" />
          <path d="M16 4.5h-5A2 2 0 0 0 9 6.5v9A1.5 1.5 0 0 1 10.5 14H16Z" />
        </ng-container>
        <ng-container *ngSwitchCase="'logout'">
          <path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
          <path d="M13 6.5 16.5 10 13 13.5" /><path d="M7 10h9.3" />
        </ng-container>
        <ng-container *ngSwitchCase="'edit'">
          <path d="M12.5 3.5 16.5 7.5 7 17H3v-4Z" /><path d="M11 5l4 4" />
        </ng-container>
      </ng-container>
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; }
    .icon { display: block; }
  `],
  imports: [NgSwitch, NgSwitchCase],
})
export class IconComponent {
  @Input() name!: IconName;
  @Input() size = 20;
}
