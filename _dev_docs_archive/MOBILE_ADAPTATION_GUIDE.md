# 📱 Руководство по мобильной адаптации

## ✅ Что было исправлено:

### 1. **Глобальные стили (globals.css)**

Добавлены utility классы для мобильной адаптации:

#### Контейнеры:
- `.mobile-container` - предотвращает горизонтальный скролл
- `.responsive-container` - адаптивная ширина с отступами
- `.mobile-padding` - адаптивные отступы (px-3 sm:px-4 md:px-6)

#### Текст:
- `.mobile-text-xs` - text-xs sm:text-sm
- `.mobile-text-sm` - text-sm sm:text-base
- `.mobile-text-base` - text-base sm:text-lg
- `.mobile-text-lg` - text-lg sm:text-xl
- `.mobile-text-xl` - text-xl sm:text-2xl
- `.mobile-text-2xl` - text-2xl sm:text-3xl

#### Кнопки:
- `.mobile-button` - стандартная кнопка с min-height 44px для touch
- `.mobile-button-sm` - маленькая кнопка (min-height 36px)
- `.mobile-button-lg` - большая кнопка (min-height 48px)

#### Карточки:
- `.mobile-card` - адаптивные отступы (p-3 sm:p-4 md:p-6)

#### Гриды:
- `.mobile-grid-1` - всегда 1 колонка
- `.mobile-grid-2` - 1 колонка на мобильных, 2 на планшетах
- `.mobile-grid-3` - 1/2/3 колонки
- `.mobile-grid-4` - 1/2/4 колонки
- `.mobile-grid-6` - 2/3/6 колонок

#### Gap:
- `.mobile-gap` - gap-3 sm:gap-4 md:gap-6
- `.mobile-gap-sm` - gap-2 sm:gap-3 md:gap-4

#### Видимость:
- `.hide-mobile` - скрыто на мобильных (hidden sm:block)
- `.show-mobile` - показано только на мобильных (block sm:hidden)

#### Input:
- `.mobile-input` - адаптивный input с min-height 44px

#### Иконки:
- `.mobile-icon-sm` - w-4 h-4 sm:w-3.5 sm:h-3.5
- `.mobile-icon` - w-5 h-5 sm:w-4 sm:h-4
- `.mobile-icon-lg` - w-6 h-6 sm:w-5 sm:h-5

---

### 2. **Viewport Meta Tag**

В `src/app/layout.tsx` добавлен правильный viewport:

```typescript
viewport: {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}
```

---

### 3. **Исправленные компоненты:**

#### AppLayout.tsx:
- ✅ Мобильная шапка с правильными размерами кнопок (44x44px)
- ✅ Адаптивное меню
- ✅ Truncate для длинных текстов
- ✅ Accessibility (aria-label)

#### ManagersClientPage.tsx:
- ✅ Адаптивная сетка для статистики
- ✅ Кнопки с hide-mobile/show-mobile
- ✅ Адаптивные карточки менеджеров
- ✅ Правильные размеры input

#### AdminTaskDashboard.tsx:
- ✅ Адаптивная сетка для статистики (6 колонок)
- ✅ Адаптивные кнопки управления
- ✅ Правильные отступы

---

## 🎯 Как использовать в других компонентах:

### Пример 1: Адаптивная страница

```tsx
export default function MyPage() {
  return (
    <div className="responsive-container space-y-4 sm:space-y-6 py-4 sm:py-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h1 className="mobile-text-xl font-bold">Заголовок</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button className="mobile-button-sm flex-1 sm:flex-none">
            <Icon className="mobile-icon" />
            <span className="hide-mobile">Полный текст</span>
            <span className="show-mobile">Короткий</span>
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="mobile-grid-3 mobile-gap-sm">
        <Card>
          <CardContent className="mobile-card">
            <p className="mobile-text-xs text-gray-600">Метка</p>
            <p className="mobile-text-2xl font-bold">123</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Пример 2: Адаптивная форма

```tsx
<form className="space-y-4">
  <div>
    <Label className="mobile-text-sm">Название</Label>
    <Input className="mobile-input" />
  </div>

  <div className="flex flex-col sm:flex-row gap-2">
    <Button type="submit" className="mobile-button flex-1 sm:flex-none">
      Сохранить
    </Button>
    <Button variant="outline" className="mobile-button flex-1 sm:flex-none">
      Отмена
    </Button>
  </div>
</form>
```

### Пример 3: Адаптивная таблица

```tsx
<div className="overflow-x-auto -mx-3 sm:mx-0">
  <table className="min-w-full">
    <thead>
      <tr>
        <th className="mobile-text-xs">Колонка 1</th>
        <th className="mobile-text-xs hide-mobile">Колонка 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="mobile-text-sm">Данные</td>
        <td className="mobile-text-sm hide-mobile">Данные</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Пример 4: Адаптивная карточка

