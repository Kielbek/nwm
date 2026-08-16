import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';

interface NavItem {
  icon: IconName;
  label: string;
  active?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  readonly mainNav: NavItem[] = [
    { icon: 'home', label: 'Strona główna' },
    { icon: 'voices', label: 'Głosy' },
    { icon: 'studio', label: 'Studio' },
    { icon: 'flows', label: 'Flowy' },
    { icon: 'templates', label: 'Szablony' },
    { icon: 'assets', label: 'Zasoby' },
  ];

  readonly pinnedNav: NavItem[] = [
    { icon: 'text-to-speech', label: 'Text to Speech', active: true },
  ];

  readonly toolsNav: NavItem[] = [
    { icon: 'sound-effects', label: 'Sound Effects' },
    { icon: 'image-video', label: 'Obraz i wideo' },
    { icon: 'voice-isolator', label: 'Voice Isolator' },
    { icon: 'voice-changer', label: 'Voice Changer' },
    { icon: 'music', label: 'Muzyka' },
    { icon: 'speech-to-text', label: 'Mowa na tekst' },
  ];
}
