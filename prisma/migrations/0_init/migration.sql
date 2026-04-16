-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."DatabaseType" AS ENUM ('POSTGRESQL', 'MYSQL');

-- CreateEnum
CREATE TYPE "public"."GoogleService" AS ENUM ('SHEETS', 'DRIVE', 'CALENDAR', 'GMAIL', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "public"."KnowledgeBaseRole" AS ENUM ('ADMIN', 'CONTRIBUTOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."PointStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."ScanStatus" AS ENUM ('PASS', 'WARN', 'FAIL');

-- CreateEnum
CREATE TYPE "public"."ToolStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "public"."UploadStatus" AS ENUM ('PROCESSING', 'PENDING_REVIEW', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."UsageSource" AS ENUM ('MARKETPLACE', 'DIRECT', 'SHARE');

-- CreateEnum
CREATE TYPE "public"."Visibility" AS ENUM ('PRIVATE', 'GROUP', 'COMPANY', 'PUBLIC');

-- CreateTable
CREATE TABLE "public"."CodeScan" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "status" "public"."ScanStatus" NOT NULL,
    "findings" JSONB NOT NULL,
    "llmSummary" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompanyRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "model" TEXT,
    "summary" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "dataSources" JSONB,
    "starred" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DataSourceLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "toolId" TEXT,
    "source" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "toolName" TEXT,
    "params" JSONB,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "durationMs" INTEGER,
    "rowCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response" JSONB,

    CONSTRAINT "DataSourceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExternalDatabase" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."DatabaseType" NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "database" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "sslEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalDatabase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExternalDatabaseColumn" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "columnName" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "isNullable" BOOLEAN NOT NULL DEFAULT true,
    "isPrimaryKey" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,

    CONSTRAINT "ExternalDatabaseColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExternalDatabaseTable" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "note" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExternalDatabaseTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KnowledgeBase" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KnowledgeBaseMember" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."KnowledgeBaseRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeBaseMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KnowledgeBaseReview" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBaseReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KnowledgePoint" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "uploadId" TEXT,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "public"."PointStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KnowledgeUpload" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" "public"."UploadStatus" NOT NULL DEFAULT 'PROCESSING',
    "error" TEXT,
    "pointCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Skill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "requiredDataSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT NOT NULL DEFAULT 'other',
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "group" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."TokenUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationMessageId" TEXT,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "TokenUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "visibility" "public"."Visibility" NOT NULL DEFAULT 'PRIVATE',
    "category" TEXT,
    "tags" TEXT[],
    "authorId" TEXT NOT NULL,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dataSources" JSONB,
    "status" "public"."ToolStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ToolReview" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ToolReviewReply" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolReviewReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ToolRow" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ToolStats" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "totalUsage" INTEGER NOT NULL DEFAULT 0,
    "weeklyUsage" INTEGER NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weightedRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ToolTable" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ToolUsage" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "public"."UsageSource" NOT NULL DEFAULT 'DIRECT',
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "department" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'MEMBER',
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserGoogleServiceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" "public"."GoogleService" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGoogleServiceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthlyLimitUsd" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "bonusBalanceUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_ExternalDatabaseColumnToGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ExternalDatabaseColumnToGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_ExternalDatabaseTableToGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ExternalDatabaseTableToGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_GroupToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GroupToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_ToolAllowedGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ToolAllowedGroups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "CodeScan_scannedAt_idx" ON "public"."CodeScan"("scannedAt" ASC);

-- CreateIndex
CREATE INDEX "CodeScan_status_idx" ON "public"."CodeScan"("status" ASC);

-- CreateIndex
CREATE INDEX "CodeScan_toolId_idx" ON "public"."CodeScan"("toolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyRole_name_key" ON "public"."CompanyRole"("name" ASC);

-- CreateIndex
CREATE INDEX "Conversation_deletedAt_idx" ON "public"."Conversation"("deletedAt" ASC);

-- CreateIndex
CREATE INDEX "Conversation_userId_starred_updatedAt_idx" ON "public"."Conversation"("userId" ASC, "starred" ASC, "updatedAt" ASC);

-- CreateIndex
CREATE INDEX "Conversation_userId_updatedAt_idx" ON "public"."Conversation"("userId" ASC, "updatedAt" ASC);

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_idx" ON "public"."ConversationMessage"("conversationId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationMessage_conversationId_orderIndex_key" ON "public"."ConversationMessage"("conversationId" ASC, "orderIndex" ASC);

-- CreateIndex
CREATE INDEX "DataSourceLog_conversationId_idx" ON "public"."DataSourceLog"("conversationId" ASC);

-- CreateIndex
CREATE INDEX "DataSourceLog_createdAt_idx" ON "public"."DataSourceLog"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "DataSourceLog_dataSourceId_idx" ON "public"."DataSourceLog"("dataSourceId" ASC);

-- CreateIndex
CREATE INDEX "DataSourceLog_toolId_idx" ON "public"."DataSourceLog"("toolId" ASC);

-- CreateIndex
CREATE INDEX "DataSourceLog_userId_idx" ON "public"."DataSourceLog"("userId" ASC);

-- CreateIndex
CREATE INDEX "ExternalDatabase_createdAt_idx" ON "public"."ExternalDatabase"("createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalDatabaseColumn_tableId_columnName_key" ON "public"."ExternalDatabaseColumn"("tableId" ASC, "columnName" ASC);

-- CreateIndex
CREATE INDEX "ExternalDatabaseColumn_tableId_idx" ON "public"."ExternalDatabaseColumn"("tableId" ASC);

-- CreateIndex
CREATE INDEX "ExternalDatabaseTable_databaseId_idx" ON "public"."ExternalDatabaseTable"("databaseId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalDatabaseTable_databaseId_tableName_key" ON "public"."ExternalDatabaseTable"("databaseId" ASC, "tableName" ASC);

-- CreateIndex
CREATE INDEX "KnowledgeBase_createdBy_idx" ON "public"."KnowledgeBase"("createdBy" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBaseMember_knowledgeBaseId_userId_key" ON "public"."KnowledgeBaseMember"("knowledgeBaseId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "KnowledgeBaseMember_userId_idx" ON "public"."KnowledgeBaseMember"("userId" ASC);

-- CreateIndex
CREATE INDEX "KnowledgeBaseReview_knowledgeBaseId_idx" ON "public"."KnowledgeBaseReview"("knowledgeBaseId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBaseReview_knowledgeBaseId_userId_key" ON "public"."KnowledgeBaseReview"("knowledgeBaseId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "KnowledgePoint_knowledgeBaseId_status_idx" ON "public"."KnowledgePoint"("knowledgeBaseId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "KnowledgePoint_uploadId_idx" ON "public"."KnowledgePoint"("uploadId" ASC);

-- CreateIndex
CREATE INDEX "KnowledgeUpload_knowledgeBaseId_idx" ON "public"."KnowledgeUpload"("knowledgeBaseId" ASC);

-- CreateIndex
CREATE INDEX "Skill_userId_idx" ON "public"."Skill"("userId" ASC);

-- CreateIndex
CREATE INDEX "Skill_visibility_category_idx" ON "public"."Skill"("visibility" ASC, "category" ASC);

-- CreateIndex
CREATE INDEX "Skill_visibility_usageCount_idx" ON "public"."Skill"("visibility" ASC, "usageCount" DESC);

-- CreateIndex
CREATE INDEX "TokenUsage_conversationMessageId_idx" ON "public"."TokenUsage"("conversationMessageId" ASC);

-- CreateIndex
CREATE INDEX "TokenUsage_createdAt_idx" ON "public"."TokenUsage"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "TokenUsage_model_idx" ON "public"."TokenUsage"("model" ASC);

-- CreateIndex
CREATE INDEX "TokenUsage_userId_idx" ON "public"."TokenUsage"("userId" ASC);

-- CreateIndex
CREATE INDEX "Tool_category_idx" ON "public"."Tool"("category" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Tool_conversationId_key" ON "public"."Tool"("conversationId" ASC);

-- CreateIndex
CREATE INDEX "Tool_createdAt_idx" ON "public"."Tool"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Tool_status_idx" ON "public"."Tool"("status" ASC);

-- CreateIndex
CREATE INDEX "Tool_visibility_idx" ON "public"."Tool"("visibility" ASC);

-- CreateIndex
CREATE INDEX "ToolReview_toolId_idx" ON "public"."ToolReview"("toolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ToolReview_toolId_userId_key" ON "public"."ToolReview"("toolId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "ToolReview_userId_idx" ON "public"."ToolReview"("userId" ASC);

-- CreateIndex
CREATE INDEX "ToolReviewReply_reviewId_idx" ON "public"."ToolReviewReply"("reviewId" ASC);

-- CreateIndex
CREATE INDEX "ToolRow_tableId_createdAt_idx" ON "public"."ToolRow"("tableId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ToolStats_toolId_key" ON "public"."ToolStats"("toolId" ASC);

-- CreateIndex
CREATE INDEX "ToolStats_trendingScore_idx" ON "public"."ToolStats"("trendingScore" ASC);

-- CreateIndex
CREATE INDEX "ToolStats_weeklyUsage_idx" ON "public"."ToolStats"("weeklyUsage" ASC);

-- CreateIndex
CREATE INDEX "ToolStats_weightedRating_idx" ON "public"."ToolStats"("weightedRating" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ToolTable_toolId_name_key" ON "public"."ToolTable"("toolId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "ToolUsage_createdAt_idx" ON "public"."ToolUsage"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "ToolUsage_toolId_idx" ON "public"."ToolUsage"("toolId" ASC);

-- CreateIndex
CREATE INDEX "ToolUsage_userId_idx" ON "public"."ToolUsage"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_provider_providerAccountId_key" ON "public"."UserAccount"("provider" ASC, "providerAccountId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserApiKey_keyHash_key" ON "public"."UserApiKey"("keyHash" ASC);

-- CreateIndex
CREATE INDEX "UserApiKey_userId_idx" ON "public"."UserApiKey"("userId" ASC);

-- CreateIndex
CREATE INDEX "UserGoogleServiceToken_userId_idx" ON "public"."UserGoogleServiceToken"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserGoogleServiceToken_userId_service_key" ON "public"."UserGoogleServiceToken"("userId" ASC, "service" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserQuota_userId_key" ON "public"."UserQuota"("userId" ASC);

-- CreateIndex
CREATE INDEX "_ExternalDatabaseColumnToGroup_B_index" ON "public"."_ExternalDatabaseColumnToGroup"("B" ASC);

-- CreateIndex
CREATE INDEX "_ExternalDatabaseTableToGroup_B_index" ON "public"."_ExternalDatabaseTableToGroup"("B" ASC);

-- CreateIndex
CREATE INDEX "_GroupToUser_B_index" ON "public"."_GroupToUser"("B" ASC);

-- CreateIndex
CREATE INDEX "_ToolAllowedGroups_B_index" ON "public"."_ToolAllowedGroups"("B" ASC);

-- AddForeignKey
ALTER TABLE "public"."CodeScan" ADD CONSTRAINT "CodeScan_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "public"."Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DataSourceLog" ADD CONSTRAINT "DataSourceLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalDatabaseColumn" ADD CONSTRAINT "ExternalDatabaseColumn_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."ExternalDatabaseTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalDatabaseTable" ADD CONSTRAINT "ExternalDatabaseTable_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "public"."ExternalDatabase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KnowledgeBase" ADD CONSTRAINT "KnowledgeBase_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KnowledgeBaseMember" ADD CONSTRAINT "KnowledgeBaseMember_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "public"."KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KnowledgeBaseMember" ADD CONSTRAINT "KnowledgeBaseMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KnowledgeBaseReview" ADD CONSTRAINT "KnowledgeBaseReview_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "public"."KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KnowledgeBaseReview" ADD CONSTRAINT "KnowledgeBaseReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KnowledgePoint" ADD CONSTRAINT "KnowledgePoint_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "public"."KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KnowledgePoint" ADD CONSTRAINT "KnowledgePoint_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KnowledgePoint" ADD CONSTRAINT "KnowledgePoint_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "public"."KnowledgeUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KnowledgeUpload" ADD CONSTRAINT "KnowledgeUpload_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "public"."KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KnowledgeUpload" ADD CONSTRAINT "KnowledgeUpload_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Skill" ADD CONSTRAINT "Skill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TokenUsage" ADD CONSTRAINT "TokenUsage_conversationMessageId_fkey" FOREIGN KEY ("conversationMessageId") REFERENCES "public"."ConversationMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TokenUsage" ADD CONSTRAINT "TokenUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tool" ADD CONSTRAINT "Tool_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tool" ADD CONSTRAINT "Tool_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToolReview" ADD CONSTRAINT "ToolReview_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "public"."Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToolReview" ADD CONSTRAINT "ToolReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToolReviewReply" ADD CONSTRAINT "ToolReviewReply_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "public"."ToolReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToolReviewReply" ADD CONSTRAINT "ToolReviewReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToolRow" ADD CONSTRAINT "ToolRow_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."ToolTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToolStats" ADD CONSTRAINT "ToolStats_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "public"."Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToolTable" ADD CONSTRAINT "ToolTable_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "public"."Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToolUsage" ADD CONSTRAINT "ToolUsage_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "public"."Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToolUsage" ADD CONSTRAINT "ToolUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAccount" ADD CONSTRAINT "UserAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserApiKey" ADD CONSTRAINT "UserApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserGoogleServiceToken" ADD CONSTRAINT "UserGoogleServiceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserQuota" ADD CONSTRAINT "UserQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ExternalDatabaseColumnToGroup" ADD CONSTRAINT "_ExternalDatabaseColumnToGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."ExternalDatabaseColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ExternalDatabaseColumnToGroup" ADD CONSTRAINT "_ExternalDatabaseColumnToGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."CompanyRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ExternalDatabaseTableToGroup" ADD CONSTRAINT "_ExternalDatabaseTableToGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."ExternalDatabaseTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ExternalDatabaseTableToGroup" ADD CONSTRAINT "_ExternalDatabaseTableToGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."CompanyRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_GroupToUser" ADD CONSTRAINT "_GroupToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."CompanyRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_GroupToUser" ADD CONSTRAINT "_GroupToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ToolAllowedGroups" ADD CONSTRAINT "_ToolAllowedGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."CompanyRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ToolAllowedGroups" ADD CONSTRAINT "_ToolAllowedGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- pgvector extension and embedding column for KnowledgePoint
-- (Not in schema.prisma because Prisma doesn't natively support the vector type)

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "public"."KnowledgePoint" ADD COLUMN IF NOT EXISTS "embedding" vector(1024);

CREATE INDEX IF NOT EXISTS "KnowledgePoint_embedding_hnsw_idx"
  ON "public"."KnowledgePoint"
  USING hnsw ("embedding" vector_cosine_ops)
  WHERE status = 'APPROVED';
