import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readFile, readdir } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { migrate } from '../../src/db/migrate';

jest.mock('node:fs/promises');
jest.mock('mysql2/promise', () => ({ __esModule: true, default: { createConnection: jest.fn() } }));

const connection = {
  query: jest.fn<(sql: string, params?: unknown[]) => Promise<unknown>>(),
  end: jest.fn(),
};
const files = jest.mocked(readdir) as unknown as jest.Mock<() => Promise<string[]>>;

/** Fakes a database where `applied` were already run and the folder holds `onDisk`. */
function setup(applied: string[], onDisk: string[]) {
  jest.mocked(mysql.createConnection).mockResolvedValue(connection as never);
  connection.query.mockImplementation(async (sql) =>
    sql.startsWith('SELECT name') ? [applied.map((name) => ({ name }))] : [[]],
  );
  files.mockResolvedValue(onDisk);
  jest
    .mocked(readFile)
    .mockImplementation(async (file) => `-- contents of ${String(file).slice(-10)}`);
}

const executed = () =>
  connection.query.mock.calls.map(([sql, params]) => (params ? `${sql} ${params}` : sql));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('migrate', () => {
  it('applies only the pending .sql files, in name order, and records each one', async () => {
    setup(['001_a.sql'], ['003_c.sql', '001_a.sql', 'README.md', '002_b.sql']);
    const log = jest.fn();

    await migrate(log);

    const applied = executed().filter((sql) => sql.startsWith('INSERT INTO migrations'));
    expect(applied).toEqual([
      'INSERT INTO migrations (name) VALUES (?) 002_b.sql',
      'INSERT INTO migrations (name) VALUES (?) 003_c.sql',
    ]);
    expect(log.mock.calls).toEqual([['applied 002_b.sql'], ['applied 003_c.sql']]);
    expect(connection.end).toHaveBeenCalled();
  });

  it('says the database is up to date when nothing is pending', async () => {
    setup(['001_a.sql'], ['001_a.sql']);
    const log = jest.fn();

    await migrate(log);

    expect(log).toHaveBeenCalledWith('database is up to date');
    expect(executed().some((sql) => sql.startsWith('INSERT'))).toBe(false);
  });

  it('stops at a failing file without recording it, and still closes the connection', async () => {
    setup([], ['001_a.sql', '002_b.sql']);
    connection.query.mockImplementation(async (sql) => {
      if (sql.includes('001_a')) throw new Error('syntax error');
      return [[]];
    });

    await expect(migrate(jest.fn())).rejects.toThrow('syntax error');
    expect(executed().some((sql) => sql.startsWith('INSERT'))).toBe(false);
    expect(connection.end).toHaveBeenCalled();
  });

  it('opens its own connection with multipleStatements (not the shared pool)', async () => {
    setup([], []);
    await migrate(jest.fn());
    expect(mysql.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({ multipleStatements: true }),
    );
  });
});
