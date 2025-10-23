import { addDays, format, startOfDay, endOfDay, parseISO } from 'date-fns';

// Определение часового пояса по адресу
export async function detectTimezoneByAddress(address: string): Promise<string> {
  try {
    // Простое определение по ключевым словам в адресе
    const addressLower = address.toLowerCase();
    
    // Московское время (UTC+3)
    if (addressLower.includes('москва') || addressLower.includes('московск') || 
        addressLower.includes('подольск') || addressLower.includes('химки') ||
        addressLower.includes('мытищи') || addressLower.includes('люберцы')) {
      return 'Europe/Moscow';
    }
    
    // Санкт-Петербург (UTC+3)
    if (addressLower.includes('санкт-петербург') || addressLower.includes('спб') ||
        addressLower.includes('петербург') || addressLower.includes('ленинград')) {
      return 'Europe/Moscow';
    }
    
    // Екатеринбург (UTC+5)
    if (addressLower.includes('екатеринбург') || addressLower.includes('свердловск')) {
      return 'Asia/Yekaterinburg';
    }
    
    // Новосибирск (UTC+7)
    if (addressLower.includes('новосибирск') || addressLower.includes('новосиб')) {
      return 'Asia/Novosibirsk';
    }
    
    // Красноярск (UTC+7)
    if (addressLower.includes('красноярск')) {
      return 'Asia/Krasnoyarsk';
    }
    
    // Иркутск (UTC+8)
    if (addressLower.includes('иркутск')) {
      return 'Asia/Irkutsk';
    }
    
    // Владивосток (UTC+10)
    if (addressLower.includes('владивосток') || addressLower.includes('приморск')) {
      return 'Asia/Vladivostok';
    }
    
    // Калининград (UTC+2)
    if (addressLower.includes('калининград')) {
      return 'Europe/Kaliningrad';
    }
    
    // Самара (UTC+4)
    if (addressLower.includes('самара') || addressLower.includes('тольятти')) {
      return 'Europe/Samara';
    }
    
    // По умолчанию - Московское время
    return 'Europe/Moscow';
    
  } catch (error) {
    console.error('Ошибка определения часового пояса:', error);
    return 'Europe/Moscow';
  }
}

// Проверка, является ли день рабочим
export function isWorkingDay(date: Date, workingDays: string[]): boolean {
  if (!workingDays || workingDays.length === 0) return true;
  
  const dayName = format(date, 'EEEE').toUpperCase();
  return workingDays.includes(dayName);
}

// Проверка, попадает ли время в рабочие часы
export function isWorkingTime(date: Date, workingHours: any): boolean {
  if (!workingHours || !workingHours.start || !workingHours.end) return true;
  
  const timeStr = format(date, 'HH:mm');
  return timeStr >= workingHours.start && timeStr <= workingHours.end;
}

// Получение следующего рабочего дня
export function getNextWorkingDay(date: Date, workingDays: string[]): Date {
  let nextDay = addDays(date, 1);
  
  while (!isWorkingDay(nextDay, workingDays)) {
    nextDay = addDays(nextDay, 1);
  }
  
  return nextDay;
}

// Конвертация времени в часовой пояс объекта (упрощенная версия)
export function convertToObjectTimezone(date: Date, timezone: string): Date {
  // Для упрощения используем московское время (UTC+3)
  const moscowOffset = 3 * 60; // 3 часа в минутах
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utcTime + (moscowOffset * 60000));
}

// Конвертация времени из часового пояса объекта в UTC (упрощенная версия)
export function convertFromObjectTimezone(date: Date, timezone: string): Date {
  // Для упрощения используем московское время (UTC+3)
  const moscowOffset = 3 * 60; // 3 часа в минутах
  const utcTime = date.getTime() - (moscowOffset * 60000);
  return new Date(utcTime - (date.getTimezoneOffset() * 60000));
}

