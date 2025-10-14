/**
 * Утилиты для работы с часовыми поясами
 */

// Конвертация времени в часовой пояс объекта
export function convertToTimezone(date: Date, timezone: string): Date {
  try {
    // Используем Intl.DateTimeFormat для корректной работы с часовыми поясами
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

    return new Date(year, month, day, hour, minute, second);
  } catch (error) {
    console.error('Ошибка конвертации времени:', error);
    return date; // Возвращаем исходную дату в случае ошибки
  }
}

// Получение текущего времени в часовом поясе объекта
export function getCurrentTimeInTimezone(timezone: string): Date {
  return convertToTimezone(new Date(), timezone);
}

// Проверка, является ли день рабочим для объекта
export function isWorkingDay(date: Date, workingDays: string[]): boolean {
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const dayName = dayNames[date.getDay()];
  return workingDays.includes(dayName);
}

// Проверка, находится ли время в рабочих часах
export function isWorkingTime(time: string, workingHours: { start: string; end: string }): boolean {
  const [hours, minutes] = time.split(':').map(Number);
  const timeMinutes = hours * 60 + minutes;
  
  const [startHours, startMinutes] = workingHours.start.split(':').map(Number);
  const startTimeMinutes = startHours * 60 + startMinutes;
  
  const [endHours, endMinutes] = workingHours.end.split(':').map(Number);
  const endTimeMinutes = endHours * 60 + endMinutes;
  
  return timeMinutes >= startTimeMinutes && timeMinutes <= endTimeMinutes;
}

// Создание временных окон для задач на основе периодичности
export function createTimeWindows(
  workingHours: { start: string; end: string }, 
  frequency: string
): Array<{ start: string; end: string; name: string }> {
  const startMinutes = timeToMinutes(workingHours.start);
  const endMinutes = timeToMinutes(workingHours.end);
  const totalMinutes = endMinutes - startMinutes;

  switch (frequency) {
    case '2_TIMES_DAY':
      const midPoint = startMinutes + Math.floor(totalMinutes / 2);
      return [
        { 
          start: workingHours.start, 
          end: minutesToTime(midPoint), 
          name: 'Утренняя смена' 
        },
        { 
          start: minutesToTime(midPoint), 
          end: workingHours.end, 
          name: 'Вечерняя смена' 
        }
      ];
    
    case '3_TIMES_DAY':
      const firstThird = startMinutes + Math.floor(totalMinutes / 3);
      const secondThird = startMinutes + Math.floor(totalMinutes * 2 / 3);
      return [
        { 
          start: workingHours.start, 
          end: minutesToTime(firstThird), 
          name: 'Утренняя смена' 
        },
        { 
          start: minutesToTime(firstThird), 
          end: minutesToTime(secondThird), 
          name: 'Дневная смена' 
        },
        { 
          start: minutesToTime(secondThird), 
          end: workingHours.end, 
          name: 'Вечерняя смена' 
        }
      ];
    
    case 'DAILY':
    case 'WEEKLY':
    case 'MONTHLY':
    default:
      return [
        { 
          start: workingHours.start, 
          end: workingHours.end, 
          name: 'Весь рабочий день' 
        }
      ];
  }
}

// Вспомогательные функции
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Определение следующего времени выполнения задачи
export function getNextScheduledTime(
  frequency: string, 
  timezone: string, 
  workingHours: { start: string; end: string },
  workingDays: string[]
): Date | null {
  const now = getCurrentTimeInTimezone(timezone);
  
  switch (frequency) {
    case 'DAILY':
      // Каждый день в начале рабочего времени
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const [startHours, startMinutes] = workingHours.start.split(':').map(Number);
      tomorrow.setHours(startHours, startMinutes, 0, 0);
      
      // Проверяем, что это рабочий день
      if (isWorkingDay(tomorrow, workingDays)) {
        return tomorrow;
      }
      // Если не рабочий день, ищем следующий рабочий день
      return getNextWorkingDay(tomorrow, workingDays, workingHours);
    
    case 'WEEKLY':
      // Каждый понедельник (или первый рабочий день недели)
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return getNextWorkingDay(nextWeek, workingDays, workingHours);
    
    case 'MONTHLY':
      // Первое число следующего месяца
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
      return getNextWorkingDay(nextMonth, workingDays, workingHours);
    
    default:
      return null;
  }
}

function getNextWorkingDay(
  startDate: Date, 
  workingDays: string[], 
  workingHours: { start: string; end: string }
): Date {
  const date = new Date(startDate);
  const [startHours, startMinutes] = workingHours.start.split(':').map(Number);
  
  // Ищем ближайший рабочий день
  for (let i = 0; i < 7; i++) {
    if (isWorkingDay(date, workingDays)) {
      date.setHours(startHours, startMinutes, 0, 0);
      return date;
    }
    date.setDate(date.getDate() + 1);
  }
  
  // Если не нашли рабочий день в течение недели, возвращаем понедельник
  date.setHours(startHours, startMinutes, 0, 0);
  return date;
}
