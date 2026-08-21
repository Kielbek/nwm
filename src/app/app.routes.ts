import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing-page.component').then((m) => m.LandingPageComponent),
  },
  {
    path: 'pricing',
    loadComponent: () =>
      import('./features/pricing/pricing-page.component').then((m) => m.PricingPageComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register-page.component').then((m) => m.RegisterPageComponent),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password-page.component').then(
        (m) => m.ForgotPasswordPageComponent
      ),
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/reset-password-page.component').then(
        (m) => m.ResetPasswordPageComponent
      ),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/auth/verify-email-page.component').then(
        (m) => m.VerifyEmailPageComponent
      ),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/auth-callback-page.component').then(
        (m) => m.AuthCallbackPageComponent
      ),
  },
  {
    path: 'app',
    canActivate: [authGuard],
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
        path: 'api-keys',
        loadComponent: () =>
          import('./features/api-keys/api-keys-page.component').then(
            (m) => m.ApiKeysPageComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings-page.component').then(
            (m) => m.SettingsPageComponent
          ),
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./features/checkout/checkout-page.component').then(
            (m) => m.CheckoutPageComponent
          ),
      },
      {
        path: 'checkout/success',
        loadComponent: () =>
          import('./features/checkout/checkout-success-page.component').then(
            (m) => m.CheckoutSuccessPageComponent
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
