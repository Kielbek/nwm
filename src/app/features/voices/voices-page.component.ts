import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { TranslateService } from '../../core/services/translate.service';
import { VoiceLibraryService } from '../../core/services/voice-library.service';
import { VoicePreviewService, PreviewableVoice } from '../../core/services/voice-preview.service';

@Component({
  selector: 'app-voices-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent, RouterLink],
  templateUrl: './voices-page.component.html',
  styleUrl: './voices-page.component.scss',
})
export class VoicesPageComponent implements OnDestroy {
  readonly search = signal('');

  readonly filteredVoices = computed(() => {
    const query = this.search().trim().toLowerCase();
    const voices = this.voiceLibrary.voices();
    if (!query) {
      return voices;
    }
    return voices.filter(
      (v) => v.name.toLowerCase().includes(query) || v.description.toLowerCase().includes(query)
    );
  });

  constructor(
    readonly voiceLibrary: VoiceLibraryService,
    readonly voicePreview: VoicePreviewService,
    readonly translate: TranslateService,
    private readonly router: Router
  ) {}

  selectVoice(id: string): void {
    this.voicePreview.stop();
    this.voiceLibrary.selectVoice(id);
    this.router.navigateByUrl('/');
  }

  togglePreview(voice: PreviewableVoice, event: Event): void {
    event.stopPropagation();
    this.voicePreview.toggle(voice);
  }

  ngOnDestroy(): void {
    this.voicePreview.stop();
  }
}
