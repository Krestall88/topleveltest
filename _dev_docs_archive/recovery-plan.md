# ПЛАН ВОССТАНОВЛЕНИЯ БАЗЫ ДАННЫХ

## 🚨 Текущая ситуация
- Потеряны: помещения, структуры, техкарты, задачи, фотоотчеты
- Сохранены: объекты (только названия), пользователи, задачи отчетности

## 📋 Что добавлено с 26 октября 2025, 15:02

### 1. Новая таблица ReportingTaskAttachment
```sql
model ReportingTaskAttachment {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  
  fileName     String
  originalName String
  fileSize     Int
  mimeType     String
  filePath     String
  
  taskId       String
  task         ReportingTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
  uploadedById String
  uploadedBy   User @relation("ReportingTaskAttachments", fields: [uploadedById], references: [id])
  
  @@index([taskId])
  @@index([uploadedById])
}
```

### 2. Обновления в User модели
- Добавлено поле для связи с ReportingTaskAttachment:
```sql
reportingTaskAttachments ReportingTaskAttachment[] @relation("ReportingTaskAttachments")
```

### 3. Новые файлы
- `src/app/api/reporting/tasks/[id]/attachments/route.ts`
- Обновлен `src/components/ReportingTaskModal.tsx`

### 4. Критически важные файлы (НЕ ТРОГАТЬ!)
- `src/lib/unified-task-system.ts`
- `src/app/api/tasks/unified-complete/route.ts`
- `src/components/UnifiedTaskCompletionModal.tsx`
- `src/components/SimpleTaskListModal.tsx`

## 🔄 РЕКОМЕНДУЕМЫЕ ДЕЙСТВИЯ

### Вариант 1: Полное восстановление (РЕКОМЕНДУЕТСЯ)
1. Восстановить базу из резервной копии 26.10.2025 15:02
2. Применить миграцию для добавления ReportingTaskAttachment
3. Добавить новые API и компоненты

### Вариант 2: Частичное восстановление (РИСКОВАННО)
1. Экспортировать текущих пользователей и задачи отчетности
2. Восстановить базу из резервной копии
3. Импортировать сохраненные данные
4. Применить новые изменения

## ⚠️ РИСКИ
- При полном восстановлении потеряются изменения с 26 октября
- При частичном восстановлении могут быть конфликты ID
