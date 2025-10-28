// Утилиты для определения приоритета и визуального оформления задач
import { startOfDay, differenceInDays } from 'date-fns';

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
export type TaskUrgencyLevel = 'OVERDUE_CRITICAL' | 'TODAY_URGENT' | 'FUTURE_NORMAL' | 'COMPLETED_SUCCESS';

export interface TaskWithPriority {
  id: string;
  status: 'PENDING' | 'AVAILABLE' | 'OVERDUE' | 'COMPLETED' | 'IN_PROGRESS';
  scheduledDate: Date;
  completedAt?: Date;
  frequency?: string;
  description: string;
  objectName: string;
  roomName?: string;
  managerName?: string;
}

// Определение приоритета задачи
export function calculateTaskPriority(task: TaskWithPriority): TaskPriority {
  const now = new Date();
  const today = startOfDay(now);
  const taskDate = startOfDay(task.scheduledDate);
  const daysDiff = differenceInDays(today, taskDate);

  // Выполненные задачи имеют низкий приоритет для отображения
  if (task.status === 'COMPLETED') {
    return 'LOW';
  }

  // Просроченные задачи
  if (task.status === 'OVERDUE') {
    if (daysDiff >= 2) {
      return 'CRITICAL'; // Просрочено на 2+ дня
    } else if (daysDiff >= 1) {
      return 'HIGH'; // Просрочено на 1 день
    }
  }

  // Сегодняшние задачи
  if (task.status === 'AVAILABLE') {
    // Ежедневные задачи имеют высокий приоритет
    if (task.frequency?.includes('ежедневно') || task.frequency?.includes('daily')) {
      return 'HIGH';
    }
    return 'HIGH'; // Все сегодняшние задачи важны
  }

  // Будущие задачи
  return 'NORMAL';
}

// Определение уровня срочности для визуального оформления
export function calculateUrgencyLevel(task: TaskWithPriority): TaskUrgencyLevel {
  if (task.status === 'COMPLETED') {
    return 'COMPLETED_SUCCESS';
  }

  if (task.status === 'OVERDUE') {
    return 'OVERDUE_CRITICAL';
  }

  if (task.status === 'AVAILABLE') {
    return 'TODAY_URGENT';
  }

  return 'FUTURE_NORMAL';
}

// Получение CSS классов для задачи
export function getTaskStyleClasses(task: TaskWithPriority): string {
  const urgencyLevel = calculateUrgencyLevel(task);
  
  const baseClasses = 'transition-all duration-200 hover:shadow-md';
  
  switch (urgencyLevel) {
    case 'OVERDUE_CRITICAL':
      return `${baseClasses} bg-red-50 border-l-4 border-l-red-500 border-red-200 hover:bg-red-100`;
    
    case 'TODAY_URGENT':
      return `${baseClasses} bg-orange-50 border-l-4 border-l-orange-500 border-orange-200 hover:bg-orange-100`;
    
    case 'COMPLETED_SUCCESS':
      return `${baseClasses} bg-green-50 border-l-4 border-l-green-500 border-green-200 hover:bg-green-100`;
    
    case 'FUTURE_NORMAL':
    default:
      return `${baseClasses} bg-gray-50 border-l-4 border-l-gray-400 border-gray-200 hover:bg-gray-100`;
  }
}

// Получение цвета бейджа для статуса
export function getStatusBadgeProps(task: TaskWithPriority): { variant: string; className: string; text: string } {
  const urgencyLevel = calculateUrgencyLevel(task);
  
  switch (urgencyLevel) {
    case 'OVERDUE_CRITICAL':
      return {
        variant: 'destructive',
        className: 'bg-red-600 text-white animate-pulse',
        text: 'ПРОСРОЧЕНО'
      };
    
    case 'TODAY_URGENT':
      return {
        variant: 'secondary',
        className: 'bg-orange-100 text-orange-800 border-orange-300',
        text: 'СЕГОДНЯ'
      };
    
    case 'COMPLETED_SUCCESS':
      return {
        variant: 'secondary',
        className: 'bg-green-100 text-green-800 border-green-300',
        text: 'ВЫПОЛНЕНО'
      };
    
    case 'FUTURE_NORMAL':
    default:
      return {
        variant: 'outline',
        className: 'bg-gray-100 text-gray-700 border-gray-300',
        text: 'ЗАПЛАНИРОВАНО'
      };
  }
}

// Сортировка задач по приоритету
export function sortTasksByPriority(tasks: TaskWithPriority[]): TaskWithPriority[] {
  const priorityOrder: Record<TaskPriority, number> = {
    'CRITICAL': 0,
    'HIGH': 1,
    'NORMAL': 2,
    'LOW': 3
  };

  return [...tasks].sort((a, b) => {
    const priorityA = calculateTaskPriority(a);
    const priorityB = calculateTaskPriority(b);
    
    // Сначала сортируем по приоритету
    const priorityDiff = priorityOrder[priorityA] - priorityOrder[priorityB];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    // Затем по дате (более старые просрочки вверх)
    return a.scheduledDate.getTime() - b.scheduledDate.getTime();
  });
}

// Фильтрация срочных задач для панели
export function getUrgentTasks(tasks: TaskWithPriority[], limit: number = 10): TaskWithPriority[] {
  const urgentTasks = tasks.filter(task => {
    const priority = calculateTaskPriority(task);
    return priority === 'CRITICAL' || priority === 'HIGH';
  });

  return sortTasksByPriority(urgentTasks).slice(0, limit);
}

// Подсчет задач по категориям
export function getTaskCounts(tasks: TaskWithPriority[]): {
  overdue: number;
  today: number;
  completed: number;
  total: number;
} {
  const today = startOfDay(new Date());
  
  return {
    overdue: tasks.filter(task => task.status === 'OVERDUE').length,
    today: tasks.filter(task => 
      task.status === 'AVAILABLE' && 
      startOfDay(task.scheduledDate).getTime() === today.getTime()
    ).length,
    completed: tasks.filter(task => 
      task.status === 'COMPLETED' &&
      task.completedAt &&
      startOfDay(task.completedAt).getTime() === today.getTime()
    ).length,
    total: tasks.length
  };
}
