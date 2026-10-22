import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { authGuard, guestGuard } from './auth.guards';
import { AuthService } from './auth.service';

describe('auth guards', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  const run = (guard: typeof authGuard) =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  const url = (result: unknown) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  function signIn() {
    TestBed.inject(AuthService).loadSession().subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush({ user: { id: 1, email: 'ana@techx.com' } });
  }

  it('sends someone without a session from the task list to the sign-in page', () => {
    expect(url(run(authGuard))).toBe('/login');
  });

  it('lets a signed-in user into the task list', () => {
    signIn();
    expect(run(authGuard)).toBe(true);
  });

  it('lets someone without a session open the sign-in and sign-up pages', () => {
    expect(run(guestGuard)).toBe(true);
  });

  it('sends a signed-in user from the sign-in and sign-up pages to the task list', () => {
    signIn();
    expect(url(run(guestGuard))).toBe('/');
  });
});
