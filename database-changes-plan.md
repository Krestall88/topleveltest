# План изменений базы данных

## 1. Новая роль DEPUTY_ADMIN

### Изменения в enum Role:
```prisma
enum Role {
  ADMIN         // Главный администратор - полные права
  DEPUTY_ADMIN  // Второй администратор - права как у админа, но только по назначенным объектам
  DEPUTY        // Заместитель - полные права как у админа (старая роль)
  MANAGER       // Менеджер объекта - ограниченные права
  CLIENT        // Клиент - только заявки
}
```

### Новая модель для назначения объектов DEPUTY_ADMIN:
```prisma
model DeputyAdminAssignment {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  
  deputyAdminId String
  deputyAdmin   User   @relation("DeputyAdminAssignments", fields: [deputyAdminId], references: [id])
  
  objectId String
  object   CleaningObject @relation("DeputyAdminObjects", fields: [objectId], references: [id])
  
  assignedById String
  assignedBy   User   @relation("AssignedDeputyAdmins", fields: [assignedById], references: [id])
  
  @@unique([deputyAdminId, objectId])
}
```

## 2. Настройки обязательности фото для объектов

### Добавить поле в CleaningObject:
```prisma
model CleaningObject {
  // ... существующие поля
  requirePhotoForCompletion Boolean @default(false) // Обязательность фото для закрытия чек-листов
}
```

## 3. Расширение функционала отчетности

### Добавить поля в Task:
```prisma
model Task {
  // ... существующие поля
  completionComment String?   // Комментарий при выполнении
  completionPhotos  String[]  // Массив URL фотографий при выполнении
}
```

### Добавить поля в Checklist:
```prisma
model Checklist {
  // ... существующие поля
  completionComment String?   // Общий комментарий по чек-листу
  completionPhotos  String[]  // Фотографии по всему чек-листу
  completedAt       DateTime? // Время завершения чек-листа
  completedById     String?   // Кто завершил чек-лист
  completedBy       User?     @relation("CompletedChecklists", fields: [completedById], references: [id])
}
```

## 4. Обновление связей в User модели

### Добавить новые связи:
```prisma
model User {
  // ... существующие поля
  deputyAdminAssignments   DeputyAdminAssignment[] @relation("DeputyAdminAssignments")
  assignedDeputyAdmins     DeputyAdminAssignment[] @relation("AssignedDeputyAdmins")
  completedChecklists      Checklist[]            @relation("CompletedChecklists")
}
```

## 5. Обновление связей в CleaningObject модели

### Добавить новые связи:
```prisma
model CleaningObject {
  // ... существующие поля
  deputyAdminAssignments DeputyAdminAssignment[] @relation("DeputyAdminObjects")
}
```

## 6. Статусы задач

### Обновить TaskStatus (уже есть нужные статусы):
```prisma
enum TaskStatus {
  NEW
  AVAILABLE           // Задача доступна для выполнения
  IN_PROGRESS
  COMPLETED
  OVERDUE             // Просрочена
  FAILED              // Не выполнена с причиной
  CLOSED_WITH_PHOTO   // Закрыта с фото
}
```

## Миграция данных

1. Добавить новые поля с значениями по умолчанию
2. Создать новые связи
3. Обновить существующие записи при необходимости
4. Протестировать целостность данных
