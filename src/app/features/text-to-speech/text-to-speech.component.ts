import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { SliderComponent } from '../../shared/components/slider/slider.component';
import { DropdownComponent } from '../../shared/components/dropdown/dropdown.component';
import { TtsService } from '../../core/services/tts.service';
import { TranslateService } from '../../core/services/translate.service';
import { VoiceLibraryService } from '../../core/services/voice-library.service';
import { OutputFormat } from '../../core/models/tts.models';

const MAX_CHARACTERS = 5000;

const MODEL_META = [
  { id: 'expressive', badge: 'E' },
  { id: 'standard', badge: 'S' },
  { id: 'fast', badge: 'F' },
  { id: 'draft', badge: 'D' },
];

const FORMAT_META: OutputFormat[] = ['mp3-128', 'mp3-192', 'wav', 'ogg'];

const STARTER_ICONS: IconName[] = [
  'templates',
  'sparkle',
  'voices',
  'flows',
  'studio',
  'sound-effects',
  'music',
  'speech-to-text',
];

@Component({
  selector: 'app-text-to-speech',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent, SliderComponent, DropdownComponent],
  templateUrl: './text-to-speech.component.html',
  styleUrl: './text-to-speech.component.scss',
})
export class TextToSpeechComponent {
  readonly models = computed(() =>
    MODEL_META.map((meta, i) => ({ ...meta, ...this.translate.dict().models[i] }))
  );

  readonly outputFormats = computed(() =>
    FORMAT_META.map((id, i) => ({ id, label: this.translate.dict().formats[i] }))
  );

  readonly starterPrompts = computed(() =>
    STARTER_ICONS.map((icon, i) => ({ icon, ...this.translate.dict().starters[i] }))
  );

  readonly text = signal('');
  readonly tipDismissed = signal(false);
  readonly voiceSearch = signal('');
  readonly selectedModelId = signal(MODEL_META[1].id);
  readonly outputFormat = signal<OutputFormat>('mp3-128');
  readonly speed = signal(1);
  readonly stability = signal(0.5);
  readonly similarity = signal(0.85);
  readonly styleExaggeration = signal(0);
  readonly languageOverride = signal(false);

  readonly characterCount = computed(() => this.text().length);
  readonly maxCharacters = MAX_CHARACTERS;

  readonly filteredVoices = computed(() => {
    const query = this.voiceSearch().trim().toLowerCase();
    const voices = this.voiceLibrary.voices();
    if (!query) {
      return voices;
    }
    return voices.filter(
      (v) => v.name.toLowerCase().includes(query) || v.description.toLowerCase().includes(query)
    );
  });

  readonly selectedModel = computed(
    () => this.models().find((m) => m.id === this.selectedModelId()) ?? this.models()[0]
  );
  readonly selectedFormat = computed(
    () =>
      this.outputFormats().find((f) => f.id === this.outputFormat()) ?? this.outputFormats()[0]
  );

  constructor(
    readonly ttsService: TtsService,
    readonly translate: TranslateService,
    readonly voiceLibrary: VoiceLibraryService,
    private readonly router: Router
  ) {}

  applyStarterPrompt(prompt: { text: string }): void {
    this.text.set(prompt.text);
  }

  selectVoice(voice: { id: string }, dropdown: DropdownComponent): void {
    this.voiceLibrary.selectVoice(voice.id);
    dropdown.close();
  }

  browseAllVoices(dropdown: DropdownComponent): void {
    dropdown.close();
    this.router.navigateByUrl('/voices');
  }

  selectModel(model: { id: string }, dropdown: DropdownComponent): void {
    this.selectedModelId.set(model.id);
    dropdown.close();
  }

  selectFormat(format: OutputFormat, dropdown: DropdownComponent): void {
    this.outputFormat.set(format);
    dropdown.close();
  }

  onEditorKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.generate();
    }
  }

  generate(): void {
    if (!this.text().trim() || this.ttsService.isSynthesizing()) {
      return;
    }
    this.ttsService
      .synthesize({
        text: this.text(),
        settings: {
          voiceId: this.voiceLibrary.selectedVoiceId(),
          modelId: this.selectedModelId(),
          speed: this.speed(),
          stability: this.stability(),
          similarity: this.similarity(),
          styleExaggeration: this.styleExaggeration(),
          languageOverride: this.languageOverride(),
          outputFormat: this.outputFormat(),
        },
      })
      .subscribe();
  }
}
