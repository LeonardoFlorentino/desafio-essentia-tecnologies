import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

// With the system's "reduce motion" on, nothing moves or resizes: fades and colour changes stay
// (they help to follow what happened), transforms and position changes never run.

test.beforeEach(async ({ signedIn: _signedIn }) => {});

/** Properties that move or resize something; anything else (opacity, colours) is fine. */
const MOVING =
  /^(transform|translate|scale|rotate|left|top|right|bottom|width|height|inset)$|^margin/;

/** Records, frame by frame, every property animated on the page (CSS transitions and WAAPI). */
async function recordMotion(page: Page) {
  await page.addInitScript(() => {
    const seen = new Set<string>();
    (window as unknown as { motion: Set<string> }).motion = seen;
    const frame = () => {
      for (const animation of document.getAnimations()) {
        const transition = (animation as CSSTransition).transitionProperty;
        if (transition) seen.add(transition);
        else {
          const first = (animation.effect as KeyframeEffect).getKeyframes()[0] ?? {};
          for (const property of Object.keys(first)) seen.add(property);
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

const movedProperties = (page: Page) =>
  page.evaluate((pattern) => {
    const seen = (window as unknown as { motion: Set<string> }).motion;
    return [...seen].filter((property) => new RegExp(pattern).test(property));
  }, MOVING.source);

/** Create, complete, open the calendar, open and cancel the dialog, delete. */
async function useTheList(page: Page) {
  await page.goto('/');
  await page.request.post('/api/tasks', { data: { title: 'Já existia' } });
  await page.reload();
  await expect(page.getByRole('listitem')).toHaveCount(1);
  const form = page.getByRole('region', { name: 'Nova tarefa' });
  await form.getByLabel('Título').fill('Tarefa sem movimento');
  await form.getByRole('button', { name: 'Adicionar tarefa' }).click();
  const task = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('checkbox', { name: 'Concluída: Tarefa sem movimento' }) });
  await expect(task).toBeVisible();

  await task.getByRole('checkbox').click();
  await expect(task.getByRole('checkbox')).toBeChecked();
  await task.getByRole('button', { name: /^Editar:/ }).click();
  await task.getByRole('button', { name: 'Abrir calendário' }).click();
  await expect(page.getByRole('dialog', { name: 'Escolher data' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  const remove = task.getByRole('button', { name: /^Excluir:/ });
  await remove.click();
  await page
    .getByRole('dialog', { name: 'Excluir a tarefa?' })
    .getByRole('button', { name: 'Cancelar' })
    .click();
  await remove.click();
  await page.getByRole('button', { name: 'Excluir tarefa' }).click();
  await expect(task).toHaveCount(0);
  await page.waitForTimeout(400); // let the last fades and slides finish
}

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('nothing moves or resizes; only fades and colours change', async ({ page }) => {
    await recordMotion(page);
    await useTheList(page);
    expect(await movedProperties(page)).toEqual([]);
    // Pressing a button does not shrink it either.
    const add = page.getByRole('button', { name: 'Adicionar tarefa' });
    const box = (await add.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    expect(await add.evaluate((button) => getComputedStyle(button).transform)).toBe('none');
    await page.mouse.up();
  });
});

test.describe('without reduced motion (control: the recorder does see motion)', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the same steps do move things', async ({ page }) => {
    await recordMotion(page);
    await useTheList(page);
    expect(await movedProperties(page)).toContain('transform');
  });
});
