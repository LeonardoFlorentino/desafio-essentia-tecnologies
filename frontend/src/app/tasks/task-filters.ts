import { ParamMap, Params } from '@angular/router';
import { DueBucket, Priority } from './task.model';

/** What the list shows. It lives in the URL query string, so a filtered list can be reloaded or shared. */
export interface TaskFilters {
  search: string;
  status: 'all' | 'pending' | 'completed';
  priority: Priority | '';
  sort: 'created_at' | 'due_date' | 'priority';
  /** A group of the day strip, filtered here in the browser (it depends on the user's calendar day). */
  due: DueBucket | '';
}

export const DEFAULT_FILTERS: TaskFilters = {
  search: '',
  status: 'all',
  priority: '',
  sort: 'created_at',
  due: '',
};

const ALLOWED = {
  status: ['all', 'pending', 'completed'],
  priority: ['', 'low', 'medium', 'high'],
  sort: ['created_at', 'due_date', 'priority'],
  due: ['', 'overdue', 'today', 'week', 'none'],
} as const;

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Reads the filters from the URL; a hand-edited unknown value falls back to the default. */
export function filtersFromParams(params: ParamMap): TaskFilters {
  return {
    search: (params.get('search') ?? '').trim().slice(0, 100),
    status: pick(params.get('status'), ALLOWED.status, DEFAULT_FILTERS.status),
    priority: pick(params.get('priority'), ALLOWED.priority, DEFAULT_FILTERS.priority),
    sort: pick(params.get('sort'), ALLOWED.sort, DEFAULT_FILTERS.sort),
    due: pick(params.get('due'), ALLOWED.due, DEFAULT_FILTERS.due),
  };
}

/** Query string for the URL: only the values that differ from the default. */
export function filtersToParams(filters: TaskFilters): Params {
  const params: Params = {};
  for (const key of Object.keys(DEFAULT_FILTERS) as (keyof TaskFilters)[]) {
    const value = filters[key].trim();
    if (value !== DEFAULT_FILTERS[key]) params[key] = value;
  }
  return params;
}

/** The same, for the API: without the day-strip group, which the browser applies itself. */
export function apiParams(filters: TaskFilters): Params {
  const params = filtersToParams(filters);
  delete params['due'];
  return params;
}

export function hasActiveFilters(filters: TaskFilters): boolean {
  return Object.keys(filtersToParams(filters)).length > 0;
}
