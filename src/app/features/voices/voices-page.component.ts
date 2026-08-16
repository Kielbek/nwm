import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { TranslateService } from '../../core/services/translate.service';
import {
  VoiceGender,
  VoiceLibraryService,
  VoiceTone,
} from '../../core/services/voice-library.service';
import { VoicePreviewService, PreviewableVoice } from '../../core/services/voice-preview.service';
import { SeoService } from '../../core/services/seo.service';

type GenderFilter = 'all' | VoiceGender;
type ToneFilter = 'all' | VoiceTone;

const TONE_OPTIONS: VoiceTone[] = ['confident', 'calm', 'energetic', 'warm', 'neutral'];

@Component({
  selector: 'app-voices-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent, RouterLink],
  templateUrl: './voices-page.component.html',
  styleUrl: './voices-page.component.scss',
})
export class VoicesPageComponent implements OnDestroy {
  readonly waveformBars = Array.from({ length: 5 }, (_, i) => i);

  readonly search = signal('');
  readonly genderFilter = signal<GenderFilter>('all');
  readonly toneFilter = signal<ToneFilter>('all');
  readonly toneOptions = TONE_OPTIONS;

  readonly filteredVoices = computed(() => {
    const query = this.search().trim().toLowerCase();
    const gender = this.genderFilter();
    const tone = this.toneFilter();
    return this.voiceLibrary.voices().filter((v) => {
      if (gender !== 'all' && v.gender !== gender) {
        return false;
      }
      if (tone !== 'all' && v.tone !== tone) {
        return false;
      }
      if (!query) {
        return true;
      }
      return v.name.toLowerCase().includes(query) || v.description.toLowerCase().includes(query);
    });
  });

  toneLabel(tone: VoiceTone): string {
    const dict = this.translate.dict().voicesPage;
    const labels: Record<VoiceTone, string> = {
      confident: dict.toneConfident,
      calm: dict.toneCalm,
      energetic: dict.toneEnergetic,
      warm: dict.toneWarm,
      neutral: dict.toneNeutral,
    };
    return labels[tone];
  }

  setGenderFilter(gender: GenderFilter): void {
    this.genderFilter.set(gender);
  }

  setToneFilter(tone: ToneFilter): void {
    this.toneFilter.set(tone);
  }

  constructor(
    readonly voiceLibrary: VoiceLibraryService,
    readonly voicePreview: VoicePreviewService,
    readonly translate: TranslateService,
    private readonly router: Router,
    seo: SeoService
  ) {
    effect(() => seo.setPrivateTitle(this.translate.dict().seo.voicesTitle));
  }

  selectVoice(id: string): void {
    this.voicePreview.stop();
    this.voiceLibrary.selectVoice(id);
    this.router.navigateByUrl('/app');
  }

  togglePreview(voice: PreviewableVoice, event: Event): void {
    event.stopPropagation();
    this.voicePreview.toggle(voice);
  }

  initials(name: string): string {
    return name.slice(0, 1).toUpperCase();
  }

  ngOnDestroy(): void {
    this.voicePreview.stop();
  }
}
