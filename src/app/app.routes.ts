import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing-page.component').then((m) => m.LandingPageComponent),
  },
  {
    path: 'app',
    loadComponent: () =>
      import('./layout/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
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
        path: 'history',
        loadComponent: () =>
          import('./features/history/history-page.component').then(
            (m) => m.HistoryPageComponent
          ),
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
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile-page.component').then(
            (m) => m.ProfilePageComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings-page.component').then(
            (m) => m.SettingsPageComponent
          ),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found-page.component').then(
        (m) => m.NotFoundPageComponent
      ),
  },
];
