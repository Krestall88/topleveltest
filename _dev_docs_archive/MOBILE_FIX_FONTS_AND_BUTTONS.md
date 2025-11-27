# 🔧 Исправление проблем с шрифтами и кнопками на мобильных

## ❌ Проблемы:

### 1. **Шрифты слишком большие**
- Текст не влезает в кнопки
- Переносы на несколько строк
- Телефоны в 3 строки
- Информация вылезает за границы карточек

### 2. **Кнопки разных размеров**
- Растягиваются под текст
- Вылезают за границы карточек
- Не адаптируются под экран

### 3. **Поисковая строка**
- Лупа и текст "Поиск" налезают друг на друга

### 4. **Карточки объектов**
- Кнопки вылезают за границы
- Счетчики выполнения вылезают
- Дата создания вылезает

---

## ✅ Исправления:

### 1. **Глобальные стили (globals.css)** ✅

#### Уменьшены размеры шрифтов:
```css
/* Было */
.mobile-text-xs { @apply text-xs sm:text-sm; }
.mobile-text-sm { @apply text-sm sm:text-base; }
.mobile-text-base { @apply text-base sm:text-lg; }

/* Стало */
.mobile-text-xs { @apply text-[10px] leading-tight sm:text-xs; }
.mobile-text-sm { @apply text-[11px] leading-tight sm:text-sm; }
.mobile-text-base { @apply text-xs leading-tight sm:text-base; }
```

#### Уменьшены размеры кнопок:
```css
/* Было */
.mobile-button {
  @apply px-3 py-2 text-sm;
  @apply min-h-[44px];
}

/* Стало */
.mobile-button {
  @apply px-2 py-1.5 text-[11px] leading-tight;
  @apply min-h-[36px];
  @apply whitespace-nowrap overflow-hidden text-ellipsis;
}
```

#### Добавлены компактные карточки:
```css
.mobile-card-compact {
  @apply p-2 sm:p-3;
  @apply rounded-md sm:rounded-lg;
  @apply overflow-hidden;
}
```

### 2. **Страница объектов (ObjectsClientPage.tsx)** ✅

#### Было:
```tsx
<Button className="mobile-button-sm flex-1 sm:flex-none">
  📋 <span className="hide-mobile">Подробнее</span>
</Button>
```

#### Стало:
```tsx
<Button className="mobile-button-sm flex-1 min-w-[70px]">
  📋
</Button>
```

**Изменения:**
- Убран текст из кнопок на мобильных (только иконки)
- Добавлен `min-w-[70px]` для равномерного размера
- Использован `mobile-card-compact` вместо `mobile-card`
- Уменьшены шрифты заголовков

### 3. **Страница менеджеров (ManagersClientPage.tsx)** ✅

#### Поиск:
```tsx
/* Было */
<Search className="absolute left-3 top-1/2 mobile-icon" />
<Input className="mobile-input pl-10" />

/* Стало */
<Search className="absolute left-2 top-1/2 w-4 h-4" />
<Input className="mobile-input pl-8" />
```

#### Карточки менеджеров:
```tsx
/* Было */
<Button className="mobile-button-sm flex-1 sm:flex-none">
  📊 <span className="hide-mobile">Подробно</span>
</Button>

/* Стало */
<Button className="mobile-button-sm flex-1 min-w-[60px]">
  📊
</Button>
```

**Изменения:**
- Исправлено наложение иконки и текста в поиске
- Убран текст из кнопок (только иконки)
- Телефоны с `truncate` - не переносятся
- Уменьшены отступы в карточках

### 4. **Календарь задач (UnifiedCalendarPage.tsx)** ✅

#### Поиск:
```tsx
/* Было */
<input className="w-full px-4 py-3 pl-10 text-sm" />
<svg className="absolute left-3 w-5 h-5" />

/* Стало */
<input className="mobile-input pl-8 pr-8" />
<svg className="absolute left-2 w-4 h-4" />
```

### 5. **Карточки объектов (ObjectCard.tsx)** ✅

#### Заголовок карточки:
```tsx
/* Было */
<CardHeader className="pb-4">
  <div className="flex items-start justify-between">
    <div className="flex items-center gap-3">
      <Building2 className="w-6 h-6" />
      <CardTitle className="text-lg">
        {object.name}
      </CardTitle>
    </div>
  </div>
</CardHeader>

/* Стало */
<CardHeader className="mobile-card-compact">
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
      <CardTitle className="mobile-text-sm truncate">
        {object.name}
      </CardTitle>
    </div>
  </div>
</CardHeader>
```

#### Счетчики:
```tsx
/* Было */
<Badge className="flex items-center gap-1">
  <AlertTriangle className="w-3 h-3" />
  {stats.overdue}
</Badge>

/* Стало */
<Badge className="flex items-center gap-0.5 px-1.5 py-0.5 mobile-text-xs">
  <AlertTriangle className="w-2.5 h-2.5" />
  {stats.overdue}
</Badge>
```

