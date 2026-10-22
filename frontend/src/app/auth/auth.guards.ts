import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// The session was already checked at startup (provideAppInitializer), so these read a signal
// instead of calling the API on every navigation.

/** Pages that need a session: without one, go to the sign-in page. */
export const authGuard: CanActivateFn = () =>
  inject(AuthService).isLoggedIn() || inject(Router).createUrlTree(['/login']);

/** Sign-in and sign-up pages: someone already signed in goes straight to the tasks. */
export const guestGuard: CanActivateFn = () =>
  !inject(AuthService).isLoggedIn() || inject(Router).createUrlTree(['/']);
