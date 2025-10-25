// Утилиты для работы с виртуальными задачами
import { prisma } from '@/lib/prisma';

export interface VirtualTask {
  id: string; // techCardId-date
  techCardId: string;
  techCard: {
    id: string;
    name: string;
    description: string;
    frequency: string;
    objectId: string;
    roomId: string;
    object: {
      id: string;
      name: string;
      address: string;
    };
    room: {
      id: string;
      name: string;
      area: number;
    };
  };
  scheduledDate: Date;
  status: 'PENDING' | 'AVAILABLE' | 'OVERDUE' | 'COMPLETED' | 'IN_PROGRESS';
  isVirtual: boolean;
  realTask?: any; // Реальная задача если существует
}

// Вычисляет статус виртуальной задачи
export function calculateVirtualTaskStatus(
  techCard: any, 
  date: Date, 
  realTask?: any
): 'PENDING' | 'AVAILABLE' | 'OVERDUE' | 'COMPLETED' | 'IN_PROGRESS' {
  // Если есть реальная задача, используем её статус
  if (realTask) {
    return realTask.status;
  }

  const now = new Date();
  const taskDate = new Date(date);
  
  // Сбрасываем время для сравнения только дат
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const scheduledDate = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());

  if (scheduledDate > nowDate) {
    return 'PENDING'; // Будущая задача
  } else if (scheduledDate.getTime() === nowDate.getTime()) {
    return 'AVAILABLE'; // Сегодняшняя задача
  } else {
    return 'OVERDUE'; // Просроченная задача
  }
}

// Генерирует виртуальные задачи на основе техкарт
export async function generateVirtualTasks(
  dateFrom: Date,
  dateTo: Date,
  managerId?: string,
  objectId?: string
): Promise<VirtualTask[]> {
  // Получаем техкарты с фильтрами
  const whereClause: any = {};
  
  if (objectId) {
    whereClause.objectId = objectId;
  }
  
  if (managerId) {
    whereClause.object = {
      managerId: managerId
    };
  }

  const techCards = await prisma.techCard.findMany({
    where: whereClause,
    include: {
      object: {
        select: {
          id: true,
          name: true,
          address: true,
          managerId: true
        }
      },
      room: {
        select: {
          id: true,
          name: true,
          area: true
        }
      }
    }
  });

  const virtualTasks: VirtualTask[] = [];
  
  // Генерируем задачи для каждого дня в диапазоне
  const currentDate = new Date(dateFrom);
  while (currentDate <= dateTo) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    for (const techCard of techCards) {
      // Проверяем нужно ли создать задачу на эту дату
      if (shouldCreateTaskForDate(techCard, currentDate)) {
        const virtualTaskId = `${techCard.id}-${dateStr}`;
        
        virtualTasks.push({
          id: virtualTaskId,
          techCardId: techCard.id,
          techCard: {
            id: techCard.id,
            name: techCard.name,
            description: techCard.description || '',
            frequency: techCard.frequency || 'ежедневно',
            objectId: techCard.objectId,
            roomId: techCard.roomId,
            object: techCard.object,
            room: techCard.room
          },
          scheduledDate: new Date(currentDate),
          status: calculateVirtualTaskStatus(techCard, currentDate),
          isVirtual: true
        });
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return virtualTasks;
}

// Определяет нужно ли создать задачу на конкретную дату
function shouldCreateTaskForDate(techCard: any, date: Date): boolean {
  const frequency = techCard.frequency?.toLowerCase() || 'ежедневно';
  
  // Упрощенная логика - для демонстрации
  switch (frequency) {
    case 'ежедневно':
    case 'daily':
      return true; // Каждый день
    
    case 'еженедельно':
    case 'weekly':
      return date.getDay() === 1; // Понедельник
    
    case 'ежемесячно':
    case 'monthly':
      return date.getDate() === 1; // Первое число месяца
    
    default:
      return true; // По умолчанию ежедневно
  }
}

// Получает виртуальные задачи с учетом реальных
export async function getVirtualTasksWithReal(
  dateFrom: Date,
  dateTo: Date,
  managerId?: string,
  objectId?: string
): Promise<VirtualTask[]> {
  // Генерируем виртуальные задачи
  const virtualTasks = await generateVirtualTasks(dateFrom, dateTo, managerId, objectId);
  
  // Получаем реальные задачи для этого периода
  const realTasks = await prisma.task.findMany({
    where: {
      scheduledStart: {
        gte: dateFrom,
        lte: dateTo
      },
      ...(objectId && { 
        room: { 
          roomGroup: { 
            zone: { 
              site: { 
                objectId: objectId 
              } 
            } 
          } 
        } 
      })
    }
  });

  // Создаем карту реальных задач по ID
  const realTasksMap = new Map();
  realTasks.forEach(task => {
    const dateStr = task.scheduledStart?.toISOString().split('T')[0];
    const virtualId = `${task.id.split('-')[0]}-${dateStr}`;
    realTasksMap.set(virtualId, task);
  });

  // Обновляем виртуальные задачи с реальными данными
  return virtualTasks.map(virtualTask => {
    const realTask = realTasksMap.get(virtualTask.id);
    if (realTask) {
      return {
        ...virtualTask,
        status: realTask.status,
        realTask: realTask,
        isVirtual: false
      };
    }
    return virtualTask;
  });
}

// Материализует виртуальную задачу в реальную
export async function materializeTask(
  techCardId: string,
  date: Date,
  action: 'comment' | 'complete' | 'start'
): Promise<any> {
  const dateStr = date.toISOString().split('T')[0];
  const taskId = `${techCardId}-${dateStr}`;
  
  // Проверяем есть ли уже реальная задача
  let task = await prisma.task.findUnique({
    where: { id: taskId }
  });
  
  if (task) {
    return task; // Задача уже существует
  }
  
  console.log('🔍 МАТЕРИАЛИЗАЦИЯ: Ищем техкарту:', { techCardId, dateStr });
  
  // Получаем техкарту для создания задачи
  const techCard = await prisma.techCard.findUnique({
    where: { id: techCardId },
    include: {
      object: true,
      room: true
    }
  });
  
  console.log('🔍 МАТЕРИАЛИЗАЦИЯ: Результат поиска техкарты:', { 
    found: !!techCard, 
    techCardId: techCard?.id,
    objectName: techCard?.object?.name 
  });
  
  if (!techCard) {
    console.log('❌ ОШИБКА: Техкарта не найдена!', { techCardId });
    throw new Error(`Техкарта не найдена: ${techCardId}`);
  }
  
  // Создаем реальную задачу
  task = await prisma.task.create({
    data: {
      id: taskId,
      description: techCard.name,
      status: action === 'complete' ? 'COMPLETED' : 'IN_PROGRESS',
      objectName: techCard.object?.name || 'Неизвестный объект',
      roomName: techCard.room?.name || 'Неизвестное помещение',
      scheduledStart: date,
      scheduledEnd: new Date(date.getTime() + 8 * 60 * 60 * 1000), // +8 часов
      roomId: techCard.roomId,
      // 🔥 ДОБАВЛЯЕМ СВЯЗЬ С ЧЕКЛИСТОМ для правильной фильтрации
      checklistId: techCard.id
    }
  });
  
  console.log(`✅ Материализована задача: ${taskId}`);
  return task;
}
