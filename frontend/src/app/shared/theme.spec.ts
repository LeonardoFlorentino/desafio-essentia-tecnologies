import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme';

/** A system colour preference the test can change (jsdom has no matchMedia). */
function fakeSystem(dark: boolean) {
  const listeners: ((event: { matches: boolean }) => void)[] = [];
  const query = {
    matches: dark,
    addEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
      listeners.push(listener),
  };
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => query });
  return (nowDark: boolean) => {
    query.matches = nowDark;
    listeners.forEach((listener) => listener({ matches: nowDark }));
  };
}

describe('ThemeService', () => {
  const root = document.documentElement;

  function create() {
    const service = TestBed.inject(ThemeService);
    TestBed.tick(); // runs the effect that applies the theme to <html>
    return service;
  }

  afterEach(() => {
    localStorage.clear();
    delete root.dataset['theme'];
    document.querySelector('meta[name="theme-color"]')?.remove();
    delete (window as Partial<Window>).matchMedia;
  });

  it('follows the system when nothing was picked, leaving the switching to the CSS', () => {
    fakeSystem(true);
    const service = create();

    expect(service.theme()).toBe('dark');
    expect(root.dataset['theme']).toBeUndefined();
    expect(document.querySelector('meta[name="theme-color"]')).not.toBeNull();
  });

  it('saves a choice and marks <html> with it', () => {
    fakeSystem(false);
    const service = create();

    service.toggle();
    TestBed.tick();

    expect(service.theme()).toBe('dark');
    expect(root.dataset['theme']).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('goes back to following the system when the choice equals it', () => {
    const systemChangesTo = fakeSystem(false);
    const service = create();

    service.toggle(); // dark, against the light system: saved
    service.toggle(); // light again, which is the system: the choice is cleared
    TestBed.tick();
    expect(localStorage.getItem('theme')).toBeNull();
    expect(root.dataset['theme']).toBeUndefined();

    // So when the system turns dark (at night, say), the page follows.
    systemChangesTo(true);
    expect(service.theme()).toBe('dark');
  });

  it('starts from the choice saved by an earlier visit, over the system', () => {
    fakeSystem(true);
    localStorage.setItem('theme', 'light');
    const service = create();

    expect(service.theme()).toBe('light');
    expect(root.dataset['theme']).toBe('light');
  });

  it('ignores a value it did not write and works without matchMedia', () => {
    localStorage.setItem('theme', 'purple');
    const service = create();

    expect(service.theme()).toBe('light');
  });
});
