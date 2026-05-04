-- AlterTable
ALTER TABLE "SystemConfig" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ToolFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolFavorite_userId_createdAt_idx" ON "ToolFavorite"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ToolFavorite_toolId_idx" ON "ToolFavorite"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "ToolFavorite_userId_toolId_key" ON "ToolFavorite"("userId", "toolId");

-- AddForeignKey
ALTER TABLE "ToolFavorite" ADD CONSTRAINT "ToolFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolFavorite" ADD CONSTRAINT "ToolFavorite_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
