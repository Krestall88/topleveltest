// Утилиты для работы с уведомлениями

export interface CreateNotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export async function createNotification(data: CreateNotificationData) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Ошибка при создании уведомления');
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка при создании уведомления:', error);
    throw error;
  }
}

// Типы уведомлений
export const NOTIFICATION_TYPES = {
  CHECKLIST_CREATED: 'checklist_created',
  CHECKLIST_COMPLETED: 'checklist_completed',
  CHECKLIST_OVERDUE: 'checklist_overdue',
  REQUEST_CREATED: 'request_created',
  REQUEST_UPDATED: 'request_updated',
  REQUEST_COMPLETED: 'request_completed',
  PHOTO_UPLOADED: 'photo_uploaded',
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  SYSTEM_ALERT: 'system_alert',
} as const;

// Функции для создания специфичных уведомлений
export async function notifyChecklistCreated(userId: string, checklistId: string, objectName: string) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.CHECKLIST_CREATED,
    title: 'Создан новый чек-лист',
    message: `Создан чек-лист для объекта "${objectName}"`,
    data: { checklistId, objectName },
    priority: 'MEDIUM',
  });
}

export async function notifyChecklistOverdue(userId: string, checklistId: string, objectName: string, daysOverdue: number) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.CHECKLIST_OVERDUE,
    title: 'Просроченный чек-лист',
    message: `Чек-лист для объекта "${objectName}" просрочен на ${daysOverdue} дн.`,
    data: { checklistId, objectName, daysOverdue },
    priority: 'HIGH',
  });
}

export async function notifyRequestCreated(userId: string, requestId: string, title: string, objectName: string) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.REQUEST_CREATED,
    title: 'Новая заявка',
    message: `Создана заявка "${title}" для объекта "${objectName}"`,
    data: { requestId, title, objectName },
    priority: 'MEDIUM',
  });
}

export async function notifyRequestUrgent(userId: string, requestId: string, title: string, objectName: string) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.REQUEST_CREATED,
    title: 'СРОЧНАЯ ЗАЯВКА',
    message: `Срочная заявка "${title}" для объекта "${objectName}"`,
    data: { requestId, title, objectName },
    priority: 'URGENT',
  });
}

export async function notifyTaskCompleted(userId: string, taskId: string, taskName: string, checklistId: string) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.TASK_COMPLETED,
    title: 'Задача выполнена',
    message: `Выполнена задача "${taskName}"`,
    data: { taskId, taskName, checklistId },
    priority: 'LOW',
  });
}

export async function notifyPhotoUploaded(userId: string, photoId: string, objectName?: string) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.PHOTO_UPLOADED,
    title: 'Загружен фотоотчёт',
    message: objectName 
      ? `Загружен фотоотчёт для объекта "${objectName}"`
      : 'Загружен новый фотоотчёт',
    data: { photoId, objectName },
    priority: 'LOW',
  });
}

export async function notifySystemAlert(userId: string, title: string, message: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM') {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.SYSTEM_ALERT,
    title,
    message,
    priority,
  });
}
