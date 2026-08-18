import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { SliderComponent } from '../../shared/components/slider/slider.component';
import { DropdownComponent } from '../../shared/components/dropdown/dropdown.component';
import { TtsService } from '../../core/services/tts.service';
import { TranslateService } from '../../core/services/translate.service';
import { VoiceLibraryService } from '../../core/services/voice-library.service';
import { VoicePreviewService, PreviewableVoice } from '../../core/services/voice-preview.service';
import { GenerationHistoryService } from '../../core/services/generation-history.service';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { UpgradeModalService } from '../../core/services/upgrade-modal.service';
import { SeoService } from '../../core/services/seo.service';
import { OutputFormat } from '../../core/models/tts.models';
import { voiceAvatarGradient, voiceInitial } from '../../core/utils/voice-avatar';

const MAX_CHARACTERS = 5000;
const RING_RADIUS = 9;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// There's only one underlying voice model (XTTS v2) and no picker for it —
// an earlier speaking-style selector here didn't produce a clear enough
// difference to be worth the UI. `modelId` is still a required field on the
// synthesize request, so a fixed value is sent along either way.
const DEFAULT_MODEL_ID = 'natural';

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
  readonly outputFormats = computed(() =>
    FORMAT_META.map((id, i) => ({ id, label: this.translate.dict().formats[i] }))
  );

  readonly starterPrompts = computed(() =>
    STARTER_ICONS.map((icon, i) => ({ icon, ...this.translate.dict().starters[i] }))
  );

  readonly text = signal('');
  readonly tipDismissed = signal(false);
  readonly voiceSearch = signal('');
  readonly outputFormat = signal<OutputFormat>('mp3-128');
  readonly speed = signal(1);
  readonly stability = signal(0.5);
  readonly similarity = signal(0.85);
  readonly styleExaggeration = signal(0);
  readonly languageOverride = signal(false);

  readonly characterCount = computed(() => this.text().length);
  readonly maxCharacters = MAX_CHARACTERS;

  readonly fileImportError = signal<string | null>(null);

  readonly ringCircumference = RING_CIRCUMFERENCE;
  readonly planUsagePercent = computed(() => Math.min(100, this.account.usagePercent()));
  readonly ringOffset = computed(
    () => RING_CIRCUMFERENCE * (1 - this.planUsagePercent() / 100)
  );
  readonly charactersRemaining = computed(() =>
    Math.max(0, this.account.characterLimit() - this.account.charactersUsed())
  );

  // Null while there's nothing to report progress on yet (before the POST
  // resolves, or once the job is done) — the button falls back to a plain
  // spinner + "Generating…" for that brief window instead of a percentage.
  readonly generateProgress = computed(() => {
    const entry = this.history.activeEntry();
    if (!entry) {
      return null;
    }
    return this.history.smoothedProgressPercent(entry);
  });

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

    // Reactive, not just read-once in the constructor: the sidebar's
    // "reuse" button navigates to '/app', but if you're already there (the
    // usual case — the sidebar is visible on this very page) Angular
    // doesn't re-create the component for a same-route navigation, so a
    // constructor-only check would silently do nothing.
    effect(
      () => {
        const pending = this.history.consumePendingReuse();
        if (pending) {
          this.text.set(pending.text);
          this.voiceLibrary.selectVoice(pending.voiceId);
        }
      },
      { allowSignalWrites: true }
    );
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

  avatarGradient(hex: string): string {
    return voiceAvatarGradient(hex);
  }

  avatarInitial(name: string): string {
    return voiceInitial(name);
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
      modelId: DEFAULT_MODEL_ID,
      speed: this.speed(),
      stability: this.stability(),
      similarity: this.similarity(),
      styleExaggeration: this.styleExaggeration(),
      languageOverride: this.languageOverride(),
      outputFormat: this.outputFormat(),
    };

    const meta = {
      text: this.text(),
      voiceId: this.voiceLibrary.selectedVoice().id,
      voiceName: this.voiceLibrary.selectedVoice().name,
      voiceDescription: this.voiceLibrary.selectedVoice().description,
      modelId: DEFAULT_MODEL_ID,
      outputFormat: this.outputFormat(),
      settings,
    };

    // synthesize() registers the job with GenerationHistoryService (and
    // makes it the active entry for the persistent player) as soon as the
    // POST resolves — no local player state to manage here.
    this.ttsService.synthesize({ text: this.text(), settings }, meta).subscribe((result) => {
      if (result) {
        // Character usage only actually changes server-side on a real
        // success (the browser-speech fallback path returns null and never
        // touched the backend), so only re-sync the quota then.
        this.auth.refreshCurrentUser().subscribe();
      }
    });
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
