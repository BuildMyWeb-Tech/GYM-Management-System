-- AlterEnum: add ANNOUNCEMENT value
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ANNOUNCEMENT';

-- AlterTable: add sentAt and metadata to NotificationLog
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- CreateIndex: add index on type for efficient notification queries
CREATE INDEX IF NOT EXISTS "NotificationLog_type_idx" ON "NotificationLog"("type");
