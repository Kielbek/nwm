import { Injectable, computed, signal } from '@angular/core';
import { TranslateService } from './translate.service';

interface VoiceMeta {
  id: string;
  avatarColor: string;
}

const VOICE_META: VoiceMeta[] = [
  { id: 'marek', avatarColor: '#c7d2fe' },
  { id: 'ania', avatarColor: '#fde68a' },
  { id: 'kuba', avatarColor: '#bfdbfe' },
  { id: 'zosia', avatarColor: '#fbcfe8' },
  { id: 'tomasz', avatarColor: '#e7e5e4' },
];

/**
 * Shared source of truth for the voice list and the currently selected
 * voice, so the editor's voice dropdown and the dedicated /voices page
 * stay in sync.
 */
@Injectable({ providedIn: 'root' })
export class VoiceLibraryService {
  readonly selectedVoiceId = signal(VOICE_META[0].id);

  readonly voices = computed(() =>
    VOICE_META.map((meta, i) => ({ ...meta, ...this.translate.dict().voices[i] }))
  );

  readonly selectedVoice = computed(
    () => this.voices().find((v) => v.id === this.selectedVoiceId()) ?? this.voices()[0]
  );

  constructor(private readonly translate: TranslateService) {}

  selectVoice(id: string): void {
    this.selectedVoiceId.set(id);
  }
}
