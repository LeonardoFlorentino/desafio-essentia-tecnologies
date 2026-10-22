import { expect, test } from '../fixtures';

test('a visitor is sent to the sign-in page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
});

test('signs up through the form and creates the first task', async ({ page, account }) => {
  await page.goto('/register');
  await page.getByLabel('E-mail').fill(account.email);
  await page.getByLabel('Senha').fill(account.password);
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Nenhuma tarefa cadastrada')).toBeVisible();

  await page.getByLabel('Título').fill('Primeira tarefa');
  await page.getByRole('button', { name: 'Adicionar tarefa' }).click();

  await expect(
    page.getByRole('listitem').getByRole('heading', { name: 'Primeira tarefa' }),
  ).toBeVisible();
});
