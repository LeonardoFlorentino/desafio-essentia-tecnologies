import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/** Same key as public/theme.js, which applies the choice before the first paint. */
const STORAGE_KEY = 'theme';

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null; // storage blocked: follow the system
  }
}

/**
 * Light or dark: the system's preference, unless this browser picked one with the header toggle.
 * The CSS does the switching (prefers-color-scheme, and <html data-theme> for a choice).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly systemQuery = this.document.defaultView?.matchMedia?.(
    '(prefers-color-scheme: dark)',
  );
  private readonly systemDark = signal(this.systemQuery?.matches ?? false);
  private readonly chosen = signal<Theme | null>(savedTheme());

  private readonly system = computed<Theme>(() => (this.systemDark() ? 'dark' : 'light'));
  readonly theme = computed<Theme>(() => this.chosen() ?? this.system());

  constructor() {
    this.systemQuery?.addEventListener('change', (event) => this.systemDark.set(event.matches));
    effect(() => this.apply(this.chosen(), this.theme()));
  }

  /** Switches to the other theme. Picking what the system shows clears the choice: it follows the system again. */
  toggle() {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    const choice = next === this.system() ? null : next;
    this.chosen.set(choice);
    try {
      if (choice) localStorage.setItem(STORAGE_KEY, choice);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage blocked: the choice lasts until the page is closed
    }
  }

  private apply(choice: Theme | null, theme: Theme) {
    const root = this.document.documentElement;
    if (choice) root.dataset['theme'] = choice;
    else delete root.dataset['theme'];
    // The browser's own bar (mobile) takes the page's ground colour, read from the tokens.
    let meta = this.document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = this.document.createElement('meta');
      meta.name = 'theme-color';
      this.document.head.append(meta);
    }
    meta.content = getComputedStyle(root).getPropertyValue('--color-ground').trim();
    meta.dataset['theme'] = theme;
  }
}
