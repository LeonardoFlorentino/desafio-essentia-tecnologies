import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { sessionExpiredInterceptor } from './session-expired.interceptor';

describe('sessionExpiredInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    auth.loadSession().subscribe();
    http.expectOne('/api/auth/me').flush({ user: { id: 1, email: 'ana@techx.com' } });
  });

  afterEach(() => http.verify());

  const unauthorized = { status: 401, statusText: 'Unauthorized' };

  it('signs the user out and goes to the sign-in page when a task call gets 401', () => {
    let failed = false;
    client.get('/api/tasks').subscribe({ error: () => (failed = true) });
    http.expectOne('/api/tasks').flush(null, unauthorized);

    expect(auth.isLoggedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expired: true } });
    expect(failed).toBe(true); // the caller still sees the error
  });

  it('leaves 401 from the auth endpoints alone (wrong password is not an expired session)', () => {
    client.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    http.expectOne('/api/auth/login').flush(null, unauthorized);

    expect(auth.isLoggedIn()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves other errors alone', () => {
    client.get('/api/tasks').subscribe({ error: () => undefined });
    http.expectOne('/api/tasks').flush(null, { status: 500, statusText: 'Server Error' });

    expect(auth.isLoggedIn()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});
