// Утилиты для работы с детальной информацией задач

export interface TaskDetails {
  id: string;
  description: string;
  status: string;
  completionType?: 'simple' | 'comment' | 'photo';
  completionComment?: string;
  completionPhotos?: string[];
  completedAt?: Date;
  completedBy?: {
    id: string;
    name: string;
  };
  
  // Детальная информация о местоположении
  object: {
    id: string;
    name: string;
    address: string;
  };
  room?: {
    id: string;
    name: string;
    area: number;
  };
  zone?: {
    id: string;
    name: string;
  };
  site?: {
    id: string;
    name: string;
  };
  
  // Техкарта с деталями
  techCard: {
    id: string;
    name: string;
    description: string;
    workType: string;
    frequency: string;
  };
  
  // Комментарии администраторов
  adminComments?: TaskComment[];
  
  // Уведомления
  notifications?: Notification[];
}

export interface TaskComment {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
  type: 'admin_note' | 'completion_reason' | 'feedback';
}

export interface Notification {
  id: string;
  type: 'task_commented' | 'task_feedback' | 'task_status_changed';
  message: string;
  isRead: boolean;
  createdAt: Date;
}

// Функция для получения полной детальной информации о задаче
export const getTaskFullDetails = async (taskId: string): Promise<TaskDetails | null> => {
  try {
    const response = await fetch(`/api/tasks/${taskId}/details`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Ошибка получения деталей задачи:', error);
    return null;
  }
};

// Функция для добавления комментария администратора
export const addAdminComment = async (taskId: string, comment: string, type: string) => {
  try {
    const response = await fetch(`/api/tasks/${taskId}/admin-comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: comment,
        type: type
      }),
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Ошибка добавления комментария');
  } catch (error) {
    console.error('Ошибка добавления комментария:', error);
    throw error;
  }
};

// Функция для получения миниатюр фотографий
export const getPhotoThumbnails = (photos: string[]): string[] => {
  return photos.map(photo => {
    // Преобразуем путь к фото в путь к миниатюре
    const pathParts = photo.split('/');
    const filename = pathParts[pathParts.length - 1];
    const [name, ext] = filename.split('.');
    return photo.replace(filename, `thumbnails/${name}-thumb.${ext}`);
  });
};

// Функция для форматирования местоположения задачи
export const formatTaskLocation = (task: TaskDetails): string => {
  const parts = [];
  
  if (task.object) parts.push(`Объект: ${task.object.name}`);
  if (task.site) parts.push(`Участок: ${task.site.name}`);
  if (task.zone) parts.push(`Зона: ${task.zone.name}`);
  if (task.room) parts.push(`Помещение: ${task.room.name} (${task.room.area} м²)`);
  
  return parts.join(' → ');
};

// Функция для определения иконки статуса задачи
export const getTaskStatusIcon = (status: string, completionType?: string) => {
  switch (status) {
    case 'COMPLETED':
      if (completionType === 'photo') return '📷';
      if (completionType === 'comment') return '💬';
      return '✅';
    case 'OVERDUE':
      return '⏰';
    case 'IN_PROGRESS':
      return '🔄';
    case 'FAILED':
      return '❌';
    default:
      return '📋';
  }
};

// Функция для получения цвета статуса
export const getTaskStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'text-green-600 bg-green-50';
    case 'OVERDUE':
      return 'text-red-600 bg-red-50';
    case 'IN_PROGRESS':
      return 'text-blue-600 bg-blue-50';
    case 'FAILED':
      return 'text-orange-600 bg-orange-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};
