import { IconName } from '../../shared/components/icon/icon.component';

export type DocBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'note'; text: string }
  | { type: 'kbd'; keys: string; text: string };

export interface DocArticle {
  id: string;
  title: string;
  blocks: DocBlock[];
}

export interface DocCategory {
  id: string;
  title: string;
  icon: IconName;
  articles: DocArticle[];
}

export interface DocsContent {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  searchEmpty: string;
  copyLink: string;
  linkCopied: string;
  categories: DocCategory[];
}
