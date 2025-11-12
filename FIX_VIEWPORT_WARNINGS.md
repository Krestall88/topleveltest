# 🔧 Исправление предупреждений viewport

## ⚠️ Проблема:

Next.js 15 требует, чтобы `viewport` был вынесен из `metadata` в отдельный `export`.

## ✅ Исправлено:

### 1. `src/app/layout.tsx` - главный layout ✅
### 2. `src/app/requests/page.tsx` - отключена статическая генерация ✅
### 3. `src/app/audit/page.tsx` - отключена статическая генерация ✅

---

## 📋 Нужно исправить в других страницах:

Для всех страниц, где есть предупреждение о viewport, нужно:

### Было:
```typescript
export const metadata: Metadata = {
  title: "Название",
  description: "Описание",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};
```

### Стало:
```typescript
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Название",
  description: "Описание",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};
```

---

## 📝 Список страниц для исправления:

Если в этих страницах есть viewport в metadata, нужно его вынести:

- [ ] `/analytics`
- [ ] `/auth/login`
- [ ] `/checklists/auto`
- [ ] `/checklists`
- [ ] `/completion-settings`
- [ ] `/deputy-admins`
- [ ] `/import-excel`
- [ ] `/inventory`
- [ ] `/login`
- [ ] `/managers`
- [ ] `/mobile`
- [ ] `/notifications`
- [ ] `/objects`
- [ ] `/objects/reporting-settings`
- [ ] `/` (главная)
- [ ] `/reporting`
- [ ] `/reports`
- [ ] `/run-scheduler`
- [ ] `/setup-telegram`
- [ ] `/sites`
- [ ] `/system-check`
- [ ] `/telegram`
- [ ] `/test-expense`

---

## 🚀 Автоматическое исправление:

Можно использовать поиск и замену во всех файлах:

### Шаг 1: Добавить импорт Viewport
Найти:
```typescript
import type { Metadata } from "next";
```

Заменить на:
```typescript
import type { Metadata, Viewport } from "next";
```

### Шаг 2: Вынести viewport
Найти:
```typescript
export const metadata: Metadata = {
  title: "([^"]+)",
  description: "([^"]+)",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};
```

Заменить на:
```typescript
export const metadata: Metadata = {
  title: "$1",
  description: "$2",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};
```

---

## ⚡ Быстрое решение:

Если viewport используется только в главном layout, можно просто удалить его из всех дочерних страниц - он унаследуется автоматически!

**Рекомендация:** Удалите viewport из всех страниц кроме `src/app/layout.tsx`

---

## ✅ Результат:

После исправления build должен пройти без предупреждений о viewport.