// Расчет следующей даты выполнения задачи
export function calculateNextTaskDate(
  techCard: {
    frequencyDays?: number;
    preferredTime?: string;
    timeSlots?: string[];
  },
  lastExecution: Date | null,
  objectTimezone: string,
  workingDays: string[],
  workingHours: any
): Date {
  const now = new Date();
  const objectNow = convertToObjectTimezone(now, objectTimezone);
  
  let nextDate: Date;
  
  if (lastExecution) {
    // Если есть последнее выполнение, добавляем периодичность
    const lastExecutionInTimezone = convertToObjectTimezone(lastExecution, objectTimezone);
    nextDate = addDays(lastExecutionInTimezone, techCard.frequencyDays || 1);
  } else {
    // Если нет выполнений, начинаем с сегодня
    nextDate = objectNow;
  }
  
  // Находим следующий рабочий день
  while (!isWorkingDay(nextDate, workingDays)) {
    nextDate = addDays(nextDate, 1);
  }
  
  // Устанавливаем предпочтительное время
  if (techCard.preferredTime) {
    const [hours, minutes] = techCard.preferredTime.split(':').map(Number);
    nextDate.setHours(hours, minutes, 0, 0);
  } else if (workingHours && workingHours.start) {
    // Если нет предпочтительного времени, используем начало рабочего дня
    const [hours, minutes] = workingHours.start.split(':').map(Number);
    nextDate.setHours(hours, minutes, 0, 0);
  }
  
  // Проверяем, попадает ли время в рабочие часы
  if (!isWorkingTime(nextDate, workingHours)) {
    // Если не попадает, переносим на начало следующего рабочего дня
    nextDate = getNextWorkingDay(nextDate, workingDays);
    if (workingHours && workingHours.start) {
      const [hours, minutes] = workingHours.start.split(':').map(Number);
      nextDate.setHours(hours, minutes, 0, 0);
    }
  }
  
  // Конвертируем обратно в UTC
  return convertFromObjectTimezone(nextDate, objectTimezone);
}

// Получение временных слотов для задачи
export function getTaskTimeSlots(
  techCard: {
    timeSlots?: string[];
    preferredTime?: string;
  },
  date: Date,
  objectTimezone: string
): Array<{ start: Date; end: Date }> {
  const slots: Array<{ start: Date; end: Date }> = [];
  const dateInTimezone = convertToObjectTimezone(date, objectTimezone);
  
  if (techCard.timeSlots && techCard.timeSlots.length > 0) {
    // Используем заданные временные слоты
    for (const slot of techCard.timeSlots) {
      const [startTime, endTime] = slot.split('-');
      
      const startDate = new Date(dateInTimezone);
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      startDate.setHours(startHours, startMinutes, 0, 0);
      
      const endDate = new Date(dateInTimezone);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      endDate.setHours(endHours, endMinutes, 0, 0);
      
      slots.push({
        start: convertFromObjectTimezone(startDate, objectTimezone),
        end: convertFromObjectTimezone(endDate, objectTimezone)
      });
    }
  } else if (techCard.preferredTime) {
    // Используем предпочтительное время (1 час)
    const taskDate = new Date(dateInTimezone);
    const [hours, minutes] = techCard.preferredTime.split(':').map(Number);
    taskDate.setHours(hours, minutes, 0, 0);
    
    const endDate = addDays(taskDate, 0);
    endDate.setHours(hours + 1, minutes, 0, 0);
    
    slots.push({
      start: convertFromObjectTimezone(taskDate, objectTimezone),
      end: convertFromObjectTimezone(endDate, objectTimezone)
    });
  }
  
  return slots;
}

// Проверка статуса задачи
export function getTaskStatus(
  scheduledFor: Date,
  dueDate: Date,
  executedAt: Date | null,
  objectTimezone: string
): 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'UPCOMING' {
  if (executedAt) {
    return 'COMPLETED';
  }
  
  const now = new Date();
  const nowInTimezone = convertToObjectTimezone(now, objectTimezone);
  const scheduledInTimezone = convertToObjectTimezone(scheduledFor, objectTimezone);
  const dueInTimezone = convertToObjectTimezone(dueDate, objectTimezone);
  
  if (nowInTimezone > dueInTimezone) {
    return 'OVERDUE';
  } else if (nowInTimezone >= scheduledInTimezone) {
    return 'PENDING';
  } else {
    return 'UPCOMING';
  }
}

// Форматирование времени для отображения в часовом поясе объекта
export function formatTimeInTimezone(date: Date, timezone: string, formatStr: string = 'dd.MM.yyyy HH:mm'): string {
  const dateInTimezone = convertToObjectTimezone(date, timezone);
  return format(dateInTimezone, formatStr);
}
