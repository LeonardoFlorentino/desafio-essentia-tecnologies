export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Task {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  /** Calendar day, `YYYY-MM-DD` (no time, no time zone), or null. */
  dueDate: string | null;
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
}
