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
