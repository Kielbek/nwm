import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  effect,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { DocsService } from '../../core/services/docs.service';
import { TranslateService } from '../../core/services/translate.service';
import { DocCategory } from '../../core/content/docs.types';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-docs-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  templateUrl: './docs-page.component.html',
  styleUrl: './docs-page.component.scss',
})
export class DocsPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scrollRoot') scrollRootRef?: ElementRef<HTMLElement>;
  @ViewChildren('articleEl') articleEls?: QueryList<ElementRef<HTMLElement>>;

  readonly search = signal('');
  readonly activeArticleId = signal<string | null>(null);
  readonly copiedId = signal<string | null>(null);

  readonly filteredCategories = computed<DocCategory[]>(() => {
    const query = this.search().trim().toLowerCase();
    const categories = this.docs.content().categories;
    if (!query) {
      return categories;
    }
    return categories
      .map((category) => ({
        ...category,
        articles: category.articles.filter((article) =>
          article.title.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.articles.length > 0);
  });

  private observer?: IntersectionObserver;
  private copiedTimeout?: ReturnType<typeof setTimeout>;
  private suppressObserverUntil = 0;

  constructor(readonly docs: DocsService, readonly translate: TranslateService, seo: SeoService) {
    effect(() => seo.setPrivateTitle(this.translate.dict().seo.docsTitle));
  }

  ngAfterViewInit(): void {
    this.setupObserver();
    this.articleEls?.changes.subscribe(() => this.setupObserver());

    const hash = location.hash.slice(1);
    if (hash) {
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ block: 'start' }), 0);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
  }

  scrollTo(id: string): void {
    this.activeArticleId.set(id);
    this.suppressObserverUntil = Date.now() + 700;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  copyLink(id: string): void {
    const url = `${location.origin}${location.pathname}#${id}`;
    navigator.clipboard?.writeText(url).then(() => {
      this.copiedId.set(id);
      if (this.copiedTimeout) {
        clearTimeout(this.copiedTimeout);
      }
      this.copiedTimeout = setTimeout(() => this.copiedId.set(null), 1800);
    });
  }

  private setupObserver(): void {
    this.observer?.disconnect();
    if (!this.articleEls || !this.scrollRootRef) {
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < this.suppressObserverUntil) {
          return;
        }
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) {
          this.activeArticleId.set(visible[0].target.id);
        }
      },
      { root: this.scrollRootRef.nativeElement, rootMargin: '-72px 0px -65% 0px', threshold: 0 }
    );
    this.articleEls.forEach((el) => this.observer!.observe(el.nativeElement));
  }
}
