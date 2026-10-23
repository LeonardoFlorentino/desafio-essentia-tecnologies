import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

// Every test starts signed in with a brand-new account (fixture `signedIn`), so the list holds
// only what the test itself created. Tasks that are not the subject of a test are created
// through the API, to keep each test about one flow.

/** YYYY-MM-DD for today plus `days`, in local time (same machine as the browser). */
function day(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const brazilian = (isoDay: string) => isoDay.split('-').reverse().join('/');

async function createTask(page: Page, data: Record<string, unknown>) {
  const res = await page.request.post('/api/tasks', { data });
  expect(res.status()).toBe(201);
}

const newTaskForm = (page: Page) => page.getByRole('region', { name: 'Nova tarefa' });
const filters = (page: Page) => page.getByRole('search', { name: 'Buscar e filtrar tarefas' });
const titles = (page: Page) => page.getByRole('listitem').getByRole('heading', { level: 3 });

/** The card of a task, found by the accessible name of its checkbox (present in every mode). */
const card = (page: Page, title: string) =>
  page
    .getByRole('listitem')
    .filter({ has: page.getByRole('checkbox', { name: `Concluída: ${title}` }) });

/** The day strip: one button per group, in order Atrasadas, Hoje, Próximos 7 dias, Sem prazo. */
const strip = (page: Page) =>
  page.getByRole('group', { name: 'Tarefas pendentes por prazo' }).getByRole('button');
const stripValues = (page: Page) => strip(page).locator('.strip__value');

// Requesting the fixture is what signs the page in; the body has nothing left to do.
test.beforeEach(async ({ signedIn: _signedIn }) => {});

test('shows the empty state for a new account', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Nenhuma tarefa cadastrada')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(0);
});

test('creates a task with description, due date and priority', async ({ page }) => {
  await page.goto('/');
  const form = newTaskForm(page);
  await form.getByLabel('Título').fill('Pagar a conta de luz');
  await form.getByLabel('Descrição').fill('Vence no começo do mês');
  // Typed the Brazilian way (day/month/year); the field adds the slashes.
  await form.getByLabel('Prazo').pressSequentially(brazilian(day(5)).replaceAll('/', ''));
  await form.getByLabel('Prioridade').selectOption({ label: 'Alta' });
  await form.getByRole('button', { name: 'Adicionar tarefa' }).click();

  const task = card(page, 'Pagar a conta de luz');
  await expect(task).toContainText('Vence no começo do mês');
  await expect(task).toContainText('Prioridade alta');
  await expect(task).toContainText(`Prazo: ${brazilian(day(5))}`);
  await expect(task).toContainText('Pendente');
  await expect(form.getByLabel('Título')).toHaveValue('');
  await expect(stripValues(page)).toHaveText(['0', '0', '1', '0']);
});

test('picks the due date from a calendar in Portuguese', async ({ page }) => {
  await page.goto('/');
  const form = newTaskForm(page);
  await expect(form.getByLabel('Prazo')).toHaveAttribute('placeholder', '__/__/____');

  await form.getByRole('button', { name: 'Abrir calendário' }).click();
  const calendar = page.getByRole('dialog', { name: 'Escolher data' });
  await expect(calendar).toContainText('Dom');
  await expect(calendar).toContainText('Sáb');

  // The 15th of next month, by its full name ("15 de novembro de 2026").
  const next = new Date();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const monthName = next.toLocaleDateString('pt-BR', { month: 'long' });
  await calendar.getByRole('button', { name: 'Próximo mês' }).click();
  await calendar
    .getByRole('button', { name: `15 de ${monthName} de ${next.getFullYear()}` })
    .click();
  await expect(calendar).toBeHidden();

  const expected = `15/${String(next.getMonth() + 1).padStart(2, '0')}/${next.getFullYear()}`;
  await expect(form.getByLabel('Prazo')).toHaveValue(expected);

  // Esc closes only the calendar.
  await form.getByRole('button', { name: 'Abrir calendário' }).click();
  await page.keyboard.press('Escape');
  await expect(calendar).toBeHidden();
  await expect(form.getByLabel('Prazo')).toHaveValue(expected);

  await form.getByLabel('Título').fill('Com data do calendário');
  await form.getByRole('button', { name: 'Adicionar tarefa' }).click();
  await expect(card(page, 'Com data do calendário')).toContainText(`Prazo: ${expected}`);
});

