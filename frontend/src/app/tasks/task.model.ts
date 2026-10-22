/** A task as returned by the API (dates come as ISO 8601 strings). */
export interface Task {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewTask {
  title: string;
  description?: string | null;
}

/** Only the fields being changed; the API leaves the others untouched. */
export type TaskChanges = Partial<Pick<Task, 'title' | 'description' | 'completed'>>;

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
  changes?: Partial<Record<'title' | 'description' | 'completed', { from: unknown; to: unknown }>>;
  at: string;
}
