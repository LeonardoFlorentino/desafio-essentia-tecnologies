import { today } from '../shared/dates';

export type Priority = 'low' | 'medium' | 'high';

/** A task as returned by the API (timestamps as ISO 8601 strings, the due date as YYYY-MM-DD). */
export interface Task {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  dueDate: string | null;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}

export interface NewTask {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: Priority;
}

type EditableField = 'title' | 'description' | 'completed' | 'dueDate' | 'priority';

/** Only the fields being changed; the API leaves the others untouched. */
export type TaskChanges = Partial<Pick<Task, EditableField>>;

/** Extra information kept in MongoDB: free-form notes and tags. */
export interface TaskDetails {
  notes: string;
  tags: string[];
}

export type TaskEventType =
  'created' | 'updated' | 'completed' | 'reopened' | 'details_updated' | 'deleted';

/** One entry of the task history; `changes` (for "updated") has each field before and after. */
export interface TaskEvent {
  type: TaskEventType;
  changes?: Partial<Record<EditableField, { from: unknown; to: unknown }>>;
  at: string;
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

/** Order of the options in the selects: highest first. */
export const PRIORITY_OPTIONS: readonly Priority[] = ['high', 'medium', 'low'];

/** Overdue or due today; completed tasks and tasks without a due date are neither. */
export function dueState(task: Task, day = today()): 'overdue' | 'today' | null {
  if (task.completed || !task.dueDate) return null;
  if (task.dueDate < day) return 'overdue';
  return task.dueDate === day ? 'today' : null;
}

/** The day strip's groups of pending tasks: what is late, due today, due within a week, with no date. */
export type DueBucket = 'overdue' | 'today' | 'week' | 'none';

export const DUE_BUCKETS: readonly { id: DueBucket; label: string }[] = [
  { id: 'overdue', label: 'Atrasadas' },
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Próximos 7 dias' },
  { id: 'none', label: 'Sem prazo' },
];

/**
 * Which group of the day strip a task belongs to; null for a completed task or one due later than a
 * week from now. Decided against the user's own calendar day, which only the browser knows.
 */
export function dueBucket(task: Task, day = today()): DueBucket | null {
  if (task.completed) return null;
  if (!task.dueDate) return 'none';
  if (task.dueDate < day) return 'overdue';
  if (task.dueDate === day) return 'today';
  return task.dueDate <= addDays(day, 7) ? 'week' : null;
}

/** YYYY-MM-DD plus `days`, on the calendar (no time zone involved). */
function addDays(isoDay: string, days: number): string {
  const [year, month, date] = isoDay.split('-').map(Number);
  return today(new Date(year!, month! - 1, date! + days));
}
