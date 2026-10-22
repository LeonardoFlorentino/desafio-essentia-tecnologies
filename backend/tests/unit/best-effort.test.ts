import { describe, expect, it, jest } from '@jest/globals';
import { create } from '../../src/auth/user.repository';
import { pool } from '../../src/db/mysql';
import { logger } from '../../src/logger';
import { TaskEventModel, recordEvent } from '../../src/tasks/task-history';

jest.mock('../../src/db/mysql', () => ({ pool: { query: jest.fn() } }));
const query = pool.query as unknown as jest.Mock<() => Promise<unknown>>;

describe('recordEvent (history is best effort)', () => {
  it('logs a MongoDB failure instead of failing the request', async () => {
    const failure = new Error('MongoDB is down');
    jest.spyOn(TaskEventModel, 'create').mockRejectedValueOnce(failure as never);
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);

    await expect(recordEvent(3, 7, 'completed')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      { err: failure, taskId: 3, type: 'completed' },
      'could not record a task history event',
    );
  });
});

describe('user.repository create', () => {
  it('returns null for an email already registered (unique key)', async () => {
    query.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    await expect(create('ana@techx.com', 'hash')).resolves.toBeNull();
  });

  it('lets any other database error through (it becomes a 500)', async () => {
    const down = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    query.mockRejectedValueOnce(down);
    await expect(create('ana@techx.com', 'hash')).rejects.toBe(down);
  });
});
