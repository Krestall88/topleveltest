// Переводы действий на русский язык
export const actionTranslations: Record<string, string> = {
  // Авторизация
  'LOGIN': 'Вход в систему',
  'LOGOUT': 'Выход из системы',
  'LOGIN_FAILED': 'Неудачная попытка входа',
  
  // Пользователи
  'USER_CREATED': 'Создан пользователь',
  'USER_UPDATED': 'Обновлен пользователь',
  'USER_DELETED': 'Удален пользователь',
  'PASSWORD_CHANGED': 'Изменен пароль',
  'RESET_MANAGER_PASSWORD': 'Сброшен пароль менеджера',
  
  // Объекты
  'OBJECT_CREATED': 'Создан объект',
  'OBJECT_UPDATED': 'Обновлен объект',
  'OBJECT_DELETED': 'Удален объект',
  
  // Участки
  'SITE_CREATED': 'Создан участок',
  'SITE_UPDATED': 'Обновлен участок',
  'SITE_DELETED': 'Удален участок',
  
  // Зоны
  'AREA_CREATED': 'Создана зона',
  'AREA_UPDATED': 'Обновлена зона',
  'AREA_DELETED': 'Удалена зона',
  
  // Группы помещений
  'ROOM_GROUP_CREATED': 'Создана группа помещений',
  'ROOM_GROUP_UPDATED': 'Обновлена группа помещений',
  'ROOM_GROUP_DELETED': 'Удалена группа помещений',
  
  // Помещения
  'ROOM_CREATED': 'Создано помещение',
  'ROOM_UPDATED': 'Обновлено помещение',
  'ROOM_DELETED': 'Удалено помещение',
  
  // Техкарты
  'TECH_CARD_CREATED': 'Создана техкарта',
  'TECH_CARD_UPDATED': 'Обновлена техкарта',
  'TECH_CARD_DELETED': 'Удалена техкарта',
  
  // Задачи
  'TASK_CREATED': 'Создана задача',
  'TASK_UPDATED': 'Обновлена задача',
  'TASK_COMPLETED': 'Завершена задача',
  'TASK_COMPLETED_UNIFIED': 'Завершена задача',
  'TASK_DELETED': 'Удалена задача',
  'TASK_ASSIGNED': 'Назначена задача',
  'TASK_REOPENED': 'Переоткрыта задача',
  
  // Чек-листы
  'CHECKLIST_CREATED': 'Создан чек-лист',
  'CHECKLIST_UPDATED': 'Обновлен чек-лист',
  'CHECKLIST_COMPLETED': 'Завершен чек-лист',
  'CHECKLIST_DELETED': 'Удален чек-лист',
  
  // Дополнительные задания
  'ADDITIONAL_TASK_CREATED': 'Создано доп. задание',
  'ADDITIONAL_TASK_UPDATED': 'Обновлено доп. задание',
  'ADDITIONAL_TASK_TAKEN': 'Взято в работу доп. задание',
  'ADDITIONAL_TASK_COMPLETED': 'Завершено доп. задание',
  'ADDITIONAL_TASK_DELETED': 'Удалено доп. задание',
  
  // Комментарии
  'COMMENT_CREATED': 'Добавлен комментарий',
  'COMMENT_UPDATED': 'Обновлен комментарий',
  'COMMENT_DELETED': 'Удален комментарий',
  
  // Фотографии
  'PHOTO_UPLOADED': 'Загружена фотография',
  'PHOTOS_UPLOADED': 'Загружены фотографии',
  'PHOTO_DELETED': 'Удалена фотография',
  
  // Инвентарь
  'INVENTORY_ITEM_CREATED': 'Создан элемент инвентаря',
  'INVENTORY_ITEM_UPDATED': 'Обновлен элемент инвентаря',
  'INVENTORY_ITEM_DELETED': 'Удален элемент инвентаря',
  'INVENTORY_MOVEMENT': 'Перемещение инвентаря',
  
  // Telegram
  'TELEGRAM_BOUND': 'Привязан Telegram',
  'TELEGRAM_UNBOUND': 'Отвязан Telegram',
  'TELEGRAM_MESSAGE_SENT': 'Отправлено сообщение в Telegram',
  
  // Отчеты
  'REPORT_GENERATED': 'Сгенерирован отчет',
  'REPORT_EXPORTED': 'Экспортирован отчет',
  
  // Настройки
  'SETTINGS_UPDATED': 'Обновлены настройки',
  
  // Прочее
  'FILE_UPLOADED': 'Загружен файл',
  'FILE_DELETED': 'Удален файл',
  'EXPORT_EXCEL': 'Экспорт в Excel',
  'IMPORT_EXCEL': 'Импорт из Excel',
};

