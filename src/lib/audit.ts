// Утилиты для работы с аудит логами

export interface CreateAuditLogData {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(data: CreateAuditLogData) {
  try {
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Ошибка при создании аудит лога');
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка при создании аудит лога:', error);
    // Не прерываем выполнение основной операции из-за ошибки логирования
    return null;
  }
}

// Константы действий
export const AUDIT_ACTIONS = {
  // Пользователи
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',

  // Объекты
  OBJECT_CREATED: 'object_created',
  OBJECT_UPDATED: 'object_updated',
  OBJECT_DELETED: 'object_deleted',
  OBJECT_VIEWED: 'object_viewed',

  // Чек-листы
  CHECKLIST_CREATED: 'checklist_created',
  CHECKLIST_UPDATED: 'checklist_updated',
  CHECKLIST_DELETED: 'checklist_deleted',
  CHECKLIST_COMPLETED: 'checklist_completed',

  // Задачи
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_COMPLETED: 'task_completed',
  TASK_DELETED: 'task_deleted',

  // Заявки
  REQUEST_CREATED: 'request_created',
  REQUEST_UPDATED: 'request_updated',
  REQUEST_DELETED: 'request_deleted',
  REQUEST_STATUS_CHANGED: 'request_status_changed',

  // Фотоотчёты
  PHOTO_UPLOADED: 'photo_uploaded',
  PHOTO_DELETED: 'photo_deleted',
  PHOTO_VIEWED: 'photo_viewed',

  // Инвентарь
  INVENTORY_CREATED: 'inventory_created',
  INVENTORY_UPDATED: 'inventory_updated',
  INVENTORY_DELETED: 'inventory_deleted',

  // Уведомления
  NOTIFICATION_CREATED: 'notification_created',
  NOTIFICATION_READ: 'notification_read',
  NOTIFICATION_DELETED: 'notification_deleted',

  // Система
  SYSTEM_BACKUP: 'system_backup',
  SYSTEM_RESTORE: 'system_restore',
  SYSTEM_CONFIG_CHANGED: 'system_config_changed',
} as const;

// Константы ресурсов
export const AUDIT_RESOURCES = {
  USER: 'user',
  OBJECT: 'object',
  CHECKLIST: 'checklist',
  TASK: 'task',
  REQUEST: 'request',
  PHOTO: 'photo',
  INVENTORY: 'inventory',
  NOTIFICATION: 'notification',
  SYSTEM: 'system',
} as const;

// Функции для создания специфичных аудит логов
export async function logUserAction(userId: string, action: string, details?: any, ipAddress?: string, userAgent?: string) {
  return createAuditLog({
    userId,
    action,
    resource: AUDIT_RESOURCES.USER,
    resourceId: userId,
    details,
    ipAddress,
    userAgent,
  });
}

export async function logObjectAction(userId: string, action: string, objectId: string, details?: any) {
  return createAuditLog({
    userId,
    action,
    resource: AUDIT_RESOURCES.OBJECT,
    resourceId: objectId,
    details,
  });
}

export async function logChecklistAction(userId: string, action: string, checklistId: string, details?: any) {
  return createAuditLog({
    userId,
    action,
    resource: AUDIT_RESOURCES.CHECKLIST,
    resourceId: checklistId,
    details,
  });
}

export async function logTaskAction(userId: string, action: string, taskId: string, details?: any) {
  return createAuditLog({
    userId,
    action,
    resource: AUDIT_RESOURCES.TASK,
    resourceId: taskId,
    details,
  });
}

export async function logRequestAction(userId: string, action: string, requestId: string, details?: any) {
  return createAuditLog({
    userId,
    action,
    resource: AUDIT_RESOURCES.REQUEST,
    resourceId: requestId,
    details,
  });
}

export async function logPhotoAction(userId: string, action: string, photoId: string, details?: any) {
  return createAuditLog({
    userId,
    action,
    resource: AUDIT_RESOURCES.PHOTO,
    resourceId: photoId,
    details,
  });
}

export async function logInventoryAction(userId: string, action: string, inventoryId: string, details?: any) {
  return createAuditLog({
    userId,
    action,
    resource: AUDIT_RESOURCES.INVENTORY,
    resourceId: inventoryId,
    details,
  });
}

export async function logSystemAction(userId: string, action: string, details?: any) {
  return createAuditLog({
    userId,
    action,
    resource: AUDIT_RESOURCES.SYSTEM,
    details,
  });
}

// Функция для получения описания действия на русском языке
export function getActionDescription(action: string): string {
  const descriptions: { [key: string]: string } = {
    [AUDIT_ACTIONS.USER_LOGIN]: 'Вход в систему',
    [AUDIT_ACTIONS.USER_LOGOUT]: 'Выход из системы',
    [AUDIT_ACTIONS.USER_CREATED]: 'Создание пользователя',
    [AUDIT_ACTIONS.USER_UPDATED]: 'Обновление пользователя',
    [AUDIT_ACTIONS.USER_DELETED]: 'Удаление пользователя',

    [AUDIT_ACTIONS.OBJECT_CREATED]: 'Создание объекта',
    [AUDIT_ACTIONS.OBJECT_UPDATED]: 'Обновление объекта',
    [AUDIT_ACTIONS.OBJECT_DELETED]: 'Удаление объекта',
    [AUDIT_ACTIONS.OBJECT_VIEWED]: 'Просмотр объекта',

    [AUDIT_ACTIONS.CHECKLIST_CREATED]: 'Создание чек-листа',
    [AUDIT_ACTIONS.CHECKLIST_UPDATED]: 'Обновление чек-листа',
    [AUDIT_ACTIONS.CHECKLIST_DELETED]: 'Удаление чек-листа',
    [AUDIT_ACTIONS.CHECKLIST_COMPLETED]: 'Завершение чек-листа',

    [AUDIT_ACTIONS.TASK_CREATED]: 'Создание задачи',
    [AUDIT_ACTIONS.TASK_UPDATED]: 'Обновление задачи',
    [AUDIT_ACTIONS.TASK_COMPLETED]: 'Выполнение задачи',
    [AUDIT_ACTIONS.TASK_DELETED]: 'Удаление задачи',

    [AUDIT_ACTIONS.REQUEST_CREATED]: 'Создание заявки',
    [AUDIT_ACTIONS.REQUEST_UPDATED]: 'Обновление заявки',
    [AUDIT_ACTIONS.REQUEST_DELETED]: 'Удаление заявки',
    [AUDIT_ACTIONS.REQUEST_STATUS_CHANGED]: 'Изменение статуса заявки',

    [AUDIT_ACTIONS.PHOTO_UPLOADED]: 'Загрузка фото',
    [AUDIT_ACTIONS.PHOTO_DELETED]: 'Удаление фото',
    [AUDIT_ACTIONS.PHOTO_VIEWED]: 'Просмотр фото',

    [AUDIT_ACTIONS.INVENTORY_CREATED]: 'Создание позиции инвентаря',
    [AUDIT_ACTIONS.INVENTORY_UPDATED]: 'Обновление инвентаря',
    [AUDIT_ACTIONS.INVENTORY_DELETED]: 'Удаление позиции инвентаря',

    [AUDIT_ACTIONS.NOTIFICATION_CREATED]: 'Создание уведомления',
    [AUDIT_ACTIONS.NOTIFICATION_READ]: 'Прочтение уведомления',
    [AUDIT_ACTIONS.NOTIFICATION_DELETED]: 'Удаление уведомления',

    [AUDIT_ACTIONS.SYSTEM_BACKUP]: 'Резервное копирование',
    [AUDIT_ACTIONS.SYSTEM_RESTORE]: 'Восстановление системы',
    [AUDIT_ACTIONS.SYSTEM_CONFIG_CHANGED]: 'Изменение конфигурации',
  };

  return descriptions[action] || action;
}

// Функция для получения описания ресурса на русском языке
export function getResourceDescription(resource: string): string {
  const descriptions: { [key: string]: string } = {
    [AUDIT_RESOURCES.USER]: 'Пользователь',
    [AUDIT_RESOURCES.OBJECT]: 'Объект',
    [AUDIT_RESOURCES.CHECKLIST]: 'Чек-лист',
    [AUDIT_RESOURCES.TASK]: 'Задача',
    [AUDIT_RESOURCES.REQUEST]: 'Заявка',
    [AUDIT_RESOURCES.PHOTO]: 'Фото',
    [AUDIT_RESOURCES.INVENTORY]: 'Инвентарь',
    [AUDIT_RESOURCES.NOTIFICATION]: 'Уведомление',
    [AUDIT_RESOURCES.SYSTEM]: 'Система',
  };

  return descriptions[resource] || resource;
}
