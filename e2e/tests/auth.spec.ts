import type { Browser, Page } from '@playwright/test';
import { expect, newAccount, test, type Account } from '../fixtures';

const account = (page: Page) => page.getByRole('navigation', { name: 'Conta' });

async function fillCredentials(page: Page, { email, password }: Account) {
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
}

/** Registers through the API in a throwaway context, so the page under test stays signed out. */
async function existingAccount(browser: Browser, baseURL: string): Promise<Account> {
  const created = newAccount();
  const context = await browser.newContext({ baseURL });
  expect((await context.request.post('/api/auth/register', { data: created })).status()).toBe(201);
  await context.close();
  return created;
}

test.describe('sign up', () => {
  test('creates the account, signs in and shows the email in the header', async ({
    page,
    account: newOne,
  }) => {
    await page.goto('/register');
    await fillCredentials(page, newOne);
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(account(page)).toContainText(newOne.email);
    await expect(account(page).getByRole('button', { name: 'Sair' })).toBeVisible();
  });

  test('shows the password with the eye toggle, by keyboard (hiding on send: unit test)', async ({
    page,
    account: newOne,
  }) => {
    await page.goto('/register');
    const password = page.getByLabel('Senha', { exact: true });
    const toggle = page.getByRole('button', { name: 'Mostrar senha' });
    await page.getByLabel('E-mail').fill(newOne.email);
    await password.fill(newOne.password);
    await expect(password).toHaveAttribute('type', 'password');

    // The toggle comes right after the field in the Tab order, and Space switches it.
    await password.focus();
    await page.keyboard.press('Tab');
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(password).toHaveAttribute('type', 'text');
    await expect(password).toHaveValue(newOne.password);

    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('explains a short password before sending anything', async ({ page, account: newOne }) => {
    await page.goto('/register');
    await fillCredentials(page, { ...newOne, password: '1234567' });
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page.getByText('A senha precisa de pelo menos 8 caracteres.')).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('refuses an email that is already registered', async ({ page, browser, baseURL }) => {
    const taken = await existingAccount(browser, baseURL!);
    await page.goto('/register');
    await fillCredentials(page, taken);
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page.getByRole('alert')).toContainText('Este e-mail já está cadastrado.');
  });
});

test.describe('sign in and out', () => {
  test('signs in, survives a reload, and signs out', async ({ page, browser, baseURL }) => {
    const existing = await existingAccount(browser, baseURL!);
    await page.goto('/login');
    // The email is accepted in any case and with spaces around it.
    await fillCredentials(page, { ...existing, email: `  ${existing.email.toUpperCase()} ` });
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(account(page)).toContainText(existing.email);

    await page.reload();
    await expect(account(page)).toContainText(existing.email);

    await account(page).getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('gives the same message for a wrong password and an unknown email', async ({
    page,
    browser,
    baseURL,
  }) => {
    const existing = await existingAccount(browser, baseURL!);
    await page.goto('/login');

    for (const attempt of [
      { ...existing, password: 'wrong-password' },
      { email: 'nobody-here@techx.com', password: 'whatever-123' },
    ]) {
      await fillCredentials(page, attempt);
      await page.getByRole('button', { name: 'Entrar' }).click();
      await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.');
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('keeps the session only in an HttpOnly cookie, out of reach of page scripts', async ({
    page,
    context,
    signedIn: _signedIn,
  }) => {
    await page.goto('/');
    const session = (await context.cookies()).find((cookie) => cookie.name === 'session')!;

    expect(session).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/api' });
    expect(await page.evaluate(() => document.cookie)).not.toContain('session');
    expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe('{}');
  });
});

test.describe('route guards', () => {
  test('without a session, every page leads to the sign-in page', async ({ page }) => {
    for (const path of ['/', '/?status=pending', '/no-such-page']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('signed in, the sign-in and sign-up pages lead to the task list', async ({
    page,
    signedIn: _signedIn,
  }) => {
    for (const path of ['/login', '/register']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
    }
  });
});

test.describe('a session that ends while the page is open', () => {
  async function tryToAddTask(page: Page) {
    await page.getByRole('region', { name: 'Nova tarefa' }).getByLabel('Título').fill('Depois');
    await page.getByRole('button', { name: 'Adicionar tarefa' }).click();
  }

  test('expired: the next action leads to the sign-in page with a notice', async ({
    page,
    context,
    signedIn: _signedIn,
  }) => {
    await page.goto('/');
    // Wait until the app has confirmed the session at startup; only then does it "expire".
    await expect(page.getByRole('heading', { level: 1, name: 'Tarefas' })).toBeVisible();
    await context.clearCookies();
    await tryToAddTask(page);

    await expect(page).toHaveURL(/\/login\?expired=true$/);
    await expect(page.getByRole('status')).toHaveText(
      'Sua sessão expirou. Entre novamente para continuar.',
    );
  });

  test('signed out in another window: the copy of the session stops working (revoked)', async ({
    page,
    context,
    browser,
    baseURL,
    signedIn: _signedIn,
  }) => {
    await page.goto('/');
    // A second browser holding a copy of the same session cookie.
    const other = await browser.newContext({ baseURL });
    await other.addCookies(await context.cookies());
    const otherPage = await other.newPage();
    await otherPage.goto('/');
    await expect(otherPage.getByRole('heading', { level: 1, name: 'Tarefas' })).toBeVisible();

    await account(page).getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await tryToAddTask(otherPage);
    await expect(otherPage).toHaveURL(/\/login\?expired=true$/);
    await other.close();
  });
});

test('each account sees only its own tasks', async ({
  page,
  browser,
  baseURL,
  signedIn: _signedIn,
}) => {
  await page.request.post('/api/tasks', { data: { title: 'Tarefa privada da Ana' } });

  const other = await browser.newContext({ baseURL });
  const otherPage = await other.newPage();
  await otherPage.request.post('/api/auth/register', { data: newAccount() });
  await otherPage.goto('/');

  await expect(otherPage.getByText('Nenhuma tarefa cadastrada')).toBeVisible();
  await otherPage.getByRole('search').getByLabel('Buscar').fill('privada');
  await expect(otherPage.getByText('Nenhuma tarefa encontrada com estes filtros.')).toBeVisible();
  await other.close();
});
