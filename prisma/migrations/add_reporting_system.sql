-- Добавляем поле для исключения объектов из обычных задач
ALTER TABLE "CleaningObject" ADD COLUMN "excludeFromTasks" BOOLEAN DEFAULT false;

-- Создаем таблицу для отчетных задач
CREATE TABLE "ReportingTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    
    -- Связи
    "objectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    
    CONSTRAINT "ReportingTask_pkey" PRIMARY KEY ("id")
);

-- Создаем таблицу для комментариев к отчетным задачам
CREATE TABLE "ReportingTaskComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    -- Связи
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    
    CONSTRAINT "ReportingTaskComment_pkey" PRIMARY KEY ("id")
);

-- Создаем таблицу для файловых вложений
CREATE TABLE "ReportingTaskAttachment" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Связи
    "taskId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    
    CONSTRAINT "ReportingTaskAttachment_pkey" PRIMARY KEY ("id")
);

-- Добавляем внешние ключи
ALTER TABLE "ReportingTask" ADD CONSTRAINT "ReportingTask_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "CleaningObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportingTask" ADD CONSTRAINT "ReportingTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportingTask" ADD CONSTRAINT "ReportingTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReportingTaskComment" ADD CONSTRAINT "ReportingTaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ReportingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportingTaskComment" ADD CONSTRAINT "ReportingTaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReportingTaskAttachment" ADD CONSTRAINT "ReportingTaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ReportingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportingTaskAttachment" ADD CONSTRAINT "ReportingTaskAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Создаем индексы для производительности
CREATE INDEX "ReportingTask_objectId_idx" ON "ReportingTask"("objectId");
CREATE INDEX "ReportingTask_assignedToId_idx" ON "ReportingTask"("assignedToId");
CREATE INDEX "ReportingTask_status_idx" ON "ReportingTask"("status");
CREATE INDEX "ReportingTask_createdAt_idx" ON "ReportingTask"("createdAt");

CREATE INDEX "ReportingTaskComment_taskId_idx" ON "ReportingTaskComment"("taskId");
CREATE INDEX "ReportingTaskAttachment_taskId_idx" ON "ReportingTaskAttachment"("taskId");
