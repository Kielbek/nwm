import { Injectable, computed } from '@angular/core';
import { TranslateService } from './translate.service';
import { ApiDocsContent } from '../content/api-docs.types';
import { apiDocsPl } from '../content/api-docs.pl';
import { apiDocsEn } from '../content/api-docs.en';

@Injectable({ providedIn: 'root' })
export class ApiDocsService {
  readonly content = computed<ApiDocsContent>(() =>
    this.translate.lang() === 'pl' ? apiDocsPl : apiDocsEn
  );

  constructor(private readonly translate: TranslateService) {}
}