```tsx
<Card>
  <CardHeader className="mobile-card">
    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
      <div className="flex-1 min-w-0">
        <CardTitle className="mobile-text-base truncate">
          Длинный заголовок который обрезается
        </CardTitle>
        <p className="mobile-text-xs text-gray-600 truncate">
          Подзаголовок
        </p>
      </div>
      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
        <Button size="sm" className="mobile-button-sm flex-1 sm:flex-none">
          Действие
        </Button>
      </div>
    </div>
  </CardHeader>
</Card>
```

---

## 📋 Чеклист для адаптации компонента:

### Контейнеры:
- [ ] Используется `.responsive-container` или `.mobile-padding`
- [ ] Нет фиксированных ширин (используется `w-full` на мобильных)
- [ ] Добавлен `overflow-x-hidden` где нужно

### Текст:
- [ ] Используются `.mobile-text-*` классы вместо обычных
- [ ] Длинные тексты обрезаются через `truncate`
- [ ] Важная информация не скрыта на мобильных

### Кнопки:
- [ ] Используются `.mobile-button-*` классы
- [ ] Минимальный размер 44x44px для touch
- [ ] На мобильных кнопки занимают `flex-1`, на десктопе `flex-none`
- [ ] Длинный текст скрыт через `.hide-mobile`, короткий показан через `.show-mobile`

### Flex/Grid:
- [ ] `flex-col` на мобильных, `sm:flex-row` на десктопе
- [ ] Используются `.mobile-grid-*` классы
- [ ] `gap-2` или `.mobile-gap-sm` для отступов
- [ ] `flex-wrap` для переноса элементов

### Карточки:
- [ ] Используется `.mobile-card` для отступов
- [ ] Контент внутри адаптивный
- [ ] Кнопки действий адаптивные

### Input/Select:
- [ ] Используется `.mobile-input` класс
- [ ] `w-full` на мобильных, фиксированная ширина на десктопе
- [ ] Placeholder короткий и понятный

### Модальные окна:
- [ ] Ширина `w-[95vw]` на мобильных
- [ ] Максимальная высота `max-h-[90vh]`
- [ ] Скролл внутри модалки

---

## ⚠️ Частые ошибки:

### ❌ Неправильно:
```tsx
<div className="px-6">
  <h1 className="text-2xl">Заголовок</h1>
  <Button className="px-4 py-2">
    <Icon className="h-4 w-4" />
    Длинный текст кнопки
  </Button>
</div>
```

### ✅ Правильно:
```tsx
<div className="mobile-padding">
  <h1 className="mobile-text-xl">Заголовок</h1>
  <Button className="mobile-button-sm">
    <Icon className="mobile-icon" />
    <span className="hide-mobile">Длинный текст кнопки</span>
    <span className="show-mobile">Короткий</span>
  </Button>
</div>
```

---

## 🔍 Как проверить адаптивность:

### 1. Chrome DevTools:
- F12 → Toggle device toolbar (Ctrl+Shift+M)
- Выберите iPhone SE (375px) - самый узкий экран
- Проверьте все страницы

### 2. Проверьте:
- ✅ Нет горизонтального скролла
- ✅ Все кнопки кликабельны (не слишком маленькие)
- ✅ Текст читаемый (не слишком мелкий)
- ✅ Карточки не выходят за границы
- ✅ Модальные окна помещаются на экране
- ✅ Формы удобно заполнять

### 3. Тестовые разрешения:
- 375px (iPhone SE) - минимальная ширина
- 390px (iPhone 12/13/14)
- 428px (iPhone 14 Pro Max)
- 768px (iPad) - планшет
- 1024px+ - десктоп

---

## 🚀 Следующие шаги:

### Приоритет 1 (критично):
- [ ] Страница объектов (`ObjectsClientPage.tsx`)
- [ ] Страница календаря (`UnifiedCalendarPage.tsx`)
- [ ] Страница дополнительных заданий (`AdditionalTasksClientPage.tsx`)
- [ ] Модальные окна завершения задач

### Приоритет 2 (важно):
- [ ] Страница инвентаря (`InventoryClientPage.tsx`)
- [ ] Страница фотоотчетов (`PhotosClientPage.tsx`)
- [ ] Страница отчетности (`ChecklistsClientPage.tsx`)

### Приоритет 3 (желательно):
- [ ] Все остальные страницы
- [ ] Все модальные окна
- [ ] Все формы

---

## 📝 Примечания:

### Touch Targets:
- Минимальный размер для кликабельных элементов: **44x44px**
- Это требование Apple и Google для мобильных приложений
- Используйте `min-h-[44px] min-w-[44px]` для кнопок и ссылок

### Шрифты:
- Минимальный размер шрифта: **16px** (предотвращает zoom на iOS)
- Используйте относительные размеры (rem/em)
- Не используйте `font-size: 14px` для input

### Отступы:
- На мобильных: `px-3` (12px)
- На планшетах: `sm:px-4` (16px)
- На десктопе: `md:px-6` (24px)

### Модальные окна:
- Ширина на мобильных: `w-[95vw]` (95% ширины экрана)
- Максимальная высота: `max-h-[90vh]`
- Отступы от краев: `m-2.5` (10px)

---

**Система теперь адаптирована для мобильных устройств!** 📱✨
