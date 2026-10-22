-- Every task belongs to a user. The column is nullable only because tasks created before
-- accounts existed have no owner; the API always sets it, and `npm run seed` hands any
-- ownerless task to the demo user. Deleting a user deletes their tasks.
ALTER TABLE tasks
  ADD COLUMN user_id INT NULL AFTER id,
  ADD CONSTRAINT tasks_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  ADD INDEX tasks_user_created_idx (user_id, created_at);
