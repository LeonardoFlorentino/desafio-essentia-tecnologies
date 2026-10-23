import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

// Dark mode: follows the system, and a choice made with the header toggle is kept in this browser.

/** The page's ground, as the browser paints it. */
/** The page's ground, as the browser paints it; retried until it matches (the theme applies right after a click). */
const expectGround = (page: Page, colour: string) =>
  expect(page.locator('body')).toHaveCSS('background-color', colour);
const LIGHT = 'rgb(242, 244, 247)';
const DARK = 'rgb(10, 10, 10)';

const toggle = (page: Page) => page.getByRole('button', { name: 'Tema escuro' });

test.describe('with the system in dark', () => {
  test.use({ colorScheme: 'dark' });

  test('the page is dark without any choice, and the toggle says so', async ({ page }) => {
    await page.goto('/login');
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
    await expectGround(page, DARK);
  });
});

test.describe('with the system in light', () => {
  test.use({ colorScheme: 'light' });

  test('a choice survives a reload; choosing the system again forgets it', async ({ page }) => {
    await page.goto('/login');
    await expectGround(page, LIGHT);

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
    await expectGround(page, DARK);

    await page.reload();
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
    await expectGround(page, DARK);

    // Light is what the system shows: the saved choice is removed, and the page follows the system.
    await toggle(page).click();
    await expectGround(page, LIGHT);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
  });

  test('a saved dark choice is applied before the app runs (no light flash)', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    // Without the app's JavaScript, only public/theme.js can have applied the theme.
    await page.route(/\/(main|chunk|polyfills)[^/]*\.js/, (route) => route.abort());
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expectGround(page, DARK);
  });

  test('the task list is themed too, signed in', async ({ page, signedIn: _signedIn }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Tarefas' })).toBeVisible();
    await toggle(page).click();
    await expectGround(page, DARK);
    await expect(page.getByRole('region', { name: 'Nova tarefa' })).toHaveCSS(
      'background-color',
      'rgb(17, 17, 17)',
    );
  });
});
