# 🔧 Исправление ошибок сборки на Vercel

## ❌ Проблемы:

### 1. **Database connection error во время build**
```
Can't reach database server at `8019cf361ee22f22947d5d32.twc1.net:5432`
Error occurred prerendering page "/requests"
```

**Причина:** Next.js пытается подключиться к базе данных во время статической генерации страниц (build-time), но база недоступна.

### 2. **Viewport warnings**
```
⚠ Unsupported metadata viewport is configured in metadata export
Please move it to viewport export instead
```

**Причина:** Next.js 15 требует вынести `viewport` из `metadata` в отдельный `export`.

---

## ✅ Исправления:

### 1. **Исправлены страницы с database queries:**

#### `src/app/requests/page.tsx` ✅
```typescript
// Добавлено:
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Удалено:
// - async function getRequests()
// - await prisma.request.findMany()
// - Передача initialRequests с сервера

// Теперь данные загружаются на клиенте через API
```

#### `src/app/audit/page.tsx` ✅
```typescript
// Добавлено:
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Удалено:
// - async function getUsers()
// - await prisma.user.findMany()
// - Передача users с сервера

// Теперь данные загружаются на клиенте через API
```

### 2. **Исправлен viewport в главном layout:**

#### `src/app/layout.tsx` ✅
```typescript
// Было:
export const metadata: Metadata = {
  title: "Клининг-Контроль",
  description: "Система управления клининговыми услугами",
  viewport: { ... }, // ❌ Неправильно
};

// Стало:
export const metadata: Metadata = {
  title: "Клининг-Контроль",
  description: "Система управления клининговыми услугами",
};

export const viewport: Viewport = { // ✅ Правильно
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};
```

---

## 🚀 Что нужно сделать:

### Шаг 1: Запустить скрипт для удаления viewport из всех страниц

```bash
node scripts/fix-viewport.js
```

Этот скрипт автоматически удалит `viewport` из всех `page.tsx` файлов, кроме главного `layout.tsx`.

**Viewport будет наследоваться из главного layout автоматически!**

### Шаг 2: Проверить другие страницы с database queries

Если есть другие страницы, которые делают запросы к базе во время build, нужно добавить:

```typescript
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

Или переместить загрузку данных на клиент.

### Шаг 3: Закоммитить изменения

```bash
git add .
git commit -m "fix: исправлены ошибки сборки - отключена статическая генерация для requests и audit, исправлен viewport"
git push
```

---

## 📋 Проверка перед деплоем:

### Локальная сборка:
```bash
npm run build
```

Должно пройти без ошибок!

### Проверить:
- ✅ Нет ошибок подключения к базе
- ✅ Нет предупреждений о viewport
- ✅ Все страницы собираются успешно

---

## 🎯 Результат:

После этих исправлений:

1. ✅ **Build пройдет успешно** - нет попыток подключения к базе во время сборки
2. ✅ **Нет предупреждений** - viewport вынесен правильно
3. ✅ **Данные загружаются динамически** - через API на клиенте
4. ✅ **Мобильная адаптация работает** - viewport настроен правильно

---

## 📊 Статистика изменений:

### Исправлено файлов: **3**
- `src/app/layout.tsx` - исправлен viewport
- `src/app/requests/page.tsx` - отключена статическая генерация
- `src/app/audit/page.tsx` - отключена статическая генерация

### Создано файлов: **2**
- `scripts/fix-viewport.js` - скрипт для автоматического исправления
- `FIX_VIEWPORT_WARNINGS.md` - документация

---

## 🔍 Дополнительная информация:

### Почему `force-dynamic`?

```typescript
export const dynamic = 'force-dynamic';
```

Это говорит Next.js, что страница должна рендериться динамически (на каждый запрос), а не статически (во время build).

### Почему `revalidate = 0`?

```typescript
export const revalidate = 0;
```

Это отключает кеширование страницы. Данные всегда будут свежими.

### Альтернативы:

1. **Использовать API routes** - данные загружаются через `/api/*` endpoints
2. **Использовать client-side fetching** - данные загружаются на клиенте
3. **Использовать ISR** - Incremental Static Regeneration (для данных, которые редко меняются)

**Мы выбрали вариант 2** - client-side fetching через API routes.

---

## ✅ Готово к деплою!

После выполнения всех шагов проект готов к деплою на Vercel.

**Следующий deploy должен пройти успешно!** 🚀
