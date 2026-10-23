import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthMode, AuthPage } from './auth-page';
import { AuthService } from './auth.service';

describe('AuthPage', () => {
  let fixture: ComponentFixture<AuthPage>;
  let http: HttpTestingController;
  let page: HTMLElement;
  let navigate: ReturnType<typeof vi.spyOn>;

  async function open(mode: AuthMode) {
    TestBed.configureTestingModule({
      imports: [AuthPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(AuthPage);
    fixture.componentRef.setInput('mode', mode);
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    page = fixture.nativeElement;
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  function type(selector: string, value: string) {
    const field = page.querySelector<HTMLInputElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
  }

  async function submit() {
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  describe('sign in', () => {
    beforeEach(() => open('login'));

    it('shows the sign-in form with a link to create an account', () => {
      expect(page.querySelector('h1')?.textContent).toBe('Entrar');
      expect(page.querySelector('#auth-password')!.getAttribute('autocomplete')).toBe(
        'current-password',
      );
      expect(page.querySelector('a')?.getAttribute('href')).toBe('/register');
    });

    it('explains that the session expired when sent here by ?expired=true', async () => {
      fixture.componentRef.setInput('expired', 'true');
      await fixture.whenStable();

      expect(page.querySelector('[role=status]')?.textContent).toContain('Sua sessão expirou.');
    });

    it('signs in and goes to the task list', async () => {
      type('#auth-email', ' ana@techx.com ');
      type('#auth-password', 'correct-horse');
      await submit();

      const req = http.expectOne('/api/auth/login');
      expect(req.request.body).toEqual({ email: 'ana@techx.com', password: 'correct-horse' });
      req.flush({ user: { id: 1, email: 'ana@techx.com' } });
      await fixture.whenStable();

      expect(TestBed.inject(AuthService).currentUser()?.email).toBe('ana@techx.com');
      expect(navigate).toHaveBeenCalledWith('/');
    });

    it('explains wrong credentials and stays on the page', async () => {
      type('#auth-email', 'ana@techx.com');
      type('#auth-password', 'wrong-password');
      await submit();
      http.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });
      await fixture.whenStable();

      expect(page.querySelector('[role=alert]')?.textContent).toContain(
        'E-mail ou senha inválidos.',
      );
      expect(navigate).not.toHaveBeenCalled();
    });

    it('asks to wait after too many attempts (429)', async () => {
      type('#auth-email', 'ana@techx.com');
      type('#auth-password', 'wrong-password');
      await submit();
      http
        .expectOne('/api/auth/login')
        .flush(null, { status: 429, statusText: 'Too Many Requests' });
      await fixture.whenStable();

      expect(page.querySelector('[role=alert]')?.textContent).toContain(
        'Muitas tentativas seguidas. Aguarde um minuto e tente novamente.',
      );
    });

    it('does not send an invalid email', async () => {
      type('#auth-email', 'not-an-email');
      type('#auth-password', 'whatever-123');
      await submit();

      http.expectNone('/api/auth/login');
      expect(page.querySelector('#auth-email-error')?.textContent).toContain(
        'Informe um e-mail válido.',
      );
    });

    it('says when the server cannot be reached', async () => {
      type('#auth-email', 'ana@techx.com');
      type('#auth-password', 'correct-horse');
      await submit();
      http.expectOne('/api/auth/login').flush(null, { status: 502, statusText: 'Bad Gateway' });
      await fixture.whenStable();

      expect(page.querySelector('[role=alert]')?.textContent).toContain(
        'Sem conexão com o servidor',
      );
    });
  });

  describe('sign up', () => {
    beforeEach(() => open('register'));

    it('shows the sign-up form with the password rule and a link to sign in', () => {
      expect(page.querySelector('h1')?.textContent).toBe('Criar conta');
      expect(page.querySelector('#auth-password')!.getAttribute('autocomplete')).toBe(
        'new-password',
      );
      expect(page.textContent).toContain('Mínimo de 8 caracteres.');
      expect(page.querySelector('a')?.getAttribute('href')).toBe('/login');
    });

    it('creates the account and goes to the task list', async () => {
      type('#auth-email', 'ana@techx.com');
      type('#auth-password', 'correct-horse');
      await submit();

      http
        .expectOne('/api/auth/register')
        .flush({ user: { id: 1, email: 'ana@techx.com' } }, { status: 201, statusText: 'Created' });
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith('/');
    });

    it('does not send a password shorter than 8 characters', async () => {
      type('#auth-email', 'ana@techx.com');
      type('#auth-password', 'short');
      await submit();

      http.expectNone('/api/auth/register');
      expect(page.textContent).toContain('A senha precisa de pelo menos 8 caracteres.');
    });

    it('explains an email that is already registered', async () => {
      type('#auth-email', 'ana@techx.com');
      type('#auth-password', 'correct-horse');
      await submit();
      http.expectOne('/api/auth/register').flush(null, { status: 409, statusText: 'Conflict' });
      await fixture.whenStable();

      expect(page.querySelector('[role=alert]')?.textContent).toContain(
        'Este e-mail já está cadastrado.',
      );
    });
  });
});
