/*
  Warnings:

  - The values [PENDING] on the enum `TaskStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `Expense` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."AdditionalTaskStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."ReportingTaskStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ReportingTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."TaskExecutionStatus" AS ENUM ('PENDING', 'COMPLETED', 'OVERDUE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."TaskAdminCommentType" AS ENUM ('ADMIN_NOTE', 'COMPLETION_FEEDBACK', 'INSTRUCTION', 'QUALITY_CHECK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."Role" ADD VALUE 'DEPUTY_ADMIN';
ALTER TYPE "public"."Role" ADD VALUE 'DEPUTY';
ALTER TYPE "public"."Role" ADD VALUE 'ACCOUNTANT';

-- AlterEnum
BEGIN;
CREATE TYPE "public"."TaskStatus_new" AS ENUM ('NEW', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'FAILED', 'CLOSED_WITH_PHOTO');
ALTER TABLE "public"."Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Task" ALTER COLUMN "status" TYPE "public"."TaskStatus_new" USING ("status"::text::"public"."TaskStatus_new");
ALTER TYPE "public"."TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "public"."TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "public"."TaskStatus_old";
ALTER TABLE "public"."Task" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Expense" DROP CONSTRAINT "Expense_itemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Expense" DROP CONSTRAINT "Expense_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Checklist" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedById" TEXT,
ADD COLUMN     "completionComment" TEXT,
ADD COLUMN     "completionPhotos" TEXT[],
ADD COLUMN     "name" TEXT,
ADD COLUMN     "roomId" TEXT;

-- AlterTable
ALTER TABLE "public"."CleaningObject" ADD COLUMN     "autoChecklistEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "completionRequirements" JSONB,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "lastChecklistDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "requireCommentForCompletion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requirePhotoForCompletion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "totalArea" DOUBLE PRECISION,
ADD COLUMN     "workingDays" TEXT[],
ADD COLUMN     "workingHours" JSONB;

-- AlterTable
ALTER TABLE "public"."PhotoReport" ADD COLUMN     "taskId" TEXT;

-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "completionComment" TEXT,
ADD COLUMN     "completionPhotos" TEXT[],
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "objectName" TEXT,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "roomId" TEXT,
ADD COLUMN     "roomName" TEXT,
ADD COLUMN     "scheduledEnd" TIMESTAMP(3),
ADD COLUMN     "scheduledStart" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'NEW',
ALTER COLUMN "checklistId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."TechCard" ADD COLUMN     "autoGenerate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cleaningObjectItemId" TEXT,
ADD COLUMN     "frequencyDays" INTEGER,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxDelayHours" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "period" TEXT,
ADD COLUMN     "preferredTime" TEXT,
ADD COLUMN     "roomGroupId" TEXT,
ADD COLUMN     "roomId" TEXT,
ADD COLUMN     "seasonality" TEXT,
ADD COLUMN     "siteId" TEXT,
ADD COLUMN     "timeSlots" TEXT[],
ADD COLUMN     "workDetails" TEXT,
ADD COLUMN     "zoneId" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "phone" TEXT;

-- DropTable
DROP TABLE "public"."Expense";

-- DropTable
DROP TABLE "public"."InventoryItem";

-- CreateTable
CREATE TABLE "public"."Room" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "area" DOUBLE PRECISION,
    "objectId" TEXT NOT NULL,
    "roomGroupId" TEXT,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Site" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "area" DOUBLE PRECISION,
    "comment" TEXT,
    "objectId" TEXT NOT NULL,
    "managerId" TEXT,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Zone" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "area" DOUBLE PRECISION,
    "siteId" TEXT NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoomGroup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "area" DOUBLE PRECISION,
    "zoneId" TEXT NOT NULL,

    CONSTRAINT "RoomGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CleaningObjectItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "CleaningObjectItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryLimit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "endDate" TIMESTAMP(3),
    "objectId" TEXT NOT NULL,
    "setById" TEXT NOT NULL,

    CONSTRAINT "InventoryLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryExpense" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "objectId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "InventoryExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClientBinding" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "telegramId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,

    CONSTRAINT "ClientBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdditionalTask" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceDetails" JSONB NOT NULL,
    "attachments" TEXT[],
    "status" "public"."AdditionalTaskStatus" NOT NULL DEFAULT 'NEW',
    "objectId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "completionNote" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeputyAdminAssignment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deputyAdminId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,

    CONSTRAINT "DeputyAdminAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ObjectStructure" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "objectName" TEXT NOT NULL,
    "objectAddress" TEXT,
    "siteName" TEXT,
    "zoneName" TEXT,
    "roomGroupName" TEXT,
    "roomName" TEXT,
    "cleaningObjectName" TEXT,
    "techCardName" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "notes" TEXT,
    "period" TEXT,
    "objectId" TEXT NOT NULL,
    "siteId" TEXT,
    "zoneId" TEXT,
    "roomGroupId" TEXT,
    "roomId" TEXT,
    "cleaningObjectId" TEXT,
    "techCardId" TEXT NOT NULL,
    "workType" TEXT,
    "description" TEXT,

    CONSTRAINT "ObjectStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReportingTask" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."ReportingTaskStatus" NOT NULL DEFAULT 'NEW',
    "priority" "public"."ReportingTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "objectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "completionComment" TEXT,

    CONSTRAINT "ReportingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReportingTaskComment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "ReportingTaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReportingTaskAttachment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "ReportingTaskAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExcludedObject" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "excludedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excludedById" TEXT NOT NULL,

    CONSTRAINT "ExcludedObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskExecution" (
    "id" TEXT NOT NULL,
    "techCardId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "status" "public"."TaskExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "photos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_admin_comments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "type" "public"."TaskAdminCommentType" NOT NULL,
    "taskId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "parentCommentId" TEXT,

    CONSTRAINT "task_admin_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedTaskId" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryLimit_objectId_idx" ON "public"."InventoryLimit"("objectId");

-- CreateIndex
CREATE INDEX "InventoryLimit_month_year_idx" ON "public"."InventoryLimit"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLimit_objectId_month_year_key" ON "public"."InventoryLimit"("objectId", "month", "year");

-- CreateIndex
CREATE INDEX "InventoryExpense_objectId_idx" ON "public"."InventoryExpense"("objectId");

-- CreateIndex
CREATE INDEX "InventoryExpense_month_year_idx" ON "public"."InventoryExpense"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ClientBinding_telegramId_objectId_key" ON "public"."ClientBinding"("telegramId", "objectId");

-- CreateIndex
CREATE UNIQUE INDEX "DeputyAdminAssignment_deputyAdminId_objectId_key" ON "public"."DeputyAdminAssignment"("deputyAdminId", "objectId");

-- CreateIndex
CREATE INDEX "ObjectStructure_objectId_idx" ON "public"."ObjectStructure"("objectId");

-- CreateIndex
CREATE INDEX "ObjectStructure_objectName_idx" ON "public"."ObjectStructure"("objectName");

-- CreateIndex
CREATE INDEX "ReportingTask_objectId_idx" ON "public"."ReportingTask"("objectId");

-- CreateIndex
CREATE INDEX "ReportingTask_assignedToId_idx" ON "public"."ReportingTask"("assignedToId");

-- CreateIndex
CREATE INDEX "ReportingTask_status_idx" ON "public"."ReportingTask"("status");

-- CreateIndex
CREATE INDEX "ReportingTaskComment_taskId_idx" ON "public"."ReportingTaskComment"("taskId");

-- CreateIndex
CREATE INDEX "ReportingTaskComment_authorId_idx" ON "public"."ReportingTaskComment"("authorId");

-- CreateIndex
CREATE INDEX "ReportingTaskAttachment_taskId_idx" ON "public"."ReportingTaskAttachment"("taskId");

-- CreateIndex
CREATE INDEX "ReportingTaskAttachment_uploadedById_idx" ON "public"."ReportingTaskAttachment"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "ExcludedObject_objectId_key" ON "public"."ExcludedObject"("objectId");

-- CreateIndex
CREATE INDEX "TaskExecution_managerId_scheduledFor_idx" ON "public"."TaskExecution"("managerId", "scheduledFor");

-- CreateIndex
CREATE INDEX "TaskExecution_objectId_scheduledFor_idx" ON "public"."TaskExecution"("objectId", "scheduledFor");

-- CreateIndex
CREATE INDEX "TaskExecution_status_scheduledFor_idx" ON "public"."TaskExecution"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "TaskExecution_techCardId_scheduledFor_idx" ON "public"."TaskExecution"("techCardId", "scheduledFor");

-- AddForeignKey
ALTER TABLE "public"."Room" ADD CONSTRAINT "Room_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "public"."CleaningObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Room" ADD CONSTRAINT "Room_roomGroupId_fkey" FOREIGN KEY ("roomGroupId") REFERENCES "public"."RoomGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Site" ADD CONSTRAINT "Site_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "public"."CleaningObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Site" ADD CONSTRAINT "Site_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Zone" ADD CONSTRAINT "Zone_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "public"."Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomGroup" ADD CONSTRAINT "RoomGroup_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "public"."Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CleaningObjectItem" ADD CONSTRAINT "CleaningObjectItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechCard" ADD CONSTRAINT "TechCard_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechCard" ADD CONSTRAINT "TechCard_cleaningObjectItemId_fkey" FOREIGN KEY ("cleaningObjectItemId") REFERENCES "public"."CleaningObjectItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Checklist" ADD CONSTRAINT "Checklist_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Checklist" ADD CONSTRAINT "Checklist_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryLimit" ADD CONSTRAINT "InventoryLimit_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "public"."CleaningObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryLimit" ADD CONSTRAINT "InventoryLimit_setById_fkey" FOREIGN KEY ("setById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryExpense" ADD CONSTRAINT "InventoryExpense_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "public"."CleaningObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryExpense" ADD CONSTRAINT "InventoryExpense_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhotoReport" ADD CONSTRAINT "PhotoReport_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientBinding" ADD CONSTRAINT "ClientBinding_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "public"."CleaningObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdditionalTask" ADD CONSTRAINT "AdditionalTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdditionalTask" ADD CONSTRAINT "AdditionalTask_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdditionalTask" ADD CONSTRAINT "AdditionalTask_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "public"."CleaningObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeputyAdminAssignment" ADD CONSTRAINT "DeputyAdminAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeputyAdminAssignment" ADD CONSTRAINT "DeputyAdminAssignment_deputyAdminId_fkey" FOREIGN KEY ("deputyAdminId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeputyAdminAssignment" ADD CONSTRAINT "DeputyAdminAssignment_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "public"."CleaningObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ObjectStructure" ADD CONSTRAINT "ObjectStructure_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "public"."CleaningObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReportingTask" ADD CONSTRAINT "ReportingTask_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "public"."CleaningObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReportingTask" ADD CONSTRAINT "ReportingTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReportingTask" ADD CONSTRAINT "ReportingTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReportingTaskComment" ADD CONSTRAINT "ReportingTaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."ReportingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReportingTaskComment" ADD CONSTRAINT "ReportingTaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReportingTaskAttachment" ADD CONSTRAINT "ReportingTaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."ReportingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReportingTaskAttachment" ADD CONSTRAINT "ReportingTaskAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExcludedObject" ADD CONSTRAINT "ExcludedObject_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "public"."CleaningObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExcludedObject" ADD CONSTRAINT "ExcludedObject_excludedById_fkey" FOREIGN KEY ("excludedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskExecution" ADD CONSTRAINT "TaskExecution_techCardId_fkey" FOREIGN KEY ("techCardId") REFERENCES "public"."TechCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskExecution" ADD CONSTRAINT "TaskExecution_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "public"."CleaningObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskExecution" ADD CONSTRAINT "TaskExecution_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_admin_comments" ADD CONSTRAINT "task_admin_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_admin_comments" ADD CONSTRAINT "task_admin_comments_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_admin_comments" ADD CONSTRAINT "task_admin_comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "public"."task_admin_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_relatedTaskId_fkey" FOREIGN KEY ("relatedTaskId") REFERENCES "public"."Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
