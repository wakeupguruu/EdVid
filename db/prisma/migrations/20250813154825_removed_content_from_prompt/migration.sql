/*
  Warnings:

  - You are about to drop the column `content` on the `Prompt` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Prompt" DROP COLUMN "content",
ADD COLUMN     "rawOutput" TEXT;
