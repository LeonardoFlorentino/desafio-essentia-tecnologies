/**
 * Motion for the task list, with the browser's Web Animations API (no library): a row that leaves
 * fades out, then the rows that moved slide from where they were (FLIP: measure, render, play) and
 * new rows fade in. Only transform and opacity; durations and curves come from the CSS tokens.
 * Without WAAPI (old browsers, the unit-test DOM) every change is instant.
 */

/** Rows are <li data-task-id="…"> directly inside the list. */
function rows(list: HTMLElement): HTMLElement[] {
  return [...list.querySelectorAll<HTMLElement>(':scope > li[data-task-id]')];
}

const canAnimate = (list: HTMLElement | undefined): list is HTMLElement =>
  !!list && typeof list.animate === 'function';

/** A duration or curve token, read from the stylesheet so motion has a single source. */
function token(list: HTMLElement, name: string): string {
  return getComputedStyle(list).getPropertyValue(name).trim();
}

const ms = (value: string) => Number.parseFloat(value) || 0;

/** Where each row is now, by task id. */
export function measure(list: HTMLElement | undefined): Map<string, DOMRect> {
  const places = new Map<string, DOMRect>();
  if (!canAnimate(list)) return places;
  for (const row of rows(list)) places.set(row.dataset['taskId']!, row.getBoundingClientRect());
  return places;
}

/**
 * Fades out the rows whose tasks are leaving. Returns when they are gone, or undefined when there
 * is nothing to wait for (no row leaving, or no animation support): the caller then goes on at once.
 */
export function fadeOut(
  list: HTMLElement | undefined,
  staying: Set<string>,
): Promise<void> | undefined {
  if (!canAnimate(list)) return undefined;
  const leaving = rows(list).filter((row) => !staying.has(row.dataset['taskId']!));
  if (leaving.length === 0) return undefined;
  const timing = {
    duration: ms(token(list, '--duration-fast')),
    easing: token(list, '--ease-out'),
  };
  const fades = leaving.map(
    (row) =>
      row.animate([{ opacity: 1 }, { opacity: 0 }], { ...timing, fill: 'forwards' }).finished,
  );
  return Promise.all(fades).then(() => undefined);
}

/**
 * After the list re-rendered: each row that moved slides from its old place, each new row fades in.
 * With reduced motion, nothing moves; new rows only fade in.
 */
export function play(
  list: HTMLElement | undefined,
  before: Map<string, DOMRect>,
  reduced: boolean,
) {
  if (!canAnimate(list)) return;
  // A row that started to leave but stayed (a newer change kept it, like a strip group clicked
  // twice) is still held at opacity 0 by its fade: drop the fade, or the row stays invisible.
  for (const row of rows(list)) {
    for (const animation of row.getAnimations()) {
      if (animation.effect?.getTiming().fill === 'forwards') animation.cancel();
    }
  }
  if (before.size === 0) return;
  const duration = ms(token(list, '--duration-base'));
  for (const row of rows(list)) {
    const old = before.get(row.dataset['taskId']!);
    if (!old) {
      const from = reduced ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-4px)' };
      row.animate([from, { opacity: 1, transform: 'none' }], {
        duration,
        easing: token(list, '--ease-out'),
      });
      continue;
    }
    if (reduced) continue;
    const now = row.getBoundingClientRect();
    const dx = old.left - now.left;
    const dy = old.top - now.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    row.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
      duration,
      easing: token(list, '--ease-in-out'),
    });
  }
}
