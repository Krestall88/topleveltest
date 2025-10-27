# ДЕЙСТВИЯ ПОСЛЕ ВОССТАНОВЛЕНИЯ БАЗЫ

## 🔄 Что восстановится автоматически:
- ✅ Все объекты с полными данными
- ✅ Все помещения и структуры
- ✅ Все техкарты
- ✅ Все задачи
- ✅ Все фотоотчеты
- ✅ Назначения менеджеров

## 📝 Что нужно будет добавить заново:

### 1. Обновление схемы Prisma
```bash
# Добавлю новую таблицу в schema.prisma
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

# И добавлю связь в User:
reportingTaskAttachments ReportingTaskAttachment[] @relation("ReportingTaskAttachments")
```

### 2. Применение миграции
```bash
npx prisma db push
npx prisma generate
```

### 3. Добавление новых файлов
- `src/app/api/reporting/tasks/[id]/attachments/route.ts`
- Обновления в `src/components/ReportingTaskModal.tsx`

### 4. Проверка критически важных файлов
- `src/lib/unified-task-system.ts` - НЕ ТРОГАТЬ!
- `src/app/api/tasks/unified-complete/route.ts` - НЕ ТРОГАТЬ!
- `src/components/UnifiedTaskCompletionModal.tsx` - НЕ ТРОГАТЬ!
- `src/components/SimpleTaskListModal.tsx` - НЕ ТРОГАТЬ!

## ⏱️ Время выполнения: 10-15 минут

## 🎯 Результат:
- Полностью восстановленная база данных
- Добавленный функционал фотографий в задачах отчетности
- Все критически важные настройки сохранены
