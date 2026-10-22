import { Schema, model } from 'mongoose';

/**
 * Extra information about a task, kept in MongoDB: free-form notes and tags have no fixed
 * shape, while the task itself (title, status, owner) stays in MySQL. One document per task.
 */
export interface TaskDetails {
  notes: string;
  tags: string[];
}

const taskDetailsSchema = new Schema(
  {
    // The MySQL task id; with userId, every query is scoped to the owner as in MySQL.
    taskId: { type: Number, required: true, unique: true },
    userId: { type: Number, required: true },
    notes: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  { collection: 'task_details', timestamps: true },
);

export const TaskDetailsModel = model('TaskDetails', taskDetailsSchema);

const EMPTY: TaskDetails = { notes: '', tags: [] };

/** A task without a document yet simply has no notes and no tags. */
export async function getDetails(taskId: number, userId: number): Promise<TaskDetails> {
  const doc = await TaskDetailsModel.findOne({ taskId, userId }).lean();
  return doc ? { notes: doc.notes, tags: doc.tags } : EMPTY;
}

/** Creates or replaces the task's details. */
export async function saveDetails(
  taskId: number,
  userId: number,
  details: TaskDetails,
): Promise<TaskDetails> {
  await TaskDetailsModel.updateOne({ taskId, userId }, { $set: details }, { upsert: true });
  return details;
}

export async function removeDetails(taskId: number, userId: number): Promise<void> {
  await TaskDetailsModel.deleteOne({ taskId, userId });
}
