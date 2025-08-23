-- AlterTable
ALTER TABLE "public"."Prompt" ADD COLUMN     "chatSessionId" TEXT,
ADD COLUMN     "title" TEXT;

-- CreateIndex
CREATE INDEX "Prompt_chatSessionId_idx" ON "public"."Prompt"("chatSessionId");

-- CreateIndex
CREATE INDEX "Prompt_userId_chatSessionId_idx" ON "public"."Prompt"("userId", "chatSessionId");
