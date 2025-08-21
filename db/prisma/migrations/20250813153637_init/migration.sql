-- CreateEnum
CREATE TYPE "public"."VideoStatus" AS ENUM ('queued', 'processing', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."LogLevel" AS ENUM ('info', 'warning', 'error', 'debug');

-- AlterTable
ALTER TABLE "public"."Video" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "processingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "processingStartedAt" TIMESTAMP(3),
ADD COLUMN     "status" "public"."VideoStatus" NOT NULL DEFAULT 'queued',
ADD COLUMN     "thumbnailUrl" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "videoUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."UserQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthlyPrompts" INTEGER NOT NULL DEFAULT 10,
    "usedPrompts" INTEGER NOT NULL DEFAULT 0,
    "monthlyVideoMinutes" INTEGER NOT NULL DEFAULT 60,
    "usedVideoMinutes" INTEGER NOT NULL DEFAULT 0,
    "resetDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VideoProcessingLog" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "level" "public"."LogLevel" NOT NULL DEFAULT 'info',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoProcessingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserQuota_userId_key" ON "public"."UserQuota"("userId");

-- CreateIndex
CREATE INDEX "VideoProcessingLog_videoId_idx" ON "public"."VideoProcessingLog"("videoId");

-- CreateIndex
CREATE INDEX "VideoProcessingLog_stage_idx" ON "public"."VideoProcessingLog"("stage");

-- CreateIndex
CREATE INDEX "VideoProcessingLog_createdAt_idx" ON "public"."VideoProcessingLog"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."UserQuota" ADD CONSTRAINT "UserQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VideoProcessingLog" ADD CONSTRAINT "VideoProcessingLog_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "public"."Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
