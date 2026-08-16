import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Dictionary } from '../i18n/dictionary';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';

export type Lang = 'pl' | 'en';

const STORAGE_KEY = 'nwm-lang';
const DICTIONARIES: Record<Lang, Dictionary> = { pl, en };

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly document = inject(DOCUMENT);

  readonly lang = signal<Lang>(this.readStored());
  readonly dict = computed<Dictionary>(() => DICTIONARIES[this.lang()]);

  constructor() {
    effect(() => {
      this.document.documentElement.lang = this.lang();
    });
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  private readStored(): Lang {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'pl' || stored === 'en' ? stored : 'pl';
  }
}