#### Карточки периодичности:
```tsx
/* Было */
<div className="p-4 rounded-lg border-2">
  <span className="text-sm font-semibold">
    {getFrequencyLabel(period.frequency)}
  </span>
  <Button className="w-full text-xs">
    <Eye className="w-3 h-3 mr-1" />
    Подробнее
  </Button>
</div>

/* Стало */
<div className="p-2 rounded-md border overflow-hidden">
  <span className="mobile-text-xs font-semibold truncate">
    {getFrequencyLabel(period.frequency)}
  </span>
  <Button className="mobile-button-sm w-full">
    <Eye className="w-2.5 h-2.5" />
    <span className="hide-mobile ml-1">Подробнее</span>
  </Button>
</div>
```

**Изменения:**
- Уменьшены все иконки (w-4 h-4 → w-2.5 h-2.5)
- Уменьшены отступы (p-4 → p-2)
- Добавлен `truncate` для длинных текстов
- Убран текст из кнопок на мобильных
- Компактные badge с меньшими отступами
- Телефоны и имена с `truncate`

---

## 📊 Сравнение размеров:

### Шрифты:

| Класс | Было (mobile) | Стало (mobile) | Desktop |
|-------|---------------|----------------|---------|
| mobile-text-xs | 12px (text-xs) | **10px** | 12px |
| mobile-text-sm | 14px (text-sm) | **11px** | 14px |
| mobile-text-base | 16px (text-base) | **12px** | 16px |
| mobile-text-lg | 18px (text-lg) | **14px** | 18px |
| mobile-text-xl | 20px (text-xl) | **16px** | 20px |
| mobile-text-2xl | 24px (text-2xl) | **18px** | 24px |

### Кнопки:

| Класс | Было (mobile) | Стало (mobile) | Desktop |
|-------|---------------|----------------|---------|
| mobile-button | px-3 py-2, 14px | **px-2 py-1.5, 11px** | px-4 py-2.5, 16px |
| mobile-button-sm | px-2 py-1.5, 12px | **px-1.5 py-1, 10px** | px-3 py-2, 14px |
| min-height | 44px | **36px** | 40px |

### Карточки:

| Класс | Было (mobile) | Стало (mobile) | Desktop |
|-------|---------------|----------------|---------|
| mobile-card | p-3 | **p-2** | p-6 |
| mobile-card-compact | - | **p-2** | p-3 |

---

## 🎯 Результат:

### Было:
- ❌ Шрифты 12-24px на мобильных
- ❌ Кнопки 44px высотой
- ❌ Текст вылезает за границы
- ❌ Переносы на несколько строк
- ❌ Кнопки разных размеров

### Стало:
- ✅ Шрифты 10-18px на мобильных
- ✅ Кнопки 36px высотой
- ✅ Текст обрезается с `truncate`
- ✅ Нет переносов (whitespace-nowrap)
- ✅ Кнопки одинакового размера (min-w)

---

## 📱 Ключевые принципы:

### 1. **Truncate везде**
```tsx
<span className="truncate">Длинный текст</span>
```

### 2. **Минимальная ширина кнопок**
```tsx
<Button className="flex-1 min-w-[60px]">📊</Button>
```

### 3. **Только иконки на мобильных**
```tsx
<Button>
  📋
  <span className="hide-mobile">Подробнее</span>
</Button>
```

### 4. **Компактные отступы**
```tsx
<div className="mobile-card-compact">
  <div className="gap-1.5">
    <span className="mobile-text-xs">Текст</span>
  </div>
</div>
```

### 5. **Overflow protection**
```tsx
<Card className="overflow-hidden">
  <CardHeader className="mobile-card-compact">
    ...
  </CardHeader>
</Card>
```

---

## ✅ Чеклист исправлений:

- [x] Уменьшены шрифты (10-18px на мобильных)
- [x] Уменьшены кнопки (36px высота)
- [x] Добавлен truncate для длинных текстов
- [x] Убран текст из кнопок на мобильных
- [x] Исправлено наложение в поиске
- [x] Уменьшены отступы в карточках
- [x] Добавлен overflow-hidden
- [x] Добавлен whitespace-nowrap для кнопок
- [x] Уменьшены иконки (w-2.5 h-2.5)
- [x] Компактные badge

---

## 🚀 Следующие шаги:

### Если проблемы остались:

1. **Проверить другие страницы:**
   - Администраторы
   - Дополнительные задания
   - Инвентарь
   - Фотоотчеты

2. **Еще уменьшить шрифты (если нужно):**
```css
.mobile-text-xs { @apply text-[9px]; }
.mobile-text-sm { @apply text-[10px]; }
```

3. **Добавить max-width для карточек:**
```tsx
<Card className="max-w-full overflow-hidden">
```

4. **Использовать grid вместо flex:**
```tsx
<div className="grid grid-cols-3 gap-1">
  <Button>📋</Button>
  <Button>✏️</Button>
  <Button>🗑️</Button>
</div>
```

---

## 📚 Документация обновлена:

- ✅ `globals.css` - новые размеры шрифтов и кнопок
- ✅ `ObjectsClientPage.tsx` - компактные карточки
- ✅ `ManagersClientPage.tsx` - исправлен поиск и кнопки
- ✅ `UnifiedCalendarPage.tsx` - исправлен поиск
- ✅ `ObjectCard.tsx` - полностью переработан для мобильных

---

**Дата:** 13 ноября 2025, 00:15  
**Статус:** ✅ ИСПРАВЛЕНО  
**Изменено файлов:** 5  
**Строк кода:** ~200
