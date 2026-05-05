-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('PREFERENCE', 'CONTEXT', 'RULE', 'FACT');

-- CreateEnum
CREATE TYPE "MemorySource" AS ENUM ('EXPLICIT', 'SUGGESTED');

-- CreateEnum
CREATE TYPE "MemoryConfidence" AS ENUM ('HIGH', 'MEDIUM');

-- CreateEnum
CREATE TYPE "SuggestedMemoryStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED');

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MemoryType" NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "content" TEXT NOT NULL,
    "source" "MemorySource" NOT NULL,
    "confidence" "MemoryConfidence" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "embedding" vector(1024),

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuggestedMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "type" "MemoryType" NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "content" TEXT NOT NULL,
    "status" "SuggestedMemoryStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedMemoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuggestedMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Memory_userId_type_idx" ON "Memory"("userId", "type");

-- CreateIndex
CREATE INDEX "Memory_userId_createdAt_idx" ON "Memory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SuggestedMemory_userId_status_idx" ON "SuggestedMemory"("userId", "status");

-- CreateIndex
CREATE INDEX "SuggestedMemory_conversationId_idx" ON "SuggestedMemory"("conversationId");

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestedMemory" ADD CONSTRAINT "SuggestedMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestedMemory" ADD CONSTRAINT "SuggestedMemory_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
