# 🔄 ТРЕБУЕТСЯ ПЕРЕЗАПУСК DEV SERVER

## ✅ Исправлена ошибка

### ❌ Была ошибка:
```
Unknown argument `isActive`. Available options are marked with ?.
```

### ✅ Что исправлено:

#### 1. `src/app/api/inventory/financial-report/route.ts`
**Было:**
```typescript
const categoryLimits = await prisma.expenseCategoryLimit.findMany({
  where: {
    objectId: object.id,
    isActive: true,  // ❌ Ошибка! Нет такого поля в ExpenseCategoryLimit
    ...
  }
});
```

**Стало:**
```typescript
const categoryLimits = await prisma.expenseCategoryLimit.findMany({
  where: {
    objectId: object.id,
    category: {
      isActive: true  // ✅ Проверяем через связь с ExpenseCategory
    },
    ...
  }
});
```

#### 2. `src/app/api/inventory/chart-data/route.ts`
Аналогичное исправление - проверка `isActive` теперь через связь с `category`.

---

## 🚀 Что нужно сделать

### Перезапустить dev server

```bash
# 1. Остановить dev server (Ctrl+C в терминале)

# 2. Запустить снова
npm run dev
```

**Всё!** Больше ничего делать не нужно.

---

## 📋 Что произойдет после перезапуска

### ✅ Ожидаемый результат:

1. **Страница `/inventory` загрузится**
   - Данные по объектам отобразятся
   - Лимиты по статьям будут учтены

2. **В терминале будет:**
   ```
   ✓ Compiled /api/inventory/financial-report in XXXms
   GET /api/inventory/financial-report?month=11&year=2025 200 in XXXms
   ```
   (Статус 200 вместо 500!)

3. **В браузере:**
   - Нет ошибок в консоли
   - Данные загружены
   - Лимиты отображаются корректно

---

## 🔍 Техническая информация

### Почему была ошибка?

**Схема Prisma:**
```prisma
// ExpenseCategory - имеет isActive
model ExpenseCategory {
  id          String   @id
  name        String
  isActive    Boolean  @default(true)  // ✅ Есть поле
  limits      ExpenseCategoryLimit[]
}

// ExpenseCategoryLimit - НЕ имеет isActive
model ExpenseCategoryLimit {
  id         String   @id
  amount     Decimal
  objectId   String
  categoryId String
  category   ExpenseCategory @relation(...)  // Связь с категорией
  // ❌ НЕТ поля isActive
}
```

**Решение:**
Вместо проверки `isActive` напрямую в `ExpenseCategoryLimit`, проверяем через связь:
```typescript
where: {
  category: {
    isActive: true  // Проверяем isActive в связанной ExpenseCategory
  }
}
```

---

## ✅ Готово!

После перезапуска dev server всё заработает!

```bash
# Просто перезапустите:
npm run dev
```
