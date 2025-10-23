import { addDays, addHours, format, isAfter, isBefore, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

// Типы для календаря задач
export interface CalendarTask {
  id: string;
  techCard: {
    id: string;
    name: string;
    workType: string;
    frequency: string;
    description?: string;
    frequencyDays?: number;
    preferredTime?: string;
    maxDelayHours?: number;
  };
  object: {
    id: string;
    name: string;
    workingHours?: {
      start: string;
      end: string;
    };
    workingDays?: string[];
  };
  scheduledFor: Date;
  dueDate: Date;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'SKIPPED';
  lastExecution?: {
    executedAt: Date;
    status: string;
  };
}

export interface TaskGroup {
  title: string;
  priority: 'overdue' | 'today' | 'upcoming' | 'weekly' | 'monthly';
  tasks: CalendarTask[];
  count: number;
}

// Функция для парсинга периодичности из строки
export function parseFrequencyDays(frequency: string): number {
  const freq = frequency.toLowerCase();
  
  if (freq.includes('ежедневно') || freq.includes('каждый день')) {
    return 1;
  } else if (freq.includes('еженедельно') || freq.includes('раз в неделю')) {
    return 7;
  } else if (freq.includes('ежемесячно') || freq.includes('раз в месяц')) {
    return 30;
  } else if (freq.includes('ежеквартально') || freq.includes('раз в квартал')) {
    return 90;
  } else if (freq.includes('раз в год') || freq.includes('ежегодно')) {
    return 365;
  }
  
  // Попытка извлечь число из строки
  const match = freq.match(/(\d+)\s*(раз|день|дня|дней|неделя|недели|недель|месяц|месяца|месяцев)/);
  if (match) {
    const num = parseInt(match[1]);
    const unit = match[2];
    
    if (unit.includes('день')) {
      return num;
    } else if (unit.includes('недел')) {
      return num * 7;
    } else if (unit.includes('месяц')) {
      return num * 30;
    } else if (unit === 'раз') {
      // Если "раз", то смотрим контекст
      if (freq.includes('неделю')) return 7 / num;
      if (freq.includes('месяц')) return 30 / num;
      if (freq.includes('день')) return 1 / num;
    }
  }
  
  // По умолчанию - ежедневно
  return 1;
}

// Функция для расчета следующей даты выполнения
export function calculateNextDueDate(
  techCard: CalendarTask['techCard'],
  lastExecution?: { executedAt: Date },
  objectWorkingDays?: string[]
): Date {
  const frequencyDays = techCard.frequencyDays || parseFrequencyDays(techCard.frequency);
  const baseDate = lastExecution?.executedAt || new Date();
  
  let nextDate = addDays(startOfDay(baseDate), frequencyDays);
  
  // Учитываем предпочтительное время
  if (techCard.preferredTime) {
    const [hours, minutes] = techCard.preferredTime.split(':').map(Number);
    nextDate.setHours(hours, minutes, 0, 0);
  } else {
    nextDate.setHours(9, 0, 0, 0); // По умолчанию 9:00
  }
  
  // Корректируем на рабочие дни
  if (objectWorkingDays && objectWorkingDays.length > 0) {
    nextDate = adjustToWorkingDay(nextDate, objectWorkingDays);
  }
  
  return nextDate;
}

// Функция для корректировки даты на рабочий день
export function adjustToWorkingDay(date: Date, workingDays: string[]): Date {
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  let adjustedDate = new Date(date);
  
  // Ищем ближайший рабочий день
  let attempts = 0;
  while (attempts < 7) {
    const dayName = dayNames[adjustedDate.getDay()];
    if (workingDays.includes(dayName)) {
      break;
    }
    adjustedDate = addDays(adjustedDate, 1);
    attempts++;
  }
  
  return adjustedDate;
}

// Функция для определения статуса задачи
export function getTaskStatus(
  dueDate: Date,
  maxDelayHours: number = 24,
  executedAt?: Date
): 'PENDING' | 'OVERDUE' | 'COMPLETED' | 'UPCOMING' {
  if (executedAt) {
    return 'COMPLETED';
  }
  
  const now = new Date();
  const maxDate = addHours(dueDate, maxDelayHours);
  
  if (isAfter(now, maxDate)) {
    return 'OVERDUE';
  } else if (isAfter(now, dueDate)) {
    return 'PENDING';
  } else {
    return 'UPCOMING';
  }
}

// Функция для группировки задач
export function groupTasksByPriority(tasks: CalendarTask[]): TaskGroup[] {
  const groups: TaskGroup[] = [
    { title: 'Просрочено', priority: 'overdue', tasks: [], count: 0 },
    { title: 'Сегодня', priority: 'today', tasks: [], count: 0 },
    { title: 'На неделе', priority: 'weekly', tasks: [], count: 0 },
    { title: 'На месяце', priority: 'monthly', tasks: [], count: 0 },
    { title: 'Предстоящие', priority: 'upcoming', tasks: [], count: 0 }
  ];
  
  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 7);
  const monthEnd = addDays(today, 30);
  
  tasks.forEach(task => {
    const taskDate = startOfDay(task.scheduledFor);
    
    if (task.status === 'OVERDUE') {
      groups[0].tasks.push(task);
    } else if (taskDate.getTime() === today.getTime()) {
      groups[1].tasks.push(task);
    } else if (isBefore(taskDate, weekEnd)) {
      groups[2].tasks.push(task);
    } else if (isBefore(taskDate, monthEnd)) {
      groups[3].tasks.push(task);
    } else {
      groups[4].tasks.push(task);
    }
  });
  
  // Обновляем счетчики
  groups.forEach(group => {
    group.count = group.tasks.length;
  });
  
  // Фильтруем пустые группы
  return groups.filter(group => group.count > 0);
}

