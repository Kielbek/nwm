import { Injectable, computed } from '@angular/core';
import { TranslateService } from './translate.service';
import { DocsContent } from '../content/docs.types';
import { docsPl } from '../content/docs.pl';
import { docsEn } from '../content/docs.en';

@Injectable({ providedIn: 'root' })
export class DocsService {
  readonly content = computed<DocsContent>(() =>
    this.translate.lang() === 'pl' ? docsPl : docsEn
  );

  constructor(private readonly translate: TranslateService) {}
}
