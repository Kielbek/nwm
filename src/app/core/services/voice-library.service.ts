import { Injectable, computed, signal } from '@angular/core';
import { TranslateService } from './translate.service';

interface VoiceMeta {
  id: string;
  avatarColor: string;
  previewPitch: number;
  previewRate: number;
}

const VOICE_META: VoiceMeta[] = [
  { id: 'marek', avatarColor: '#c7d2fe', previewPitch: 0.85, previewRate: 1 },
  { id: 'ania', avatarColor: '#fde68a', previewPitch: 1.05, previewRate: 0.9 },
  { id: 'kuba', avatarColor: '#bfdbfe', previewPitch: 1.1, previewRate: 1.15 },
  { id: 'zosia', avatarColor: '#fbcfe8', previewPitch: 1.2, previewRate: 0.95 },
  { id: 'tomasz', avatarColor: '#e7e5e4', previewPitch: 1, previewRate: 1 },
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
