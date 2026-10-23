import { expect, test } from '../fixtures';

test('a visitor is sent to the sign-in page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
});

test('the browser tab gets the app icon, in SVG with .ico and touch fallbacks', async ({
  page,
}) => {
  await page.goto('/login');
  const icons = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).getAttribute('href')));
  expect(icons).toEqual(['favicon.ico', 'favicon.svg', 'apple-touch-icon.png']);
  for (const [file, type] of [
    ['favicon.svg', 'image/svg+xml'],
    ['favicon.ico', 'image/x-icon'],
    ['apple-touch-icon.png', 'image/png'],
  ]) {
    const res = await page.request.get(`/${file}`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain(type);
  }
});

test('signs up through the form and creates the first task', async ({ page, account }) => {
  await page.goto('/register');
  await page.getByLabel('E-mail').fill(account.email);
  await page.getByLabel('Senha', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Nenhuma tarefa cadastrada')).toBeVisible();

  await page.getByLabel('Título').fill('Primeira tarefa');
  await page.getByRole('button', { name: 'Adicionar tarefa' }).click();

  await expect(
    page.getByRole('listitem').getByRole('heading', { name: 'Primeira tarefa' }),
  ).toBeVisible();
});
