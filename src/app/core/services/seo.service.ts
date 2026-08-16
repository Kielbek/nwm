import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

const SITE_URL = 'https://nwm.app';
const SITE_NAME = 'NWM';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

export interface SeoConfig {
  title: string;
  description: string;
  path?: string;
  noindex?: boolean;
  image?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  update(config: SeoConfig): void {
    const url = `${SITE_URL}${config.path ?? ''}`;
    const image = config.image ?? DEFAULT_IMAGE;

    this.titleService.setTitle(config.title);

    this.setTag('name', 'description', config.description);
    this.setTag('name', 'robots', config.noindex ? 'noindex, nofollow' : 'index, follow');

    this.setTag('property', 'og:type', 'website');
    this.setTag('property', 'og:site_name', SITE_NAME);
    this.setTag('property', 'og:url', url);
    this.setTag('property', 'og:title', config.title);
    this.setTag('property', 'og:description', config.description);
    this.setTag('property', 'og:image', image);

    this.setTag('name', 'twitter:card', 'summary_large_image');
    this.setTag('name', 'twitter:title', config.title);
    this.setTag('name', 'twitter:description', config.description);
    this.setTag('name', 'twitter:image', image);

    this.setCanonical(url);
  }

  /** For private/app pages: sets title + noindex only, no canonical/OG rewrite. */
  setPrivateTitle(title: string): void {
    this.titleService.setTitle(`${title} — ${SITE_NAME}`);
    this.setTag('name', 'robots', 'noindex, nofollow');
  }

  setJsonLd(id: string, data: object): void {
    this.removeJsonLd(id);
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.text = JSON.stringify(data);
    this.document.head.appendChild(script);
  }

  removeJsonLd(id: string): void {
    this.document.getElementById(id)?.remove();
  }

  private setTag(attr: 'name' | 'property', key: string, content: string): void {
    this.meta.updateTag({ [attr]: key, content });
  }

  private setCanonical(url: string): void {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
