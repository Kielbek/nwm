import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { SliderComponent } from '../../shared/components/slider/slider.component';
import { DropdownComponent } from '../../shared/components/dropdown/dropdown.component';
import { GenerationPlayerComponent } from './generation-player/generation-player.component';
import { TtsService } from '../../core/services/tts.service';
import { TranslateService } from '../../core/services/translate.service';
import { VoiceLibraryService } from '../../core/services/voice-library.service';
import { VoicePreviewService, PreviewableVoice } from '../../core/services/voice-preview.service';
import {
  GenerationEntry,
  GenerationHistoryService,
} from '../../core/services/generation-history.service';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { UpgradeModalService } from '../../core/services/upgrade-modal.service';
import { SeoService } from '../../core/services/seo.service';
import { OutputFormat } from '../../core/models/tts.models';

const MAX_CHARACTERS = 5000;
const RING_RADIUS = 9;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

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
  imports: [FormsModule, IconComponent, SliderComponent, DropdownComponent, GenerationPlayerComponent],
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

  readonly lastEntryId = signal<string | null>(null);
  readonly lastEntry = computed<GenerationEntry | null>(
    () => this.history.entries().find((entry) => entry.id === this.lastEntryId()) ?? null
  );
  readonly fileImportError = signal<string | null>(null);

  readonly ringCircumference = RING_CIRCUMFERENCE;
  readonly planUsagePercent = computed(() => Math.min(100, this.account.usagePercent()));
  readonly ringOffset = computed(
    () => RING_CIRCUMFERENCE * (1 - this.planUsagePercent() / 100)
  );
  readonly charactersRemaining = computed(() =>
    Math.max(0, this.account.characterLimit() - this.account.charactersUsed())
  );

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
    readonly voicePreview: VoicePreviewService,
    readonly history: GenerationHistoryService,
    readonly account: AccountService,
    private readonly auth: AuthService,
    private readonly upgradeModal: UpgradeModalService,
    private readonly router: Router,
    seo: SeoService
  ) {
    effect(() => seo.setPrivateTitle(this.translate.dict().seo.generatorTitle));
    const pending = this.history.consumePendingReuse();
    if (pending) {
      this.text.set(pending.text);
      this.voiceLibrary.selectVoice(pending.voiceId);
    }
  }

  applyStarterPrompt(prompt: { text: string }): void {
    this.text.set(prompt.text);
  }

  selectVoice(voice: { id: string }, dropdown: DropdownComponent): void {
    this.voicePreview.stop();
    this.voiceLibrary.selectVoice(voice.id);
    dropdown.close();
  }

  togglePreview(voice: PreviewableVoice, event: Event): void {
    event.stopPropagation();
    this.voicePreview.toggle(voice);
  }

  browseAllVoices(dropdown: DropdownComponent): void {
    this.voicePreview.stop();
    dropdown.close();
    this.router.navigateByUrl('/app/voices');
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
    if (this.text().length > this.charactersRemaining()) {
      this.upgradeModal.open();
      return;
    }
    const settings = {
      voiceId: this.voiceLibrary.selectedVoiceId(),
      modelId: this.selectedModelId(),
      speed: this.speed(),
      stability: this.stability(),
      similarity: this.similarity(),
      styleExaggeration: this.styleExaggeration(),
      languageOverride: this.languageOverride(),
      outputFormat: this.outputFormat(),
    };

    this.ttsService.synthesize({ text: this.text(), settings }).subscribe((result) => {
      if (result) {
        // Character usage only actually changes server-side on a real
        // success (the browser-speech fallback path returns null and never
        // touched the backend), so only re-sync the quota then.
        this.auth.refreshCurrentUser().subscribe();
      }
    });

    const entry = this.history.add({
      text: this.text(),
      voiceId: this.voiceLibrary.selectedVoice().id,
      voiceName: this.voiceLibrary.selectedVoice().name,
      voiceDescription: this.voiceLibrary.selectedVoice().description,
      modelId: this.selectedModel().id,
      modelName: this.selectedModel().name,
      outputFormat: this.outputFormat(),
      settings,
    });
    this.lastEntryId.set(entry.id);
  }

  triggerFileImport(input: HTMLInputElement): void {
    input.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.fileImportError.set(null);

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '').trim();
      if (!content) {
        this.fileImportError.set(this.translate.dict().editor.fileImportError);
        return;
      }
      if (content.length > this.maxCharacters) {
        this.text.set(content.slice(0, this.maxCharacters));
        this.fileImportError.set(this.translate.dict().editor.fileTruncated);
      } else {
        this.text.set(content);
      }
    };
    reader.onerror = () => this.fileImportError.set(this.translate.dict().editor.fileImportError);
    reader.readAsText(file);
  }

  formatNumber(value: number): string {
    return value.toLocaleString(this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US');
  }
}
