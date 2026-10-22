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

/** 2026-10-25 → 25/10/2026 (the due date is a calendar day: no time zone to convert). */
export function formatDay(day: string): string {
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
}

/** Today in the user's time zone, as YYYY-MM-DD. */
export function today(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Overdue or due today; completed tasks and tasks without a due date are neither. */
export function dueState(task: Task, day = today()): 'overdue' | 'today' | null {
  if (task.completed || !task.dueDate) return null;
  if (task.dueDate < day) return 'overdue';
  return task.dueDate === day ? 'today' : null;
}
