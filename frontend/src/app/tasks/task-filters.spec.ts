import { convertToParamMap } from '@angular/router';
import {
  DEFAULT_FILTERS,
  filtersFromParams,
  filtersToParams,
  hasActiveFilters,
} from './task-filters';
import { Task, dueState } from './task.model';

describe('task filters in the URL', () => {
  it('reads the filters from the query string', () => {
    const params = convertToParamMap({
      search: '  report ',
      status: 'pending',
      priority: 'high',
      sort: 'due_date',
    });
    expect(filtersFromParams(params)).toEqual({
      search: 'report',
      status: 'pending',
      priority: 'high',
      sort: 'due_date',
    });
  });

  it('falls back to the defaults for missing or hand-edited unknown values', () => {
    const params = convertToParamMap({ status: 'done', priority: 'urgent', sort: 'title' });
    expect(filtersFromParams(params)).toEqual(DEFAULT_FILTERS);
  });

  it('writes only the values that differ from the default', () => {
    expect(filtersToParams(DEFAULT_FILTERS)).toEqual({});
    expect(filtersToParams({ ...DEFAULT_FILTERS, search: '   ', status: 'completed' })).toEqual({
      status: 'completed',
    });
  });

  it('knows when the list is filtered or sorted', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'priority' })).toBe(true);
  });
});

describe('due dates', () => {
  const task = (dueDate: string | null, completed = false) => ({ dueDate, completed }) as Task;

  it('marks pending tasks as overdue or due today', () => {
    expect(dueState(task('2026-10-21'), '2026-10-22')).toBe('overdue');
    expect(dueState(task('2026-10-22'), '2026-10-22')).toBe('today');
    expect(dueState(task('2026-10-23'), '2026-10-22')).toBeNull();
  });

  it('never flags a completed task or one without a due date', () => {
    expect(dueState(task('2026-10-01', true), '2026-10-22')).toBeNull();
    expect(dueState(task(null), '2026-10-22')).toBeNull();
  });
});
