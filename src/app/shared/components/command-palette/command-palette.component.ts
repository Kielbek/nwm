import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent, IconName } from '../icon/icon.component';
import { CommandPaletteService } from '../../../core/services/command-palette.service';
import { TranslateService } from '../../../core/services/translate.service';
import { VoiceLibraryService } from '../../../core/services/voice-library.service';
import { DocsService } from '../../../core/services/docs.service';
import { FileManagerModalService } from '../../../core/services/file-manager-modal.service';

interface PaletteItem {
  icon: IconName;
  label: string;
  sublabel?: string;
  action: () => void;
}

interface PaletteGroup {
  title: string;
  items: PaletteItem[];
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss',
})
export class CommandPaletteComponent {
  @ViewChild('queryInput') queryInputRef?: ElementRef<HTMLInputElement>;

  readonly query = signal('');
  readonly activeIndex = signal(0);

  readonly groups = computed<PaletteGroup[]>(() => {
    const q = this.query().trim().toLowerCase();
    const dict = this.translate.dict();

    const allPages: PaletteItem[] = [
      { icon: 'text-to-speech', label: dict.sidebar.nav, action: () => this.goTo('/app') },
      { icon: 'voices', label: dict.sidebar.voices, action: () => this.goTo('/app/voices') },
      { icon: 'folder', label: dict.sidebar.history, action: () => this.openFileManager() },
      { icon: 'star', label: dict.header.feedback, action: () => this.goTo('/app/feedback') },
      { icon: 'book', label: dict.header.docs, action: () => this.goTo('/app/docs') },
      { icon: 'edit', label: dict.header.profile, action: () => this.goTo('/app/profile') },
      { icon: 'settings', label: dict.sidebar.settings, action: () => this.goTo('/app/settings') },
    ];
    const pages = allPages.filter((item) => !q || item.label.toLowerCase().includes(q));

    const voices: PaletteItem[] = this.voiceLibrary
      .voices()
      .filter(
        (v) =>
          !q || v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
      )
      .map((v) => ({
        icon: 'voices' as IconName,
        label: v.name,
        sublabel: v.description,
        action: () => this.selectVoice(v.id),
      }));

    const docs: PaletteItem[] = this.docsService
      .content()
      .categories.flatMap((category) =>
        category.articles
          .filter((article) => !q || article.title.toLowerCase().includes(q))
          .map((article) => ({
            icon: category.icon,
            label: article.title,
            sublabel: category.title,
            action: () => this.goToDoc(article.id),
          }))
      )
      .slice(0, 8);

    const groups: PaletteGroup[] = [];
    if (pages.length) {
      groups.push({ title: dict.commandPalette.pagesGroup, items: pages });
    }
    if (voices.length) {
      groups.push({ title: dict.commandPalette.voicesGroup, items: voices });
    }
    if (docs.length) {
      groups.push({ title: dict.commandPalette.docsGroup, items: docs });
    }
    return groups;
  });

  readonly flatItems = computed(() => this.groups().flatMap((group) => group.items));

  constructor(
    readonly palette: CommandPaletteService,
    readonly translate: TranslateService,
    private readonly voiceLibrary: VoiceLibraryService,
    private readonly docsService: DocsService,
    private readonly fileManagerModal: FileManagerModalService,
    private readonly router: Router
  ) {
    effect(() => {
      if (this.palette.isOpen()) {
        setTimeout(() => this.queryInputRef?.nativeElement.focus(), 0);
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const isMeta = event.metaKey || event.ctrlKey;
    if (isMeta && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.palette.toggle();
      if (this.palette.isOpen()) {
        this.resetSearch();
      }
      return;
    }

    if (!this.palette.isOpen()) {
      return;
    }

    if (event.key === 'Escape') {
      this.palette.close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveActive(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveActive(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.flatItems()[this.activeIndex()]?.action();
    }
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
  }

  onBackdropClick(): void {
    this.palette.close();
  }

  selectItem(item: PaletteItem): void {
    item.action();
  }

  globalIndex(groupIndex: number, itemIndex: number): number {
    let index = itemIndex;
    for (let i = 0; i < groupIndex; i++) {
      index += this.groups()[i].items.length;
    }
    return index;
  }

  private moveActive(delta: number): void {
    const count = this.flatItems().length;
    if (!count) {
      return;
    }
    this.activeIndex.set((this.activeIndex() + delta + count) % count);
  }

  private resetSearch(): void {
    this.query.set('');
    this.activeIndex.set(0);
  }

  private goTo(route: string): void {
    this.router.navigateByUrl(route);
    this.palette.close();
  }

  private openFileManager(): void {
    this.palette.close();
    this.fileManagerModal.open();
  }

  private goToDoc(articleId: string): void {
    this.router.navigate(['/app/docs'], { fragment: articleId });
    this.palette.close();
  }

  private selectVoice(voiceId: string): void {
    this.voiceLibrary.selectVoice(voiceId);
    this.router.navigateByUrl('/app');
    this.palette.close();
  }
}
