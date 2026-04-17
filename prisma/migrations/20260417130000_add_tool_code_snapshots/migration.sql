-- CreateTable
CREATE TABLE "ToolCodeSnapshot" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolCodeSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolCodeSnapshot_toolId_createdAt_idx" ON "ToolCodeSnapshot"("toolId", "createdAt");

-- AddForeignKey
ALTER TABLE "ToolCodeSnapshot" ADD CONSTRAINT "ToolCodeSnapshot_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
