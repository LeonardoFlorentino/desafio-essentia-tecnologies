import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

// Touch screens get 44 px targets at any width (the CSS follows `pointer: coarse`, not the screen
// width), and no layout scrolls sideways. A desktop with a mouse keeps its denser 40 px controls.

test.beforeEach(async ({ signedIn: _signedIn }) => {});

/** Visible controls smaller than `min` px; a checkbox counts with the label around it. */
function smallTargets(page: Page, min: number) {
  return page.evaluate((min) => {
    return [...document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea')]
      .filter((element) => element.offsetParent !== null)
      .map((element) => {
        const isCheckbox = element instanceof HTMLInputElement && element.type === 'checkbox';
        const box = ((isCheckbox && element.closest('label')) || element).getBoundingClientRect();
        const name =
          element.getAttribute('aria-label') ?? element.textContent?.trim() ?? element.id;
        return `${name} (${Math.round(box.width)}×${Math.round(box.height)})`;
      })
      .filter((target) => {
        const [width, height] = target
          .slice(target.lastIndexOf('(') + 1, -1)
          .split('×')
          .map(Number);
        return width < min || height < min;
      });
  }, min);
}

const sidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

for (const viewport of [
  { width: 360, height: 780 },
  { width: 768, height: 1024 },
]) {
  test.describe(`touch screen ${viewport.width} px`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });

    test('every control is at least 44 px, with the calendar open too', async ({ page }) => {
      await page.request.post('/api/tasks', { data: { title: 'Tarefa no celular' } });
      await page.goto('/');
      await expect(page.getByRole('listitem')).toHaveCount(1);
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
      expect(await smallTargets(page, 44)).toEqual([]);
      expect(await sidewaysScroll(page)).toBe(false);

      await page.getByRole('button', { name: 'Editar: Tarefa no celular' }).tap();
      const task = page.getByRole('listitem');
      await task.getByRole('button', { name: 'Abrir calendário' }).tap();
      const calendar = page.getByRole('dialog', { name: 'Escolher data' });
      await expect(calendar).toBeVisible();
      expect(await smallTargets(page, 44)).toEqual([]);
      // The calendar stays inside the screen.
      const box = (await calendar.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    });

    test('the sign-in page has touch-sized targets', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/login');
      await expect(page.getByLabel('E-mail')).toBeVisible();
      expect(await smallTargets(page, 44)).toEqual([]);
    });
  });
}

test.describe('desktop with a mouse', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('keeps the 40 px density, and the checkbox is clicked through a 24 px area', async ({
    page,
  }) => {
    await page.request.post('/api/tasks', { data: { title: 'Tarefa no desktop' } });
    await page.goto('/');
    await expect(page.getByRole('listitem')).toHaveCount(1);
    expect(await page.evaluate(() => matchMedia('(pointer: fine)').matches)).toBe(true);
    expect(await sidewaysScroll(page)).toBe(false);

    const field = (await page
      .getByRole('region', { name: 'Nova tarefa' })
      .getByLabel('Título')
      .boundingBox())!;
    expect(field.height).toBe(40);
    // A click on the edge of the 24 px area (outside the 18 px box) still completes the task.
    const area = (await page.locator('.task__check').boundingBox())!;
    expect(Math.round(area.width)).toBe(24);
    await page.mouse.click(area.x + 1, area.y + 1);
    await expect(
      page.getByRole('checkbox', { name: 'Concluída: Tarefa no desktop' }),
    ).toBeChecked();
  });
});
