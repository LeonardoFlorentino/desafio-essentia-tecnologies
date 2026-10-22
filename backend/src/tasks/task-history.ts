import { Schema, model } from 'mongoose';

export const TASK_EVENT_TYPES = [
  'created',
  'updated',
  'completed',
  'reopened',
  'details_updated',
  'deleted',
] as const;

export type TaskEventType = (typeof TASK_EVENT_TYPES)[number];

/** For "updated": each changed field with its value before and after. */
export type TaskChanges = Record<string, { from: unknown; to: unknown }>;

export interface TaskEvent {
  type: TaskEventType;
  changes?: TaskChanges;
  at: Date;
}

/**
 * Append-only log of what happened to each task. A log that only grows and whose entries
 * vary in shape is a natural fit for a MongoDB collection rather than a relational table.
 */
const taskEventSchema = new Schema(
  {
    taskId: { type: Number, required: true },
    userId: { type: Number, required: true },
    type: { type: String, enum: TASK_EVENT_TYPES, required: true },
    changes: { type: Schema.Types.Mixed },
    at: { type: Date, default: Date.now },
  },
  { collection: 'task_events', versionKey: false },
);
taskEventSchema.index({ taskId: 1, userId: 1, at: -1 });

export const TaskEventModel = model('TaskEvent', taskEventSchema);

/**
 * Best effort: the task itself is already saved in MySQL, so a MongoDB failure here is logged
 * instead of failing the user's request (the history would miss one entry, nothing else).
 */
export async function recordEvent(
  taskId: number,
  userId: number,
  type: TaskEventType,
  changes?: TaskChanges,
): Promise<void> {
  try {
    await TaskEventModel.create({ taskId, userId, type, changes });
  } catch (error) {
    console.error(`Could not record the "${type}" event of task ${taskId}:`, error);
  }
}

/** Newest first. */
export async function listEvents(taskId: number, userId: number): Promise<TaskEvent[]> {
  const events = await TaskEventModel.find({ taskId, userId }).sort({ at: -1, _id: -1 }).lean();
  return events.map(({ type, changes, at }) => ({
    type: type as TaskEventType,
    ...(changes ? { changes: changes as TaskChanges } : {}),
    at,
  }));
}
