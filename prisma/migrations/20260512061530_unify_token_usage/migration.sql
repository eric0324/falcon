-- AlterTable
ALTER TABLE "TokenUsage" ADD COLUMN     "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'chat',
ADD COLUMN     "units" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "TokenUsage_kind_idx" ON "TokenUsage"("kind");

-- Backfill: move audio rows from outputTokens-as-minutes to kind="audio" + units
UPDATE "TokenUsage"
SET "kind" = 'audio',
    "units" = "outputTokens",
    "outputTokens" = 0,
    "totalTokens" = 0
WHERE "model" IN ('gpt-4o-mini-transcribe', 'gpt-4o-transcribe', 'whisper-1');

-- Backfill: move image rows from outputTokens-as-image-count to kind="image" + units
UPDATE "TokenUsage"
SET "kind" = 'image',
    "units" = "outputTokens",
    "outputTokens" = 0,
    "totalTokens" = 0
WHERE "model" IN ('imagen-4', 'gpt-image-1', 'gemini-2.5-flash-image');
