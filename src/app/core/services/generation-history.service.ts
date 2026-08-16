import { Injectable, signal } from '@angular/core';
import { OutputFormat, TtsSettings } from '../models/tts.models';

export type GenerationFeedback = 'up' | 'down' | null;

export interface GenerationEntry {
  id: string;
  text: string;
  voiceId: string;
  voiceName: string;
  voiceDescription: string;
  modelId: string;
  modelName: string;
  outputFormat: OutputFormat;
  settings: TtsSettings;
  createdAt: string;
  feedback: GenerationFeedback;
}

export interface PendingReuse {
  text: string;
  voiceId: string;
}

const STORAGE_KEY = 'nwm-generation-history';
const MAX_ENTRIES = 50;

/**
 * Records every text-to-speech generation locally (there's no backend to
 * persist real audio files to, so this stores the text + settings used and
 * can only "replay" by re-running the same synthesis, not stream a saved
 * clip). Capped and persisted to localStorage.
 */
@Injectable({ providedIn: 'root' })
export class GenerationHistoryService {
  readonly entries = signal<GenerationEntry[]>(this.readStored());
  readonly pendingReuse = signal<PendingReuse | null>(null);

  add(entry: Omit<GenerationEntry, 'id' | 'createdAt' | 'feedback'>): GenerationEntry {
    const record: GenerationEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      feedback: null,
    };
    const next = [record, ...this.entries()].slice(0, MAX_ENTRIES);
    this.entries.set(next);
    this.persist(next);
    return record;
  }

  setFeedback(id: string, feedback: GenerationFeedback): void {
    const next = this.entries().map((entry) =>
      entry.id === id ? { ...entry, feedback } : entry
    );
    this.entries.set(next);
    this.persist(next);
  }

  remove(id: string): void {
    const next = this.entries().filter((entry) => entry.id !== id);
    this.entries.set(next);
    this.persist(next);
  }

  clear(): void {
    this.entries.set([]);
    this.persist([]);
  }

  reuse(entry: GenerationEntry): void {
    this.pendingReuse.set({ text: entry.text, voiceId: entry.voiceId });
  }

  consumePendingReuse(): PendingReuse | null {
    const pending = this.pendingReuse();
    if (pending) {
      this.pendingReuse.set(null);
    }
    return pending;
  }

  private persist(entries: GenerationEntry[]): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  private readStored(): GenerationEntry[] {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<GenerationEntry>[]) : [];
      return parsed.map((entry) => ({
        ...entry,
        voiceDescription: entry.voiceDescription ?? '',
        feedback: entry.feedback ?? null,
      })) as GenerationEntry[];
    } catch {
      return [];
    }
  }
}
