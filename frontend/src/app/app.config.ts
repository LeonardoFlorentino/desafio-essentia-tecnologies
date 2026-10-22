import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { sessionExpiredInterceptor } from './auth/session-expired.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Route data (e.g. `mode` of the auth page) arrives as component inputs.
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([sessionExpiredInterceptor])),
    // Knows who is signed in (from the session cookie) before the first screen shows.
    provideAppInitializer(() => inject(AuthService).loadSession()),
  ],
};
