import { ParamMap, Params } from '@angular/router';
import { Priority } from './task.model';

/** What the list shows. It lives in the URL query string, so a filtered list can be reloaded or shared. */
export interface TaskFilters {
  search: string;
  status: 'all' | 'pending' | 'completed';
  priority: Priority | '';
  sort: 'created_at' | 'due_date' | 'priority';
}

export const DEFAULT_FILTERS: TaskFilters = {
  search: '',
  status: 'all',
  priority: '',
  sort: 'created_at',
};

const ALLOWED = {
  status: ['all', 'pending', 'completed'],
  priority: ['', 'low', 'medium', 'high'],
  sort: ['created_at', 'due_date', 'priority'],
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
  };
}

/** Query string for the URL and for the API: only the values that differ from the default. */
export function filtersToParams(filters: TaskFilters): Params {
  const params: Params = {};
  for (const key of Object.keys(DEFAULT_FILTERS) as (keyof TaskFilters)[]) {
    const value = filters[key].trim();
    if (value !== DEFAULT_FILTERS[key]) params[key] = value;
  }
  return params;
}

export function hasActiveFilters(filters: TaskFilters): boolean {
  return Object.keys(filtersToParams(filters)).length > 0;
}
