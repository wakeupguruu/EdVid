/*
  Warnings:

  - You are about to drop the column `chatSessionId` on the `Prompt` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Prompt` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Prompt_chatSessionId_idx";

-- DropIndex
DROP INDEX "public"."Prompt_userId_chatSessionId_idx";

-- AlterTable
ALTER TABLE "public"."Prompt" DROP COLUMN "chatSessionId",
DROP COLUMN "title";
