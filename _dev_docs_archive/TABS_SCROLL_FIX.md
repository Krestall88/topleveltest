# 🔄 Исправление прокрутки вкладок в модальном окне

**Дата:** 13 ноября 2025, 12:05  
**Проблема:** На мобильных не все вкладки влезают в модальном окне редактирования объекта
**Статус:** ✅ ИСПРАВЛЕНО

---

## 📊 Проблема:

❌ **Было:**
- Вкладки в 2 ряда: `grid-cols-2`
- Не все 4 вкладки видны одновременно
- Неудобная навигация на мобильных
- На десктопе все нормально

---

## ✅ Решение:

### **Горизонтальная прокрутка на мобильных:**

**Было:**
```tsx
<TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-0.5 sm:gap-1">
  <TabsTrigger value="basic" className="text-[9px] sm:text-sm px-1 sm:px-2 py-1 sm:py-1.5">
    Основная
  </TabsTrigger>
  ...
</TabsList>
```

**Стало:**
```tsx
<div className="w-full overflow-x-auto scrollbar-hide">
  <TabsList className="inline-flex sm:grid sm:w-full sm:grid-cols-4 gap-1 w-max">
    <TabsTrigger value="basic" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
      Основная
    </TabsTrigger>
    ...
  </TabsList>
</div>
```

---

## 🎯 Ключевые изменения:

### 1. **Обертка с прокруткой:**
```tsx
<div className="w-full overflow-x-auto scrollbar-hide">
```
- `overflow-x-auto` - горизонтальная прокрутка
- `scrollbar-hide` - скрытие полосы прокрутки

### 2. **TabsList - inline-flex на мобильных:**
```tsx
<TabsList className="inline-flex sm:grid sm:w-full sm:grid-cols-4 gap-1 w-max">
```
- `inline-flex` - вкладки в ряд на мобильных
- `sm:grid sm:grid-cols-4` - сетка на десктопе
- `w-max` - ширина по содержимому

### 3. **TabsTrigger - увеличены отступы:**
```tsx
<TabsTrigger className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
```
- `px-3 py-2` - нормальные отступы (было `px-1 py-1`)
- `text-xs` - читаемый шрифт (было `text-[9px]`)
- `whitespace-nowrap` - текст не переносится

### 4. **CSS для скрытия scrollbar:**
```css
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;  /* Chrome, Safari and Opera */
}
```

---

## 📊 Сравнение:

| Параметр | Было (мобильные) | Стало (мобильные) | Десктоп |
|----------|------------------|-------------------|---------|
| Layout | Grid 2x2 | **Inline-flex + scroll** | Grid 1x4 |
| Шрифт | 9px | **12px** | 14px |
| Padding X | 4px | **12px** | 12px |
| Padding Y | 4px | **8px** | 8px |
| Видимость | 2 вкладки | **Все 4 + прокрутка** | Все 4 |
| Scrollbar | - | **Скрыт** | - |

---

## ✅ Результат:

✅ **Все вкладки доступны** - можно прокрутить горизонтально  
✅ **Scrollbar скрыт** - чистый интерфейс  
✅ **Удобная навигация** - свайп влево/вправо  
✅ **Десктоп не изменен** - grid 1x4 как было  
✅ **Читаемый текст** - 12px вместо 9px  

---

## 🎉 Итог:

**Мобильная версия:** Горизонтальная прокрутка вкладок  
**Десктоп версия:** Сетка 1x4 как раньше  

**Навигация по вкладкам теперь удобная на всех устройствах!** 🎉
