-- CreateTable
CREATE TABLE "WebhookEventLog" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEventLog_provider_eventId_key" ON "WebhookEventLog"("provider", "eventId");

-- CreateIndex
CREATE INDEX "WebhookEventLog_provider_idx" ON "WebhookEventLog"("provider");