test('does not create a task without a title and says why', async ({ page }) => {
  await page.goto('/');
  await newTaskForm(page).getByRole('button', { name: 'Adicionar tarefa' }).click();

  await expect(page.getByText('Informe o título da tarefa.')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(0);
});

test('edits a task inline, and Esc discards an edit', async ({ page }) => {
  await createTask(page, { title: 'Rascunho', priority: 'low' });
  await page.goto('/');

  await page.getByRole('button', { name: 'Editar: Rascunho' }).click();
  const editing = card(page, 'Rascunho');
  await expect(editing.getByLabel('Título')).toBeFocused();
  await editing.getByLabel('Título').fill('Relatório final');
  await editing.getByLabel('Prioridade').selectOption({ label: 'Alta' });
  await editing.getByRole('button', { name: 'Salvar' }).click();

  const saved = card(page, 'Relatório final');
  await expect(saved.getByRole('heading')).toHaveText('Relatório final');
  await expect(saved).toContainText('Prioridade alta');

  await page.getByRole('button', { name: 'Editar: Relatório final' }).click();
  await saved.getByLabel('Título').fill('Não era para salvar');
  await page.keyboard.press('Escape');
  await expect(saved.getByRole('heading')).toHaveText('Relatório final');
});

test('completes a task and reopens it, and the change is saved', async ({ page }) => {
  await createTask(page, { title: 'Ligar para o banco' });
  await page.goto('/');
  const checkbox = page.getByRole('checkbox', { name: 'Concluída: Ligar para o banco' });

  // click(), not check(): the box only changes once the API has saved the change.
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await expect(card(page, 'Ligar para o banco')).toContainText('Concluída');
  await expect(stripValues(page)).toHaveText(['0', '0', '0', '0']);

  await page.reload();
  await expect(checkbox).toBeChecked();

  await checkbox.click();
  await expect(card(page, 'Ligar para o banco')).toContainText('Pendente');
  await expect(checkbox).not.toBeChecked();
});

test('deletes a task only after confirming', async ({ page }) => {
  await createTask(page, { title: 'Tarefa descartável' });
  await page.goto('/');
  const remove = page.getByRole('button', { name: 'Excluir: Tarefa descartável' });
  const confirmDialog = page.getByRole('dialog', { name: 'Excluir a tarefa?' });

  // The page's own dialog names the task and what goes with it; the focus starts on Cancelar.
  await remove.click();
  await expect(confirmDialog).toContainText(
    '“Tarefa descartável” será excluída, junto com as notas e tags dela.',
  );
  await expect(confirmDialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();

  // Cancelar and Esc both keep the task, and the focus goes back to its "Excluir" button. The dialog
  // fades out after closing, but it never holds the page up: in the very next frame it is still on
  // screen, and a click where it is already lands on the page.
  const duringExit = await page.evaluate(async () => {
    const dialog = document.querySelector('dialog')!;
    const box = dialog.getBoundingClientRect();
    [...dialog.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Cancelar')!
      .click();
    await new Promise(requestAnimationFrame);
    const target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return {
      stillFading: getComputedStyle(dialog).display !== 'none',
      clickBlocked: !!target?.closest('dialog'),
    };
  });
  expect(duringExit).toEqual({ stillFading: true, clickBlocked: false });
  await expect(confirmDialog).toBeHidden();
  await expect(remove).toBeFocused();
  await remove.click();
  await page.keyboard.press('Escape');
  await expect(confirmDialog).toBeHidden();
  await expect(card(page, 'Tarefa descartável')).toBeVisible();

  await remove.click();
  await confirmDialog.getByRole('button', { name: 'Excluir tarefa' }).click();
  await expect(page.getByText('Nenhuma tarefa cadastrada')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('listitem')).toHaveCount(0);
});

test('flags overdue and due-today tasks, but not completed ones', async ({ page }) => {
  await createTask(page, { title: 'Atrasada de verdade', dueDate: day(-2) });
  await createTask(page, { title: 'Para hoje', dueDate: day(0) });
  await createTask(page, { title: 'Já feita', dueDate: day(-2) });
  await page.goto('/');
  await page.getByRole('checkbox', { name: 'Concluída: Já feita' }).click();

  await expect(card(page, 'Atrasada de verdade')).toContainText('Atrasada');
  await expect(card(page, 'Para hoje')).toContainText('Vence hoje');
  await expect(card(page, 'Já feita')).toContainText('Concluída');
  await expect(card(page, 'Já feita')).not.toContainText('Atrasada');
  await expect(stripValues(page)).toHaveText(['1', '1', '0', '0']);
});

test('filters the list by a group of the day strip, kept in the URL', async ({ page }) => {
  await createTask(page, { title: 'Atrasada', dueDate: day(-1) });
  await createTask(page, { title: 'Para hoje', dueDate: day(0) });
  await createTask(page, { title: 'Sem data' });
  await page.goto('/');
  await expect(titles(page)).toHaveCount(3);

  const todayGroup = strip(page).filter({ hasText: 'Hoje' });
  await todayGroup.click();
  await expect(todayGroup).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/due=today/);
  await expect(titles(page)).toHaveText(['Para hoje']);

  await page.reload();
  await expect(titles(page)).toHaveText(['Para hoje']);

  // A second click on the same group shows every task again.
  await todayGroup.click();
  await expect(page).not.toHaveURL(/due=/);
  await expect(titles(page)).toHaveCount(3);

  // Twice in quick succession (the rows start to fade out, then stay): none is left invisible.
  await todayGroup.evaluate((button: HTMLElement) => {
    button.click();
    setTimeout(() => button.click(), 40);
  });
  await expect(page).not.toHaveURL(/due=/);
  for (const row of await page.getByRole('listitem').all()) {
    await expect(row).toHaveCSS('opacity', '1');
  }
});

test.describe('search, filters and sorting', () => {
  test.beforeEach(async ({ page }) => {
    await createTask(page, { title: 'Revisar relatório', priority: 'high', dueDate: day(10) });
    await createTask(page, { title: 'Comprar café', priority: 'low' });
    await createTask(page, { title: 'Enviar proposta', priority: 'medium', dueDate: day(1) });
    await page.goto('/');
    await expect(titles(page)).toHaveCount(3);
  });

  test('filters by status and priority, and keeps the filters in the URL after a reload', async ({
    page,
  }) => {
    await page.getByRole('checkbox', { name: 'Concluída: Comprar café' }).click();
    await expect(card(page, 'Comprar café')).toContainText('Concluída');

    await filters(page).getByLabel('Situação').selectOption({ label: 'Pendentes' });
    await expect(page).toHaveURL(/status=pending/);
    await expect(titles(page)).toHaveText(['Enviar proposta', 'Revisar relatório']);

    await filters(page).getByLabel('Prioridade').selectOption({ label: 'Alta' });
    await expect(titles(page)).toHaveText(['Revisar relatório']);

    await page.reload();
    await expect(filters(page).getByLabel('Situação')).toHaveValue('pending');
    await expect(filters(page).getByLabel('Prioridade')).toHaveValue('high');
    await expect(titles(page)).toHaveText(['Revisar relatório']);
  });

  test('searches the title as the user types', async ({ page }) => {
    await filters(page).getByLabel('Buscar').fill('RELAT');
    await expect(page).toHaveURL(/search=RELAT/);
    await expect(titles(page)).toHaveText(['Revisar relatório']);
  });

  test('sorts by due date (no date last) and by priority', async ({ page }) => {
    await filters(page).getByLabel('Ordenar por').selectOption({ label: 'Prazo mais próximo' });
    await expect(titles(page)).toHaveText(['Enviar proposta', 'Revisar relatório', 'Comprar café']);

    await filters(page).getByLabel('Ordenar por').selectOption({ label: 'Maior prioridade' });
    await expect(titles(page)).toHaveText(['Revisar relatório', 'Enviar proposta', 'Comprar café']);
  });

  test('explains an empty result and clears the filters', async ({ page }) => {
    await filters(page).getByLabel('Buscar').fill('nada parecido');
    await expect(page.getByText('Nenhuma tarefa encontrada com estes filtros.')).toBeVisible();

    await page.getByRole('button', { name: 'Limpar filtros' }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(titles(page)).toHaveCount(3);
    await expect(filters(page).getByLabel('Buscar')).toBeFocused();
  });

  test('warns when a new task is hidden by the current filters', async ({ page }) => {
    await filters(page).getByLabel('Prioridade').selectOption({ label: 'Alta' });
    await expect(titles(page)).toHaveCount(1);

    await newTaskForm(page).getByLabel('Título').fill('Tarefa de prioridade média');
    await newTaskForm(page).getByRole('button', { name: 'Adicionar tarefa' }).click();

    // The visible notice (the page also keeps a screen-reader-only status line).
    await expect(page.getByRole('status').filter({ hasText: 'filtros atuais' })).toHaveText(
      'Tarefa “Tarefa de prioridade média” adicionada, mas ela não aparece com os filtros atuais.',
    );
    await expect(titles(page)).toHaveText(['Revisar relatório']);
  });
});

test('saves notes and tags (MongoDB) and shows the history of the task', async ({ page }) => {
  await createTask(page, { title: 'Preparar apresentação', priority: 'medium' });
  await page.goto('/');

  await page.getByRole('button', { name: 'Detalhes: Preparar apresentação' }).click();
  const task = card(page, 'Preparar apresentação');
  await task.getByLabel('Notas').fill('Levar o notebook');
  await task.getByLabel('Tags').fill('reunião, Urgente, urgente');
  await task.getByRole('button', { name: 'Salvar notas e tags' }).click();

  await expect(task.getByRole('status')).toHaveText('Notas e tags salvas.');
  await expect(task.getByRole('list', { name: 'Tags salvas' }).getByRole('listitem')).toHaveText([
    'reunião',
    'Urgente',
  ]);

  // An edit appears in the history with the value before and after.
  await page.getByRole('button', { name: 'Editar: Preparar apresentação' }).click();
  await task.getByLabel('Prioridade').selectOption({ label: 'Alta' });
  await task.getByRole('button', { name: 'Salvar' }).click();

  const history = task.getByRole('region', { name: 'Histórico' });
  await expect(history).toContainText('Tarefa editada');
  await expect(history).toContainText('Prioridade: Média → Alta');
  await expect(history).toContainText('Notas e tags atualizadas');
  await expect(history).toContainText('Tarefa criada');

  // Stored on the server: still there after a reload.
  await page.reload();
  await page.getByRole('button', { name: 'Detalhes: Preparar apresentação' }).click();
  await expect(card(page, 'Preparar apresentação').getByLabel('Notas')).toHaveValue(
    'Levar o notebook',
  );
});

test.describe('when the API fails', () => {
  test('shows an error with "Tentar novamente" when the list cannot load', async ({ page }) => {
    await createTask(page, { title: 'Volta depois' });
    let failing = true;
    await page.route('**/api/tasks', (route) =>
      failing && route.request().method() === 'GET'
        ? route.fulfill({ status: 500, json: { error: 'Internal server error' } })
        : route.fallback(),
    );

    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText('Não foi possível carregar as tarefas.');

    failing = false;
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(titles(page)).toHaveText(['Volta depois']);
  });

  test('keeps what was typed and explains an unreachable server', async ({ page }) => {
    await page.goto('/');
    await page.route('**/api/tasks', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ status: 503 }) : route.fallback(),
    );

    await newTaskForm(page).getByLabel('Título').fill('Não pode se perder');
    await newTaskForm(page).getByRole('button', { name: 'Adicionar tarefa' }).click();

    await expect(page.getByRole('alert')).toContainText('Sem conexão com o servidor');
    await expect(newTaskForm(page).getByLabel('Título')).toHaveValue('Não pode se perder');
  });
});
