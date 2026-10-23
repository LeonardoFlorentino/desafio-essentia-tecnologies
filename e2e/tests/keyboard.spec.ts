import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

// The whole task flow with the keyboard alone: no click, no mouse. Each step also checks where
// the focus lands, because that is what a keyboard or screen reader user follows.

test.beforeEach(async ({ signedIn: _signedIn }) => {});

/** Presses Tab until the focused element matches, failing after `max` presses (no trap, no gap). */
async function tabTo(page: Page, target: ReturnType<Page['locator']>, max = 40) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`not reached with ${max} presses of Tab`);
}

test('creates, completes, edits and deletes a task with the keyboard only', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Nenhuma tarefa cadastrada')).toBeVisible();
  const form = page.getByRole('region', { name: 'Nova tarefa' });
  const title = form.getByLabel('Título');

  // From the top of the page to the first field, then a submit without a title: the focus
  // goes back to the field, which now carries its error.
  await tabTo(page, title);
  await tabTo(page, form.getByRole('button', { name: 'Adicionar tarefa' }));
  await page.keyboard.press('Enter');
  await expect(title).toBeFocused();
  await expect(title).toHaveAccessibleDescription('Informe o título da tarefa.');

  // Create: type, pick the due date in the calendar, send with Enter.
  await page.keyboard.type('Ligar para o contador');
  await tabTo(page, form.getByRole('button', { name: 'Abrir calendário' }));
  await page.keyboard.press('Enter');
  const calendar = page.getByRole('dialog', { name: 'Escolher data' });
  await tabTo(page, calendar.getByRole('button', { name: 'Hoje' }));
  await page.keyboard.press('Enter');
  await expect(calendar).toBeHidden();
  await expect(form.getByRole('button', { name: 'Abrir calendário' })).toBeFocused();
  await tabTo(page, form.getByRole('button', { name: 'Adicionar tarefa' }));
  await page.keyboard.press('Enter');
  // Found by its checkbox, which every mode has (while editing, the title is an input value).
  const task = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('checkbox', { name: /^Concluída: Ligar para/ }) });
  await expect(task).toContainText('Vence hoje');
  await expect(page.getByRole('status').filter({ hasText: 'adicionada' })).toHaveText(
    'Tarefa "Ligar para o contador" adicionada.',
  );

  // Complete with Space.
  const checkbox = page.getByRole('checkbox', { name: 'Concluída: Ligar para o contador' });
  await tabTo(page, checkbox);
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();

  // Edit: Enter on "Editar" puts the focus in the title; Enter saves; the focus comes back.
  const edit = page.getByRole('button', { name: 'Editar: Ligar para o contador' });
  await tabTo(page, edit);
  await page.keyboard.press('Enter');
  const editTitle = task.getByLabel('Título');
  await expect(editTitle).toBeFocused();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Ligar para a contadora');
  await page.keyboard.press('Enter');
  const saved = page.getByRole('button', { name: 'Editar: Ligar para a contadora' });
  await expect(saved).toBeFocused();

  // Esc leaves an edit without saving, and the focus returns to "Editar" as well.
  await page.keyboard.press('Enter');
  await page.keyboard.type(' (não salvar)');
  await page.keyboard.press('Escape');
  await expect(saved).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Ligar para a contadora' })).toBeVisible();

  // Delete: confirm with the keyboard; the focus goes to the screen title, not lost on <body>.
  page.once('dialog', (dialog) => void dialog.accept());
  await tabTo(page, page.getByRole('button', { name: 'Excluir: Ligar para a contadora' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Tarefas' })).toBeFocused();
  await expect(page.getByRole('status').filter({ hasText: 'excluída' })).toHaveText(
    'Tarefa "Ligar para a contadora" excluída.',
  );
});

test('filters by a group of the day strip with the keyboard', async ({ page }) => {
  await page.request.post('/api/tasks', { data: { title: 'Sem data definida' } });
  await page.goto('/');
  const group = page
    .getByRole('group', { name: 'Tarefas pendentes por prazo' })
    .getByRole('button')
    .filter({ hasText: 'Sem prazo' });

  await tabTo(page, group);
  await page.keyboard.press('Space');
  await expect(group).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/due=none/);
});

test('signs out and back in with the keyboard only', async ({ page, signedIn }) => {
  await page.goto('/');
  await tabTo(page, page.getByRole('button', { name: 'Sair' }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page).toHaveTitle('Entrar · TechX Tasks');

  const email = page.getByLabel('E-mail');
  await tabTo(page, email);
  await page.keyboard.type(signedIn.email);
  await page.keyboard.press('Tab');
  await page.keyboard.type(signedIn.password);
  await page.keyboard.press('Enter');
  await expect(page).toHaveTitle('Tarefas · TechX Tasks');
});
