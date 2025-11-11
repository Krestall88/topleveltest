# 🔔 План реализации напоминаний о задачах

## 📋 Требования

### Основные:
1. **Определение часового пояса по адресу объекта**
2. **Рабочие часы по умолчанию: 9:00 - 18:00**
3. **Напоминания о незакрытых задачах:**
   - За 3 часа до конца рабочего дня (15:00)
   - За 1 час до конца рабочего дня (17:00)

### Важно:
- ⚠️ Уведомления должны приходить **даже если пользователь не в системе**
- ⚠️ Это возможно **ТОЛЬКО через Telegram** (не Browser Notifications)
- ⚠️ Требуется **серверный cron job**

---

## 🏗️ Архитектура решения

### Вариант 1: Vercel Cron Jobs (Рекомендуется)

**Преимущества:**
- ✅ Встроено в Vercel
- ✅ Бесплатно на Hobby плане
- ✅ Надежно
- ✅ Не требует дополнительной инфраструктуры

**Как работает:**
```typescript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-overdue-tasks",
      "schedule": "0 * * * *" // Каждый час
    }
  ]
}
```

### Вариант 2: Внешний cron сервис

**Примеры:**
- cron-job.org
- EasyCron
- GitHub Actions

---

## 📊 Структура данных

### 1. Добавить поля в модель CleaningObject

```prisma
model CleaningObject {
  // ... существующие поля
  
  // Часовой пояс объекта
  timezone String @default("Europe/Moscow")
  
  // Рабочие часы
  workStartTime String @default("09:00") // HH:mm
  workEndTime   String @default("18:00") // HH:mm
  
  // Адрес для определения часового пояса
  address String?
  city    String?
  country String @default("Russia")
}
```

### 2. Логика определения часового пояса

```typescript
// По городу
const timezones = {
  'Москва': 'Europe/Moscow',
  'Санкт-Петербург': 'Europe/Moscow',
  'Екатеринбург': 'Asia/Yekaterinburg',
  'Новосибирск': 'Asia/Novosibirsk',
  'Владивосток': 'Asia/Vladivostok',
  // и т.д.
};
```

---

## 🔧 Реализация

### Шаг 1: API endpoint для cron

```typescript
// src/app/api/cron/check-overdue-tasks/route.ts

export async function GET(request: NextRequest) {
  // Проверка авторизации cron (Vercel secret)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  
  // Получаем все объекты с менеджерами
  const objects = await prisma.cleaningObject.findMany({
    where: {
      managerId: { not: null }
    },
    include: {
      manager: {
        select: { id: true, name: true, telegramId: true }
      }
    }
  });

  for (const object of objects) {
    // Определяем текущее время в часовом поясе объекта
    const objectTime = getTimeInTimezone(now, object.timezone);
    const currentHour = objectTime.getHours();
    const currentMinute = objectTime.getMinutes();
    
    // Парсим рабочие часы
    const [endHour] = object.workEndTime.split(':').map(Number);
    
    // Проверяем время для напоминаний
    const shouldSend3HourReminder = currentHour === endHour - 3 && currentMinute === 0;
    const shouldSend1HourReminder = currentHour === endHour - 1 && currentMinute === 0;
    
    if (shouldSend3HourReminder || shouldSend1HourReminder) {
      // Получаем незакрытые задачи на сегодня
      const overdueTasks = await getOverdueTasksForObject(object.id, objectTime);
      
      if (overdueTasks.length > 0 && object.manager?.telegramId) {
        await sendOverdueReminder(
          object.manager.telegramId,
          object.name,
          overdueTasks,
          shouldSend3HourReminder ? 3 : 1
        );
      }
    }
  }

  return NextResponse.json({ success: true });
}
```

### Шаг 2: Функция отправки напоминания

```typescript
// src/lib/telegram-notifications.ts

export async function sendOverdueReminder(
  telegramId: string,
  objectName: string,
  tasks: any[],
  hoursLeft: number
) {
  const message = `
⚠️ <b>Напоминание о задачах</b>

🏢 <b>Объект:</b> ${objectName}
⏰ <b>До конца рабочего дня:</b> ${hoursLeft} ${hoursLeft === 1 ? 'час' : 'часа'}

📋 <b>Незакрытые задачи (${tasks.length}):</b>
${tasks.map((task, i) => `${i + 1}. ${task.description}`).join('\n')}

<i>Пожалуйста, завершите задачи до конца рабочего дня.</i>
  `.trim();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return sendTelegramMessage(telegramId, message, {
    parseMode: 'HTML',
    buttons: [
      [
        {
          text: '📱 Открыть задачи',
          url: `${appUrl}/tasks`,
        },
      ],
    ],
  });
}
```

