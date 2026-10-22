-- Due date (optional, a calendar day without time) and priority. In MySQL an ENUM sorts by the
-- position of its values, so ORDER BY priority puts low < medium < high without extra work.
ALTER TABLE tasks
  ADD COLUMN due_date DATE NULL AFTER completed,
  ADD COLUMN priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium' AFTER due_date,
  ADD INDEX tasks_user_due_idx (user_id, due_date),
  ADD INDEX tasks_user_priority_idx (user_id, priority);
