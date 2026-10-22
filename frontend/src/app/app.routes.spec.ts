import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { AuthService } from './auth/auth.service';

/** The real route table, wired as in app.config.ts: which page each address shows, and to whom. */
describe('app routes', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  function signIn() {
    TestBed.inject(AuthService).loadSession().subscribe();
    http.expectOne('/api/auth/me').flush({ user: { id: 1, email: 'ana@techx.com' } });
  }

  const url = () => TestBed.inject(Router).url;
  const heading = () => harness.routeNativeElement?.querySelector('h2')?.textContent?.trim();

  describe('without a session', () => {
    it.each(['/', '/?status=pending', '/no-such-page'])(
      'sends %s to the sign-in page',
      async (path) => {
        await harness.navigateByUrl(path);
        expect(url()).toBe('/login');
        expect(heading()).toBe('Entrar');
      },
    );

    it('shows the sign-up form at /register (mode comes from the route data)', async () => {
      await harness.navigateByUrl('/register');
      expect(url()).toBe('/register');
      expect(heading()).toBe('Criar conta');
    });
  });

  describe('signed in', () => {
    beforeEach(() => signIn());

    it('opens the task list at /', async () => {
      await harness.navigateByUrl('/');
      http.expectOne('/api/tasks').flush([]);
      expect(url()).toBe('/');
      expect(harness.routeNativeElement?.textContent).toContain('Nova tarefa');
    });

    it.each(['/login', '/register'])('sends %s back to the task list', async (path) => {
      await harness.navigateByUrl(path);
      http.expectOne('/api/tasks').flush([]);
      expect(url()).toBe('/');
    });
  });
});
