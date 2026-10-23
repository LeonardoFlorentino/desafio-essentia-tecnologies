import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './auth/auth.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the product mark and name, linking home (each screen has its own h1)', async () => {
    const brand = (await render()).querySelector<HTMLAnchorElement>('.app-header__brand')!;
    expect(brand.textContent).toContain('TechX Tasks');
    expect(brand.getAttribute('href')).toBe('/');
    expect((await render()).querySelector('header h1')).toBeNull();
  });

  it('offers to sign in when nobody is signed in', async () => {
    expect((await render()).querySelector('nav a')?.textContent).toContain('Entrar');
  });

  it('shows who is signed in', async () => {
    TestBed.inject(AuthService).loadSession().subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush({ user: { id: 1, email: 'ana@techx.com' } });

    const page = await render();
    expect(page.querySelector('nav')?.textContent).toContain('ana@techx.com');
    expect(page.querySelector('nav a')).toBeNull();
  });

  it('signs out from the header and goes to the sign-in page', async () => {
    const http = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    TestBed.inject(AuthService).loadSession().subscribe();
    http.expectOne('/api/auth/me').flush({ user: { id: 1, email: 'ana@techx.com' } });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('nav button')!.click();
    http.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/login');
    expect((fixture.nativeElement as HTMLElement).querySelector('nav a')?.textContent).toContain(
      'Entrar',
    );
  });
});