### Шаг 3: Определение часового пояса

```typescript
// src/lib/timezone-utils.ts

import { DateTime } from 'luxon';

export function getTimeInTimezone(date: Date, timezone: string): Date {
  const dt = DateTime.fromJSDate(date).setZone(timezone);
  return dt.toJSDate();
}

export function getTimezoneByCity(city: string): string {
  const timezones: Record<string, string> = {
    'Москва': 'Europe/Moscow',
    'Санкт-Петербург': 'Europe/Moscow',
    'Екатеринбург': 'Asia/Yekaterinburg',
    'Новосибирск': 'Asia/Novosibirsk',
    'Красноярск': 'Asia/Krasnoyarsk',
    'Иркутск': 'Asia/Irkutsk',
    'Якутск': 'Asia/Yakutsk',
    'Владивосток': 'Asia/Vladivostok',
    'Магадан': 'Asia/Magadan',
    'Камчатка': 'Asia/Kamchatka',
  };

  return timezones[city] || 'Europe/Moscow';
}
```

---

## 📅 Расписание cron

### Оптимальное:
```
0 * * * *  // Каждый час
```

**Почему каждый час?**
- ✅ Проверяет все часовые пояса
- ✅ Отправляет напоминания в 15:00 и 17:00 по местному времени каждого объекта
- ✅ Минимальная нагрузка (24 запроса в день)

### Альтернативное (более частое):
```
*/30 * * * *  // Каждые 30 минут
```

---

## 🎯 Приоритеты реализации

### Этап 1: Базовая функциональность (СЕЙЧАС)
1. ✅ Telegram уведомления о новых задачах - **ГОТОВО**
2. ✅ Уведомления о комментариях - **ГОТОВО**
3. ✅ Уведомления о назначениях - **ГОТОВО**

### Этап 2: Напоминания о просрочке (СЛЕДУЮЩИЙ)
1. ❌ Добавить поля timezone и workHours в модель
2. ❌ Создать API endpoint для cron
3. ❌ Настроить Vercel Cron Jobs
4. ❌ Реализовать логику определения часового пояса
5. ❌ Реализовать отправку напоминаний

### Этап 3: Дополнительно (ПОТОМ)
1. ❌ UI для настройки рабочих часов объекта
2. ❌ Автоопределение часового пояса по адресу
3. ❌ Настройка времени напоминаний (не только 3ч и 1ч)
4. ❌ Еженедельные отчеты

---

## ⚠️ Важные замечания

### Browser Notifications НЕ ПОДХОДЯТ для этой задачи!

**Почему:**
- ❌ Работают только когда браузер открыт
- ❌ Не работают когда пользователь не в системе
- ❌ Не могут отправлять напоминания по расписанию

**Browser Notifications полезны только для:**
- ✅ Мгновенных уведомлений когда пользователь в системе
- ✅ Дублирования Telegram уведомлений
- ✅ Удобства (не нужно переключаться в Telegram)

### Telegram - единственное решение для:
- ✅ Напоминаний по расписанию
- ✅ Уведомлений когда пользователь не в системе
- ✅ Критичных уведомлений о просрочке

---

## 📝 Следующие шаги

### Что нужно сделать:

1. **Обновить схему БД**
   - Добавить timezone, workStartTime, workEndTime в CleaningObject

2. **Создать cron endpoint**
   - `/api/cron/check-overdue-tasks`

3. **Настроить Vercel Cron**
   - Добавить в vercel.json

4. **Установить библиотеку для работы с timezone**
   ```bash
   npm install luxon
   npm install -D @types/luxon
   ```

5. **Протестировать**
   - Создать задачу
   - Дождаться времени напоминания
   - Проверить Telegram

---

## 🤔 Вопросы для уточнения

1. **Какие задачи должны напоминать?**
   - Только ежедневные задачи?
   - Все незакрытые задачи?
   - Задачи с определенным статусом?

2. **Как определять "сегодняшние" задачи?**
   - По дате создания?
   - По дедлайну?
   - По типу задачи?

3. **Нужно ли напоминание если задач нет?**
   - Отправлять "Все задачи выполнены ✅"?
   - Или молчать?

4. **Нужны ли настройки для каждого объекта?**
   - Разные рабочие часы?
   - Разное время напоминаний?
   - Отключение напоминаний?

---

## 💡 Рекомендация

**Сейчас:**
1. Убрать Browser Notifications (они не решают задачу)
2. Сосредоточиться на Telegram напоминаниях
3. Реализовать cron job для проверки просрочки

**Потом:**
- Можно добавить Browser Notifications как дополнение
- Но основа - Telegram уведомления
