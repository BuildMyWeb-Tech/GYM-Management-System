-- Add whatsappEnabled to Branch
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Add broadcastId to NotificationLog
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "broadcastId" TEXT;

-- New enums
DO $$ BEGIN
  CREATE TYPE "WAConnectionState" AS ENUM (
    'DISCONNECTED','STARTING','AUTHENTICATING','QR_REQUIRED',
    'CONNECTED','RECONNECTING','LOGGED_OUT','ERROR'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "OutboxMsgType" AS ENUM ('TEXT','IMAGE','VIDEO','AUDIO','DOCUMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "OutboxStatus" AS ENUM ('PENDING','PROCESSING','SENT','FAILED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "BroadcastStatus" AS ENUM (
    'DRAFT','QUEUED','IN_PROGRESS','COMPLETED','FAILED','PAUSED','CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- WhatsAppAccount
CREATE TABLE IF NOT EXISTS "WhatsAppAccount" (
  "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "branchId"              TEXT NOT NULL,
  "connectionState"       "WAConnectionState" NOT NULL DEFAULT 'DISCONNECTED',
  "status"                TEXT NOT NULL DEFAULT 'disconnected',
  "qrDataUri"             TEXT,
  "qrGeneratedAt"         TIMESTAMP(3),
  "workerInstanceId"      TEXT,
  "lastHeartbeatAt"       TIMESTAMP(3),
  "connectRequestedAt"    TIMESTAMP(3),
  "disconnectRequestedAt" TIMESTAMP(3),
  "reconnectAttempts"     INTEGER NOT NULL DEFAULT 0,
  "lastError"             TEXT,
  "lastConnectedAt"       TIMESTAMP(3),
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppAccount_branchId_key" UNIQUE ("branchId"),
  CONSTRAINT "WhatsAppAccount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE
);

-- WhatsAppSession
CREATE TABLE IF NOT EXISTS "WhatsAppSession" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "branchId"       TEXT NOT NULL,
  "encryptedState" TEXT NOT NULL,
  "version"        INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppSession_branchId_key" UNIQUE ("branchId"),
  CONSTRAINT "WhatsAppSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "WhatsAppAccount"("branchId") ON DELETE CASCADE
);

-- MessageOutbox
CREATE TABLE IF NOT EXISTS "MessageOutbox" (
  "id"                      TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "branchId"                TEXT NOT NULL,
  "recipient"               TEXT NOT NULL,
  "messageType"             "OutboxMsgType" NOT NULL DEFAULT 'TEXT',
  "payload"                 JSONB NOT NULL,
  "status"                  "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt"                TIMESTAMP(3),
  "lockedBy"                TEXT,
  "attempts"                INTEGER NOT NULL DEFAULT 0,
  "maxAttempts"             INTEGER NOT NULL DEFAULT 3,
  "broadcastId"             TEXT,
  "broadcastRecipientIndex" INTEGER,
  "sentMessageId"           TEXT,
  "errorMessage"            TEXT,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MessageOutbox_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "WhatsAppAccount"("branchId") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "MessageOutbox_branchId_status_scheduledAt_idx" ON "MessageOutbox"("branchId","status","scheduledAt");
CREATE INDEX IF NOT EXISTS "MessageOutbox_broadcastId_idx" ON "MessageOutbox"("broadcastId");

-- BroadcastCampaign
CREATE TABLE IF NOT EXISTS "BroadcastCampaign" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "branchId"       TEXT NOT NULL,
  "message"        TEXT,
  "mediaUrl"       TEXT,
  "mediaType"      TEXT,
  "status"         "BroadcastStatus" NOT NULL DEFAULT 'QUEUED',
  "totalCount"     INTEGER NOT NULL DEFAULT 0,
  "sentCount"      INTEGER NOT NULL DEFAULT 0,
  "failedCount"    INTEGER NOT NULL DEFAULT 0,
  "pendingCount"   INTEGER NOT NULL DEFAULT 0,
  "deliveredCount" INTEGER NOT NULL DEFAULT 0,
  "sendIntervalMs" INTEGER NOT NULL DEFAULT 1500,
  "recipients"     JSONB NOT NULL DEFAULT '[]',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BroadcastCampaign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BroadcastCampaign_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "WhatsAppAccount"("branchId") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "BroadcastCampaign_branchId_idx" ON "BroadcastCampaign"("branchId");
CREATE INDEX IF NOT EXISTS "BroadcastCampaign_status_idx" ON "BroadcastCampaign"("status");
CREATE INDEX IF NOT EXISTS "BroadcastCampaign_createdAt_idx" ON "BroadcastCampaign"("createdAt");

-- Add FK from NotificationLog.broadcastId → BroadcastCampaign.id
DO $$ BEGIN
  ALTER TABLE "NotificationLog"
    ADD CONSTRAINT "NotificationLog_broadcastId_fkey"
    FOREIGN KEY ("broadcastId") REFERENCES "BroadcastCampaign"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add FK from MessageOutbox.broadcastId → BroadcastCampaign.id
DO $$ BEGIN
  ALTER TABLE "MessageOutbox"
    ADD CONSTRAINT "MessageOutbox_broadcastId_fkey"
    FOREIGN KEY ("broadcastId") REFERENCES "BroadcastCampaign"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;
