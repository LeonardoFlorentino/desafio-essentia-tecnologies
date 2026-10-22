import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

const user = { id: 1, email: 'ana@techx.com' };
const credentials = { email: 'ana@techx.com', password: 'correct-horse' };

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts signed out', () => {
    expect(service.currentUser()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('restores the session from the cookie through GET /api/auth/me', () => {
    service.loadSession().subscribe();
    http.expectOne('/api/auth/me').flush({ user });

    expect(service.currentUser()).toEqual(user);
    expect(service.isLoggedIn()).toBe(true);
  });

  it('treats a rejected or failed session check as signed out', () => {
    let result: unknown = 'not set';
    service.loadSession().subscribe((value) => (result = value));
    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(result).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('signs in with POST /api/auth/login', () => {
    service.login(credentials).subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(credentials);
    req.flush({ user });

    expect(service.currentUser()).toEqual(user);
  });

  it('signs up with POST /api/auth/register and is signed in right away', () => {
    service.register(credentials).subscribe();
    const req = http.expectOne('/api/auth/register');
    expect(req.request.method).toBe('POST');
    req.flush({ user }, { status: 201, statusText: 'Created' });

    expect(service.currentUser()).toEqual(user);
  });

  it('signs out with POST /api/auth/logout', () => {
    service.login(credentials).subscribe();
    http.expectOne('/api/auth/login').flush({ user });

    service.logout().subscribe();
    const req = http.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(service.isLoggedIn()).toBe(false);
  });

  it('signs out locally even when the logout request fails', () => {
    service.login(credentials).subscribe();
    http.expectOne('/api/auth/login').flush({ user });

    service.logout().subscribe();
    http.expectOne('/api/auth/logout').flush(null, { status: 502, statusText: 'Bad Gateway' });

    expect(service.isLoggedIn()).toBe(false);
  });

  it('never keeps anything in localStorage', () => {
    service.login(credentials).subscribe();
    http.expectOne('/api/auth/login').flush({ user });
    expect(localStorage.length).toBe(0);
  });
});
