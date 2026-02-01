-- Add due date to tasks
ALTER TABLE "Task" ADD COLUMN "dueDate" TIMESTAMP(3);

-- Optional index for filtering by due date
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");
