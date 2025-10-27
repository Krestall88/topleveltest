
-- Добавляем таблицу ReportingTaskAttachment если её нет
CREATE TABLE IF NOT EXISTS "ReportingTaskAttachment" (
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

-- Создаем индексы
CREATE INDEX IF NOT EXISTS "ReportingTaskAttachment_taskId_idx" ON "ReportingTaskAttachment"("taskId");
CREATE INDEX IF NOT EXISTS "ReportingTaskAttachment_uploadedById_idx" ON "ReportingTaskAttachment"("uploadedById");

-- Добавляем внешние ключи
ALTER TABLE "ReportingTaskAttachment" ADD CONSTRAINT "ReportingTaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ReportingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportingTaskAttachment" ADD CONSTRAINT "ReportingTaskAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
