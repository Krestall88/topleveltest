# 🔧 Руководство по исправлению Responsive дизайна

## 📋 Таблица замен:

### Текст:
| Старый класс | Новый класс | Описание |
|--------------|-------------|----------|
| `mobile-text-xs` | `text-xs sm:text-sm` | 12px → 14px |
| `mobile-text-sm` | `text-sm sm:text-base` | 14px → 16px |
| `mobile-text-base` | `text-base sm:text-lg` | 16px → 18px |
| `mobile-text-lg` | `text-lg sm:text-xl` | 18px → 20px |
| `mobile-text-xl` | `text-xl sm:text-2xl` | 20px → 24px |
| `mobile-text-2xl` | `text-2xl sm:text-3xl` | 24px → 30px |

### Кнопки:
| Старый класс | Новый класс | Описание |
|--------------|-------------|----------|
| `mobile-button` | `px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base` | Обычная кнопка |
| `mobile-button-sm` | `px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm` | Маленькая кнопка |
| `mobile-button-lg` | `px-4 py-2.5 sm:px-6 sm:py-3.5 text-base sm:text-lg` | Большая кнопка |

### Карточки:
| Старый класс | Новый класс | Описание |
|--------------|-------------|----------|
| `mobile-card` | `p-3 sm:p-4 md:p-6` | Обычная карточка |
| `mobile-card-compact` | `p-3 sm:p-4` | Компактная карточка |
| `mobile-card-tiny` | `p-2 sm:p-3` | Очень компактная |

### Сетки:
| Старый класс | Новый класс | Описание |
|--------------|-------------|----------|
| `mobile-grid-1` | `grid grid-cols-1` | 1 колонка |
| `mobile-grid-2` | `grid grid-cols-1 sm:grid-cols-2` | 1 → 2 колонки |
| `mobile-grid-3` | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` | 1 → 2 → 3 колонки |

### Отступы:
| Старый класс | Новый класс | Описание |
|--------------|-------------|----------|
| `mobile-padding` | `px-3 sm:px-4 md:px-6` | Горизонтальные отступы |
| `mobile-gap-sm` | `gap-2 sm:gap-4` | Маленький gap |
| `mobile-gap` | `gap-3 sm:gap-4 md:gap-6` | Обычный gap |

### Иконки:
| Старый класс | Новый класс | Описание |
|--------------|-------------|----------|
| `mobile-icon` | `w-4 h-4 sm:w-5 sm:h-5` | Обычная иконка |
| `mobile-icon-sm` | `w-3 h-3 sm:w-4 sm:h-4` | Маленькая иконка |
| `mobile-icon-lg` | `w-5 h-5 sm:w-6 sm:h-6` | Большая иконка |

### Контейнеры:
| Старый класс | Новый класс | Описание |
|--------------|-------------|----------|
| `mobile-container` | `max-w-full overflow-x-hidden` | Контейнер |

---

## 🎯 Примеры исправлений:

### 1. Заголовок страницы:
```tsx
// ❌ БЫЛО:
<h2 className="mobile-text-xl font-bold">Управление</h2>

// ✅ СТАЛО:
<h2 className="text-xl sm:text-2xl font-bold">Управление</h2>
```

### 2. Кнопка:
```tsx
// ❌ БЫЛО:
<Button className="mobile-button-sm">
  <UserPlus className="mobile-icon" />
  <span className="hide-mobile">Добавить сотрудника</span>
  <span className="show-mobile">Добавить</span>
</Button>

// ✅ СТАЛО:
<Button className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm">
  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
  <span className="hidden sm:inline ml-1">Добавить сотрудника</span>
</Button>
```

### 3. Карточка:
```tsx
// ❌ БЫЛО:
<Card>
  <CardContent className="mobile-card">
    <div className="mobile-text-2xl">42</div>
    <div className="mobile-text-xs">Всего</div>
  </CardContent>
</Card>

// ✅ СТАЛО:
<Card>
  <CardContent className="p-3 sm:p-4 md:p-6">
    <div className="text-2xl sm:text-3xl">42</div>
    <div className="text-xs sm:text-sm">Всего</div>
  </CardContent>
</Card>
```

### 4. Сетка:
```tsx
// ❌ БЫЛО:
<div className="mobile-grid-2 mobile-gap-sm">

// ✅ СТАЛО:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
```

### 5. Поиск:
```tsx
// ❌ БЫЛО:
<Search className="mobile-icon" />
<Input className="mobile-input" />

// ✅ СТАЛО:
<Search className="w-4 h-4 sm:w-5 sm:h-5" />
<Input className="px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base" />
```

---

## 🚀 Процесс исправления файла:

1. Открыть файл
2. Найти все `mobile-*` классы
3. Заменить по таблице выше
4. Проверить `hide-mobile` и `show-mobile`:
   - `hide-mobile` → `hidden sm:inline` (для текста в кнопках)
   - `show-mobile` → удалить (оставить только мобильную версию)
5. Сохранить

---

## ✅ Чеклист для каждого файла:

- [ ] Заменены все `mobile-text-*`
- [ ] Заменены все `mobile-button*`
- [ ] Заменены все `mobile-card*`
- [ ] Заменены все `mobile-grid-*`
- [ ] Заменены все `mobile-icon*`
- [ ] Заменены все `mobile-padding`, `mobile-gap*`
- [ ] Заменены все `hide-mobile` и `show-mobile`
- [ ] Проверены чекпоинты (переключатели)
- [ ] Проверены модальные окна

---

**Дата:** 13 ноября 2025, 09:30  
**Статус:** 📝 РУКОВОДСТВО ГОТОВО
