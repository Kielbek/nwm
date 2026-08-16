import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { SliderComponent } from '../../shared/components/slider/slider.component';
import { DropdownComponent } from '../../shared/components/dropdown/dropdown.component';
import { TtsService } from '../../core/services/tts.service';
import { OutputFormat, StarterPrompt, TtsModel, Voice } from '../../core/models/tts.models';

const MAX_CHARACTERS = 5000;

@Component({
  selector: 'app-text-to-speech',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent, SliderComponent, DropdownComponent],
  templateUrl: './text-to-speech.component.html',
  styleUrl: './text-to-speech.component.scss',
})
export class TextToSpeechComponent {
  readonly voices: Voice[] = [
    { id: 'adam', name: 'Adam', description: 'Dominant, Firm', avatarColor: '#e7e5e4' },
    { id: 'rachel', name: 'Rachel', description: 'Calm, Narration', avatarColor: '#fde68a' },
    { id: 'domi', name: 'Domi', description: 'Confident, Energetic', avatarColor: '#bfdbfe' },
    { id: 'bella', name: 'Bella', description: 'Soft, Friendly', avatarColor: '#fbcfe8' },
    { id: 'antoni', name: 'Antoni', description: 'Well-rounded, Warm', avatarColor: '#c7d2fe' },
  ];

  readonly models: TtsModel[] = [
    { id: 'v3', badge: 'V3', name: 'Eleven v3 (alpha)' },
    { id: 'v2', badge: 'V2', name: 'Eleven Multilingual v2' },
    { id: 'turbo', badge: 'T', name: 'Eleven Turbo v2.5' },
    { id: 'flash', badge: 'F', name: 'Eleven Flash v2.5' },
  ];

  readonly outputFormats: { id: OutputFormat; label: string }[] = [
    { id: 'mp3-128', label: 'MP3 44,1 kHz (128kbps)' },
    { id: 'mp3-192', label: 'MP3 44,1 kHz (192kbps)' },
    { id: 'wav', label: 'WAV 44,1 kHz (bezstratny)' },
    { id: 'ogg', label: 'OGG 44,1 kHz' },
  ];

  readonly starterPrompts: StarterPrompt[] = [
    { icon: 'templates', label: 'Opowiedz historię', text: 'Dawno, dawno temu, w małej wiosce otoczonej górami, żyła dziewczyna, która marzyła o locie...' },
    { icon: 'sparkle', label: 'Opowiedz głupi żart', text: 'Dlaczego programista pomylił Halloween z Bożym Narodzeniem? Ponieważ Oct 31 == Dec 25.' },
    { icon: 'voices', label: 'Nagraj reklamę', text: 'Odkryj nowy smak lata — orzeźwiający, naturalny, dostępny już dziś w Twoim sklepie!' },
    { icon: 'flows', label: 'Mów w różnych językach', text: 'Hello! Cześć! Hola! Bonjour! Ciao! Witamy w naszej aplikacji.' },
    { icon: 'studio', label: 'Wyreżyseruj dramatyczną scenę filmową', text: 'Drzwi skrzypnęły. Cisza. A potem, z mroku, dobiegł szept...' },
    { icon: 'sound-effects', label: 'Usłysz postać z gry wideo', text: 'Witaj, podróżniku. Twoja przygoda dopiero się zaczyna.' },
    { icon: 'music', label: 'Przedstaw swój podcast', text: 'Witajcie w kolejnym odcinku! Dziś porozmawiamy o czymś, co zmieni sposób, w jaki myślicie o technologii.' },
    { icon: 'speech-to-text', label: 'Poprowadź zajęcia medytacyjne', text: 'Usiądź wygodnie, zamknij oczy i weź głęboki oddech...' },
  ];

  readonly text = signal('');
  readonly selectedVoiceId = signal(this.voices[0].id);
  readonly selectedModelId = signal(this.models[1].id);
  readonly outputFormat = signal<OutputFormat>('mp3-128');
  readonly speed = signal(1);
  readonly stability = signal(0.5);
  readonly similarity = signal(0.85);
  readonly styleExaggeration = signal(0);
  readonly languageOverride = signal(false);

  readonly characterCount = computed(() => this.text().length);
  readonly maxCharacters = MAX_CHARACTERS;

  readonly selectedVoice = computed(
    () => this.voices.find((v) => v.id === this.selectedVoiceId()) ?? this.voices[0]
  );
  readonly selectedModel = computed(
    () => this.models.find((m) => m.id === this.selectedModelId()) ?? this.models[0]
  );
  readonly selectedFormat = computed(
    () => this.outputFormats.find((f) => f.id === this.outputFormat()) ?? this.outputFormats[0]
  );

  constructor(readonly ttsService: TtsService) {}

  applyStarterPrompt(prompt: StarterPrompt): void {
    this.text.set(prompt.text);
  }

  selectVoice(voice: Voice, dropdown: DropdownComponent): void {
    this.selectedVoiceId.set(voice.id);
    dropdown.close();
  }

  selectModel(model: TtsModel, dropdown: DropdownComponent): void {
    this.selectedModelId.set(model.id);
    dropdown.close();
  }

  selectFormat(format: OutputFormat, dropdown: DropdownComponent): void {
    this.outputFormat.set(format);
    dropdown.close();
  }

  generate(): void {
    if (!this.text().trim() || this.ttsService.isSynthesizing()) {
      return;
    }
    this.ttsService
      .synthesize({
        text: this.text(),
        settings: {
          voiceId: this.selectedVoiceId(),
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
