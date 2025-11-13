-- =========================================
-- СКРИПТ ДОБАВЛЕНИЯ ИНДЕКСОВ ДЛЯ ОПТИМИЗАЦИИ ПРОИЗВОДИТЕЛЬНОСТИ
-- Дата: 13 ноября 2025
-- Цель: Ускорить запросы к Task, CleaningObject, TechCard, Checklist
-- =========================================

-- Индексы для Task (календарь задач)
CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status");
CREATE INDEX IF NOT EXISTS "Task_objectName_idx" ON "Task"("objectName");
CREATE INDEX IF NOT EXISTS "Task_completedAt_idx" ON "Task"("completedAt");
CREATE INDEX IF NOT EXISTS "Task_completedById_idx" ON "Task"("completedById");
CREATE INDEX IF NOT EXISTS "Task_checklistId_idx" ON "Task"("checklistId");
CREATE INDEX IF NOT EXISTS "Task_status_completedAt_idx" ON "Task"("status", "completedAt");
CREATE INDEX IF NOT EXISTS "Task_objectName_status_idx" ON "Task"("objectName", "status");
CREATE INDEX IF NOT EXISTS "Task_scheduledStart_idx" ON "Task"("scheduledStart");

-- Индексы для CleaningObject (список объектов)
CREATE INDEX IF NOT EXISTS "CleaningObject_managerId_idx" ON "CleaningObject"("managerId");
CREATE INDEX IF NOT EXISTS "CleaningObject_name_idx" ON "CleaningObject"("name");
CREATE INDEX IF NOT EXISTS "CleaningObject_createdAt_idx" ON "CleaningObject"("createdAt");

-- Индексы для TechCard (техкарты)
CREATE INDEX IF NOT EXISTS "TechCard_objectId_idx" ON "TechCard"("objectId");
CREATE INDEX IF NOT EXISTS "TechCard_isActive_idx" ON "TechCard"("isActive");
CREATE INDEX IF NOT EXISTS "TechCard_objectId_isActive_idx" ON "TechCard"("objectId", "isActive");
CREATE INDEX IF NOT EXISTS "TechCard_frequency_idx" ON "TechCard"("frequency");

-- Индексы для Checklist (чеклисты)
CREATE INDEX IF NOT EXISTS "Checklist_objectId_idx" ON "Checklist"("objectId");
CREATE INDEX IF NOT EXISTS "Checklist_date_idx" ON "Checklist"("date");
CREATE INDEX IF NOT EXISTS "Checklist_objectId_date_idx" ON "Checklist"("objectId", "date");
CREATE INDEX IF NOT EXISTS "Checklist_completedAt_idx" ON "Checklist"("completedAt");

-- Вывод результата
SELECT 'Индексы успешно созданы!' AS result;
