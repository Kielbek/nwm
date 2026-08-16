import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/text-to-speech/text-to-speech.component').then(
        (m) => m.TextToSpeechComponent
      ),
  },
  {
    path: 'voices',
    loadComponent: () =>
      import('./features/voices/voices-page.component').then((m) => m.VoicesPageComponent),
  },
  {
    path: 'feedback',
    loadComponent: () =>
      import('./features/feedback/feedback-page.component').then(
        (m) => m.FeedbackPageComponent
      ),
  },
  {
    path: 'docs',
    loadComponent: () =>
      import('./features/docs/docs-page.component').then((m) => m.DocsPageComponent),
  },
  { path: '**', redirectTo: '' },
];
