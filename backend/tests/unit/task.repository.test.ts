import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { pool } from '../../src/db/mysql';
import { findAll, update } from '../../src/tasks/task.repository';

jest.mock('../../src/db/mysql', () => ({ pool: { query: jest.fn() } }));
const query = pool.query as unknown as jest.Mock<(sql: string, params?: unknown[]) => unknown>;

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue([[]] as never);
});

/** The SQL of a query (the last one by default), with whitespace collapsed, and its parameters. */
function lastQuery(index = -1) {
  const [sql, params] = query.mock.calls.at(index)!;
  return { sql: sql.replace(/\s+/g, ' ').trim(), params };
}

describe('findAll: building the list query', () => {
  it('scopes by owner and sorts newest first by default', async () => {
    await findAll(7);
    const { sql, params } = lastQuery();

    expect(sql).toContain('WHERE user_id = ? ORDER BY created_at DESC, created_at DESC, id DESC');
    expect(params).toEqual([7]);
  });

  it('adds each filter as a parameter, never as text in the SQL', async () => {
    await findAll(7, {
      status: 'completed',
      priority: 'high',
      search: 'report',
      sort: 'created_at',
    });
    const { sql, params } = lastQuery();

    expect(sql).toContain(
      'WHERE user_id = ? AND completed = ? AND priority = ? AND (title LIKE ? OR description LIKE ?)',
    );
    expect(params).toEqual([7, true, 'high', '%report%', '%report%']);
    expect(sql).not.toContain('report');
  });

  it('maps "pending" to completed = false', async () => {
    await findAll(7, { status: 'pending', sort: 'created_at' });
    expect(lastQuery().params).toEqual([7, false]);
  });

  it('escapes the LIKE wildcards typed by the user', async () => {
    await findAll(7, { status: 'all', search: '100%_\\', sort: 'created_at' });
    expect(lastQuery().params).toEqual([7, '%100\\%\\_\\\\%', '%100\\%\\_\\\\%']);
  });

  it.each([
    ['due_date', undefined, 'ORDER BY due_date IS NULL, due_date ASC'],
    ['due_date', 'desc', 'ORDER BY due_date IS NULL, due_date DESC'],
    ['priority', undefined, 'ORDER BY priority DESC'],
    ['priority', 'asc', 'ORDER BY priority ASC'],
    ['created_at', 'asc', 'ORDER BY created_at ASC'],
  ] as const)('sorts by %s %s with "%s"', async (sort, order, expected) => {
    await findAll(7, { status: 'all', sort, order });
    expect(lastQuery().sql).toContain(`${expected}, created_at DESC, id DESC`);
  });
});

describe('update: only the fields that were sent', () => {
  it('sets just those columns (camelCase → snake_case), scoped by owner', async () => {
    await update(3, 7, { dueDate: null, priority: 'low' });
    // The first query is the UPDATE; the second reads the task back.
    const { sql, params } = lastQuery(0);

    expect(sql).toBe('UPDATE tasks SET due_date = ?, priority = ? WHERE id = ? AND user_id = ?');
    expect(params).toEqual([null, 'low', 3, 7]);
  });
});