// Функция для группировки по периодичности
export function groupTasksByFrequency(tasks: CalendarTask[]): TaskGroup[] {
  const groups: TaskGroup[] = [
    { title: 'Ежедневные', priority: 'today', tasks: [], count: 0 },
    { title: 'Еженедельные', priority: 'weekly', tasks: [], count: 0 },
    { title: 'Ежемесячные', priority: 'monthly', tasks: [], count: 0 },
    { title: 'Другие', priority: 'upcoming', tasks: [], count: 0 }
  ];
  
  tasks.forEach(task => {
    const frequencyDays = task.techCard.frequencyDays || parseFrequencyDays(task.techCard.frequency);
    
    if (frequencyDays === 1) {
      groups[0].tasks.push(task);
    } else if (frequencyDays === 7) {
      groups[1].tasks.push(task);
    } else if (frequencyDays === 30) {
      groups[2].tasks.push(task);
    } else {
      groups[3].tasks.push(task);
    }
  });
  
  // Обновляем счетчики и фильтруем пустые
  return groups.filter(group => {
    group.count = group.tasks.length;
    return group.count > 0;
  });
}

// Функция для форматирования времени задачи
export function formatTaskTime(scheduledFor: Date, dueDate: Date): string {
  const scheduledTime = format(scheduledFor, 'HH:mm');
  const dueTime = format(dueDate, 'HH:mm');
  
  if (scheduledTime === dueTime) {
    return `в ${scheduledTime}`;
  } else {
    return `${scheduledTime} - ${dueTime}`;
  }
}

// Функция для форматирования даты задачи
export function formatTaskDate(date: Date): string {
  const today = startOfDay(new Date());
  const taskDate = startOfDay(date);
  
  if (taskDate.getTime() === today.getTime()) {
    return 'Сегодня';
  } else if (taskDate.getTime() === addDays(today, 1).getTime()) {
    return 'Завтра';
  } else if (taskDate.getTime() === addDays(today, -1).getTime()) {
    return 'Вчера';
  } else {
    return format(date, 'd MMMM', { locale: ru });
  }
}

// Функция для получения цвета статуса
export function getStatusColor(status: CalendarTask['status']): string {
  switch (status) {
    case 'OVERDUE':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'PENDING':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'COMPLETED':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'SKIPPED':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-blue-600 bg-blue-50 border-blue-200';
  }
}

// Функция для получения иконки статуса
export function getStatusIcon(status: CalendarTask['status']): string {
  switch (status) {
    case 'OVERDUE':
      return '🔥';
    case 'PENDING':
      return '⚡';
    case 'COMPLETED':
      return '✅';
    case 'SKIPPED':
      return '⏭️';
    default:
      return '📋';
  }
}
