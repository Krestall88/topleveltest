# 📋 План полной проверки и адаптации проекта

## 🎯 Цель: Перестроить весь проект под правильный Responsive подход

### ✅ Правильный подход:
```tsx
// Используем breakpoints вместо фиксированных размеров
className="text-sm sm:text-base md:text-lg"
className="p-3 sm:p-4 md:p-6"
className="hidden sm:block"
```

### ❌ Неправильный подход (что нужно исправить):
```tsx
// Фиксированные размеры
className="text-[10px]"
className="mobile-text-sm" // если это text-[10px] без breakpoints
```

---

## 📱 Приоритетные страницы (по скриншотам):

### 🔴 Критические (срочно):
1. ✅ **Objects** (`src/app/objects/ObjectsClientPage.tsx`) - ИСПРАВЛЕНО
2. ⏳ **Object Detail** (`src/app/objects/[id]/ObjectDetailClientPage.tsx`) - В ПРОЦЕССЕ
3. ⏳ **Admin Users** (`src/app/admin/AdminUsersPage.tsx`) - ЧАСТИЧНО
4. ⏳ **Managers** (`src/app/managers/ManagersClientPage.tsx`) - ЧАСТИЧНО
5. ⏳ **Calendar** (`src/components/UnifiedCalendarPage.tsx`) - ЧАСТИЧНО

### 🟡 Важные:
6. ⏳ **Inventory** (`src/app/inventory/InventoryClientPage.tsx`)
7. ⏳ **Photos** (`src/app/photos/PhotosClientPage.tsx`)
8. ⏳ **Additional Tasks** (`src/app/additional-tasks/AdditionalTasksClientPage.tsx`)
9. ⏳ **Analytics** (`src/app/analytics/AnalyticsClientPage.tsx`)
10. ⏳ **Requests** (`src/app/requests/RequestsClientPage.tsx`)

### 🟢 Остальные:
11. ⏳ Audit, Checklists, Notifications, Reports, etc.

---

## 🔧 Компоненты для проверки:

### Модальные окна:
- ⏳ `ObjectEditModal.tsx`
- ⏳ `ObjectCompletionSettingsModal.tsx`
- ⏳ `ManagerDetailModal.tsx`
- ⏳ `UnifiedTaskCompletionModal.tsx`
- ⏳ `SimpleTaskListModal.tsx`
- ⏳ `PeriodTasksModal.tsx`
- ⏳ `ExpenseChartModal.tsx`
- ⏳ `CreateTaskModal.tsx`

### Карточки:
- ✅ `ObjectCard.tsx` - ИСПРАВЛЕНО
- ⏳ `ManagerCard.tsx`
- ⏳ `AdditionalTaskCard.tsx`
- ⏳ `ExpenseCategoryStatsCard.tsx`

### Формы:
- ⏳ `CreateObjectForm.tsx`
- ⏳ `ObjectTemplateForm.tsx`

### Дашборды:
- ⏳ `AdminTaskDashboard.tsx`
- ⏳ `ManagerDashboard.tsx`
- ⏳ `ModernDashboard.tsx`

### Специальные компоненты:
- ⏳ `CompletionRequirementsManager.tsx`
- ⏳ `ManagerObjectsEditor.tsx`
- ⏳ `ObjectHierarchy.tsx`
- ⏳ `InventoryFinancialReport.tsx`

---

## 🎨 Что нужно проверить в каждом файле:

### 1. **Заголовки:**
```tsx
// ❌ ПЛОХО
className="text-2xl"
className="mobile-text-xl"

// ✅ ХОРОШО
className="text-lg sm:text-xl md:text-2xl"
```

### 2. **Текст:**
```tsx
// ❌ ПЛОХО
className="text-[10px]"
className="mobile-text-sm"

// ✅ ХОРОШО
className="text-xs sm:text-sm"
className="text-sm sm:text-base"
```

### 3. **Кнопки:**
```tsx
// ❌ ПЛОХО
className="px-1 py-0.5 text-[9px]"

// ✅ ХОРОШО
className="px-2 py-1.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm"
<span className="hidden sm:inline">Текст</span>
```

### 4. **Отступы:**
```tsx
// ❌ ПЛОХО
className="p-1.5"
className="mobile-card-compact"

// ✅ ХОРОШО
className="p-3 sm:p-4 md:p-6"
className="p-2 sm:p-3"
```

### 5. **Сетки:**
```tsx
// ❌ ПЛОХО
className="grid-cols-3"

// ✅ ХОРОШО
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
```

### 6. **Flex направление:**
```tsx
// ❌ ПЛОХО
className="flex-row"

// ✅ ХОРОШО
className="flex flex-col sm:flex-row"
```

### 7. **Gap и Space:**
```tsx
// ❌ ПЛОХО
className="gap-1.5"
className="space-y-2"

// ✅ ХОРОШО
className="gap-2 sm:gap-4"
className="space-y-2 sm:space-y-4"
```

### 8. **Скрытие элементов:**
```tsx
// ✅ ХОРОШО
className="hidden sm:block"  // Скрыть на мобильных
className="block sm:hidden"  // Показать только на мобильных
className="hidden sm:inline" // Для текста в кнопках
```

### 9. **Обрезка текста:**
```tsx
// ❌ ПЛОХО (для длинных названий)
className="truncate"

// ✅ ХОРОШО
className="line-clamp-2"  // Для заголовков
className="truncate"      // Для одной строки
```

### 10. **Чекпоинты (переключатели):**
```tsx
// ❌ ПЛОХО
className="h-6 w-11"

// ✅ ХОРОШО
className="h-5 w-9 sm:h-6 sm:w-11"
```

---

## 📝 Процесс проверки:

### Для каждого файла:
1. ✅ Открыть файл
2. ✅ Найти все `className=`
3. ✅ Проверить на наличие:
   - Фиксированных размеров (`text-[10px]`)
   - Классов `mobile-*` без breakpoints
   - Отсутствие `sm:`, `md:`, `lg:` префиксов
4. ✅ Исправить на правильный подход
5. ✅ Проверить модальные окна внутри компонента
6. ✅ Отметить в списке как завершенное

---

## 🚀 Порядок работы:

### Этап 1: Критические страницы (сегодня)
1. ✅ ObjectsClientPage - ГОТОВО
2. ⏳ ObjectDetailClientPage - В ПРОЦЕССЕ
3. ⏳ AdminUsersPage
4. ⏳ ManagersClientPage
5. ⏳ UnifiedCalendarPage

### Этап 2: Модальные окна (сегодня)
6. ⏳ Все модальные окна из критических страниц

### Этап 3: Важные страницы (сегодня/завтра)
7. ⏳ Inventory, Photos, Additional Tasks, Analytics

### Этап 4: Компоненты (завтра)
8. ⏳ Cards, Forms, Dashboards

### Этап 5: Остальные страницы (завтра)
9. ⏳ Audit, Checklists, Notifications, etc.

---

## ✅ Прогресс:

### Страницы: 1/59
### Компоненты: 1/55
### Модальные окна: 0/20

**Общий прогресс: ~2%**

---

**Дата начала:** 13 ноября 2025, 09:25  
**Статус:** 🔄 В ПРОЦЕССЕ
