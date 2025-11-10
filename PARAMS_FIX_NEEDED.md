# ⚠️ КРИТИЧЕСКАЯ ПРОБЛЕМА: params.id без await

## 🐛 ОПИСАНИЕ ПРОБЛЕМЫ

В Next.js 15 параметры маршрута (`params`) стали **асинхронными**. Это означает, что нужно использовать `await params` перед доступом к `params.id`.

**Симптомы:**
- Удаление объектов не работает (нет ошибок, но объект не удаляется)
- GET/POST/PUT/DELETE запросы могут работать некорректно
- Параметры маршрута возвращают `undefined`

---

## ✅ УЖЕ ИСПРАВЛЕНО

1. ✅ `src/app/api/objects/[id]/route.ts` - DELETE метод
2. ✅ `src/app/api/objects/[id]/structures/route.ts` - GET, POST методы

---

## ❌ ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ (17 файлов)

### Критичные (влияют на удаление):

1. **src/app/api/sites/[id]/route.ts** (7 мест)
   - Строки: 20, 87, 113, 153, 236, 256, 265
   - Влияет на GET, PUT, DELETE участков

2. **src/app/api/rooms/[id]/route.ts** (3 места)
   - Строки: 16, 64, 96
   - Влияет на GET, PUT, DELETE помещений

3. **src/app/api/managers/[id]/route.ts** (2 места)
   - Строки: 35, 212
   - Влияет на GET, DELETE менеджеров

### Менее критичные:

4. src/app/api/admin/users/[id]/reset-password/route.ts (1 место)
5. src/app/api/managers/[id]/details/route.ts (1 место)
6. src/app/api/managers/[id]/reset-password/route.ts (1 место)
7. src/app/api/objects/[id]/assign-manager/route.ts (1 место)
8. src/app/api/objects/[id]/manager-edit/route.ts (1 место)
9. src/app/api/objects/[id]/remove-manager/route.ts (1 место)
10. src/app/api/reporting/objects/[id]/tasks/route.ts (2 места)
11. src/app/api/reporting/tasks/[id]/attachments/route.ts (2 места)
12. src/app/api/reporting/tasks/[id]/comments/route.ts (6 мест)
13. src/app/api/reporting/tasks/[id]/route.ts (8 мест)
14. src/app/api/sites/[id]/assign-manager/route.ts (3 места)
15. src/app/api/tasks/[id]/admin-comment/route.ts (2 места)
16. src/app/api/users/[id]/route.ts (2 места)

---

## 🔧 КАК ИСПРАВИТЬ

### БЫЛО (неправильно):
```typescript
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.cleaningObject.delete({
      where: { id: params.id }, // ❌ ОШИБКА
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Не удалось удалить' }, { status: 500 });
  }
}
```

### СТАЛО (правильно):
```typescript
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params; // ✅ ПРАВИЛЬНО
    
    await prisma.cleaningObject.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('❌ Ошибка удаления:', error);
    return NextResponse.json({ message: 'Не удалось удалить' }, { status: 500 });
  }
}
```

---

## 🧪 ПРОВЕРКА

Запустите скрипт для поиска проблем:

```powershell
npx tsx scripts/find-params-issues.ts
```

**Ожидаемый результат после исправления:**
```
✅ Проблем не найдено! Все файлы используют await params.
```

---

## 📝 ИСТОРИЯ

- **09.11.2025 14:15** - Обнаружена проблема с удалением объектов
- **09.11.2025 14:20** - Найдена причина: params.id без await
- **09.11.2025 14:25** - Исправлен DELETE метод в `/api/objects/[id]/route.ts`
- **09.11.2025 14:30** - Найдено 17 файлов с аналогичной проблемой

---

## ⚠️ ВАЖНО

Эта проблема появилась после обновления Next.js или изменения конфигурации. Все новые файлы должны использовать `await params` с самого начала.

**Правило:** ВСЕГДА добавляйте `const { id } = await params;` в начале функций, которые используют параметры маршрута.
