-- Add player flags to tasks
ALTER TABLE "Task" ADD COLUMN "purchasePlayer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN "leasePlayer" BOOLEAN NOT NULL DEFAULT false;