// Переводы сущностей на русский язык
export const entityTranslations: Record<string, string> = {
  'USER': 'Пользователь',
  'OBJECT': 'Объект',
  'SITE': 'Участок',
  'AREA': 'Зона',
  'ROOM_GROUP': 'Группа помещений',
  'ROOM': 'Помещение',
  'TECH_CARD': 'Техкарта',
  'TASK': 'Задача',
  'CHECKLIST': 'Чек-лист',
  'ADDITIONAL_TASK': 'Доп. задание',
  'COMMENT': 'Комментарий',
  'PHOTO_REPORT': 'Фотоотчет',
  'INVENTORY_ITEM': 'Инвентарь',
  'TELEGRAM': 'Telegram',
  'REPORT': 'Отчет',
  'SETTINGS': 'Настройки',
  'FILE': 'Файл',
  'PhotoReport': 'Фотоотчет',
  'CleaningObject': 'Объект уборки',
  'AdditionalTask': 'Доп. задание',
};

// Функция для получения русского названия действия
export function getActionName(action: string): string {
  return actionTranslations[action] || action;
}

// Функция для получения русского названия сущности
export function getEntityName(entity: string): string {
  return entityTranslations[entity] || entity;
}

// Функция для форматирования деталей действия
export function formatDetails(action: string, details: any, entityName?: string): string {
  if (!details) return '';
  
  try {
    const detailsObj = typeof details === 'string' ? JSON.parse(details) : details;
    const parts: string[] = [];
    
    // Добавляем информацию об объекте, если есть
    if (detailsObj.objectName) {
      parts.push(`Объект: ${detailsObj.objectName}`);
    }
    
    // Добавляем информацию о помещении, если есть
    if (detailsObj.roomName) {
      parts.push(`Помещение: ${detailsObj.roomName}`);
    }
    
    switch (action) {
      case 'TASK_COMPLETED':
      case 'TASK_COMPLETED_UNIFIED':
        if (detailsObj.techCardName) {
          parts.push(`Техкарта: ${detailsObj.techCardName}`);
        }
        if (detailsObj.completionNote) {
          parts.push(`Комментарий: ${detailsObj.completionNote}`);
        }
        if (detailsObj.status) {
          const statusMap: Record<string, string> = {
            'COMPLETED': 'Выполнено',
            'FAILED': 'Не выполнено',
            'PARTIALLY_COMPLETED': 'Частично выполнено'
          };
          parts.push(`Статус: ${statusMap[detailsObj.status] || detailsObj.status}`);
        }
        break;
      
      case 'PHOTOS_UPLOADED':
        parts.push(`Загружено фотографий: ${detailsObj.photosCount || 1}`);
        if (detailsObj.comment) {
          parts.push(`Комментарий: ${detailsObj.comment}`);
        }
        break;
      
      case 'USER_CREATED':
      case 'USER_UPDATED':
        if (detailsObj.name) {
          parts.push(`Имя: ${detailsObj.name}`);
        }
        if (detailsObj.role) {
          const roleMap: Record<string, string> = {
            'ADMIN': 'Администратор',
            'MANAGER': 'Менеджер',
            'DEPUTY_ADMIN': 'Зам. администратора'
          };
          parts.push(`Роль: ${roleMap[detailsObj.role] || detailsObj.role}`);
        }
        break;
      
      case 'RESET_MANAGER_PASSWORD':
        if (detailsObj.managerName) {
          parts.push(`Менеджер: ${detailsObj.managerName}`);
        }
        if (detailsObj.newPassword) {
          parts.push(`Новый пароль: ${detailsObj.newPassword}`);
        }
        break;
      
      case 'ADDITIONAL_TASK_CREATED':
      case 'ADDITIONAL_TASK_UPDATED':
        if (detailsObj.description) {
          parts.push(`Описание: ${detailsObj.description}`);
        }
        if (detailsObj.source) {
          const sourceMap: Record<string, string> = {
            'TELEGRAM': 'Telegram',
            'WEB': 'Веб-интерфейс',
            'PHONE': 'Телефон'
          };
          parts.push(`Источник: ${sourceMap[detailsObj.source] || detailsObj.source}`);
        }
        if (detailsObj.status) {
          const statusMap: Record<string, string> = {
            'NEW': 'Новое',
            'IN_PROGRESS': 'В работе',
            'COMPLETED': 'Выполнено'
          };
          parts.push(`Статус: ${statusMap[detailsObj.status] || detailsObj.status}`);
        }
        break;
      
      case 'PHOTO_DELETED':
        if (detailsObj.photoUrl) {
          parts.push(`Фото удалено`);
        }
        break;
      
      default:
        // Для остальных действий просто выводим название объекта
        break;
    }
    
    return parts.join(' • ');
  } catch (e) {
    return '';
  }
}
