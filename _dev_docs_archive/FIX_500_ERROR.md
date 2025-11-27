# 🔧 Исправление ошибки 500 в /inventory

## ❌ Проблема

```
GET http://localhost:3000/api/inventory/financial-report?month=11&year=2025 500 (Internal Server Error)
```

**Причина:** Prisma Client не обновился после добавления новых таблиц (`ExpenseCategory`, `ExpenseCategoryLimit`)

## ✅ Решение

### Шаг 1: Остановить dev server

```bash
# В терминале где запущен npm run dev
# Нажать Ctrl+C
```

### Шаг 2: Перегенерировать Prisma Client

```bash
npx prisma generate
```

**Ожидаемый результат:**
```
✔ Generated Prisma Client (v6.15.0) to .\node_modules\@prisma\client in 366ms
✔ Generated Entity-relationship-diagram (0.1.0) to .\docs\erd.md in 243ms
```

### Шаг 3: Запустить dev server

```bash
npm run dev
```

### Шаг 4: Проверить

1. Открыть http://localhost:3000/inventory
2. Убедиться что данные загружаются
3. Проверить что лимиты по статьям отображаются

---

## 🔍 Что было исправлено дополнительно

### Добавлена поддержка DEPUTY_ADMIN в API

**Файл:** `src/app/api/inventory/financial-report/route.ts`

**Добавлено:**
```typescript
// Для DEPUTY_ADMIN ограничиваем доступ только к назначенным объектам
if (user.role === 'DEPUTY_ADMIN') {
  const assignments = await prisma.deputyAdminAssignment.findMany({
    where: { deputyAdminId: user.id },
    select: { objectId: true }
  });
  
  const allowedObjectIds = assignments.map(a => a.objectId);
  
  if (objectId && !allowedObjectIds.includes(objectId)) {
    return NextResponse.json({ error: 'Access denied to this object' }, { status: 403 });
  }
  
  if (!objectId) {
    objectFilter.id = { in: allowedObjectIds };
  }
}
```

**Результат:** Заместитель администратора теперь видит только назначенные ему объекты

---

## 📝 Полная последовательность команд

```bash
# 1. Остановить dev server (Ctrl+C)

# 2. Перегенерировать Prisma Client
npx prisma generate

# 3. Запустить dev server
npm run dev

# 4. Открыть в браузере
# http://localhost:3000/inventory
```

---

## ✅ После выполнения

- ✅ Ошибка 500 исчезнет
- ✅ Данные будут загружаться в /inventory
- ✅ Лимиты по статьям будут отображаться
- ✅ DEPUTY_ADMIN будет видеть свои объекты
- ✅ Все lint ошибки исчезнут

---

## 🐛 Если проблема осталась

### Проверьте логи сервера

В терминале где запущен `npm run dev` должно быть:

```
✓ Compiled in XXXms
○ GET /api/inventory/financial-report?month=11&year=2025 200 in XXXms
```

### Если видите другую ошибку

1. Скопируйте полный текст ошибки из терминала
2. Проверьте что все миграции применены:
   ```bash
   npx prisma db push
   ```
3. Проверьте что категории загружены:
   ```bash
   npx tsx prisma/seeds/expense-categories.ts
   ```

---

## 🎉 Готово!

После выполнения всех шагов страница `/inventory` должна работать корректно!
