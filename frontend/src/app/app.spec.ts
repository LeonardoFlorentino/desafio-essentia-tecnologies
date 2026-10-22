import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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

  it('renders the application title', async () => {
    expect((await render()).querySelector('h1')?.textContent).toContain('TechX Tasks');
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
});
