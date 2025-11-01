// Единая система управления задачами календаря
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, addDays, subDays } from 'date-fns';

// Единая структура задачи
export interface UnifiedTask {
  id: string;
  type: 'VIRTUAL' | 'MATERIALIZED';
  
  // Основные поля
  techCardId: string;
  description: string;
  scheduledDate: Date;
  status: 'PENDING' | 'AVAILABLE' | 'OVERDUE' | 'COMPLETED' | 'IN_PROGRESS';
  
  // Информация об объекте и помещении
  objectId: string;
  objectName: string;
  roomId?: string;
  roomName?: string;
  
  // Информация о техкарте
  techCard: {
    id: string;
    name: string;
    description?: string;
    frequency: string;
    workType?: string;
  };
  
  // Информация об объекте
  object: {
    id: string;
    name: string;
    manager?: {
      id: string;
      name: string;
      phone?: string;
    };
  };
  
  // Поля только для материализованных задач
  completedAt?: Date;
  completedBy?: {
    id: string;
    name: string;
  };
  completionComment?: string;
  completionPhotos?: string[];
  
  // Метаданные
  frequency: string;
  frequencyDays: number;
}

// Статистика по задачам
export interface TaskStats {
  total: number;
  completed: number;
  overdue: number;
  today: number;
  pending: number;
}

// Группировка задач по менеджеру
export interface ManagerTaskGroup {
  manager: {
    id: string;
    name: string;
    phone?: string;
  };
  tasks: UnifiedTask[];
  stats: TaskStats;
  objects: Array<{ id: string; name: string; }>;
  byPeriodicity: Array<{
    frequency: string;
    count: number;
    tasks: UnifiedTask[];
  }>;
}

// Группировка задач по периодичности
export interface PeriodicityGroup {
  frequency: string;
  tasks: UnifiedTask[];
  stats: TaskStats;
}

// Группировка задач по объекту
export interface ObjectTaskGroup {
  object: {
    id: string;
    name: string;
  };
  manager?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  tasks: UnifiedTask[];
  stats: TaskStats;
  byPeriodicity?: PeriodicityGroup[];
}

// Результат API календаря
export interface CalendarResponse {
  // Задачи по статусам
  overdue: UnifiedTask[];
  today: UnifiedTask[];
  upcoming: UnifiedTask[];
  completed: UnifiedTask[];
  
  // Группировки для админов
  byManager: ManagerTaskGroup[];
  byObject: ObjectTaskGroup[];
  
  // Общая статистика
  total: number;
  userRole: string;
}

// Парсинг периодичности
export function parseFrequencyDays(frequency: string): number {
  const freq = frequency.toLowerCase();
  
  if (freq.includes('ежедневно') || freq.includes('каждый день') || freq === 'daily') {
    return 1;
  } else if (freq.includes('еженедельно') || freq.includes('раз в неделю') || freq === 'weekly') {
    return 7;
  } else if (freq.includes('ежемесячно') || freq.includes('раз в месяц') || freq === 'monthly') {
    return 30;
  } else if (freq.includes('ежеквартально') || freq.includes('раз в квартал') || freq === 'quarterly') {
    return 90;
  } else if (freq.includes('раз в год') || freq.includes('ежегодно') || freq === 'yearly') {
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
    }
  }
  
  return 1; // По умолчанию ежедневно
}

// Определение статуса виртуальной задачи
export function calculateTaskStatus(scheduledDate: Date): 'PENDING' | 'AVAILABLE' | 'OVERDUE' {
  const now = new Date();
  const today = startOfDay(now);
  const taskDate = startOfDay(scheduledDate);
  
  if (taskDate.getTime() === today.getTime()) {
    return 'AVAILABLE'; // Сегодняшняя задача
  } else if (taskDate < today) {
    // ИСПРАВЛЕНО: Не помечаем старые задачи как просроченные автоматически
    // Просроченными будут только те, что не выполнены И это ежедневные задачи
    return 'PENDING'; // Временно помечаем как будущие, логика просрочки в другом месте
  } else {
    return 'PENDING'; // Будущая задача
  }
}

// Генерация виртуальных задач из техкарт
export async function generateVirtualTasks(
  baseDate: Date,
  userRole: string,
  userId?: string,
  objectId?: string
): Promise<UnifiedTask[]> {
  // Строим условия для поиска техкарт
  const whereClause: any = {};

  // Права доступа
  if (userRole === 'MANAGER') {
    whereClause.object = {
      managerId: userId
    };
  } else if (userRole === 'DEPUTY_ADMIN') {
    // Заместитель видит только задачи по назначенным ему объектам
    const deputyAssignments = await prisma.deputyAdminAssignment.findMany({
      where: { deputyAdminId: userId },
      select: { objectId: true }
    });
    
    const assignedObjectIds = deputyAssignments.map(a => a.objectId);
    
    if (assignedObjectIds.length > 0) {
      whereClause.objectId = { in: assignedObjectIds };
    } else {
      // Если нет назначенных объектов, не показываем задачи
      whereClause.objectId = 'no-objects';
    }
  } else if (objectId) {
    whereClause.objectId = objectId;
  }

  // Получаем техкарты
  const techCards = await prisma.techCard.findMany({
    where: whereClause,
    include: {
      object: {
        select: {
          id: true,
          name: true,
          manager: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          }
        }
      },
      room: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  const virtualTasks: UnifiedTask[] = [];
  
  // Генерируем задачи на диапазон дат (от -2 до +7 дней от базовой даты)
  for (let i = -2; i <= 7; i++) {
    const taskDate = addDays(baseDate, i);
    
    for (const techCard of techCards) {
      const frequencyDays = parseFrequencyDays(techCard.frequency || 'ежедневно');
      
      // Проверяем, нужно ли создать задачу в этот день
      let shouldCreateTask = false;
      
      if (frequencyDays === 1) {
        // Ежедневные задачи - создаем всегда
        shouldCreateTask = true;
      } else if (frequencyDays === 7) {
        // Еженедельные задачи - создаем в понедельник (день недели 1)
        shouldCreateTask = taskDate.getDay() === 1;
      } else if (frequencyDays === 30) {
        // Ежемесячные задачи - создаем 1-го числа
        shouldCreateTask = taskDate.getDate() === 1;
      } else if (frequencyDays === 90) {
        // Ежеквартальные задачи - создаем 1-го числа первого месяца квартала
        const month = taskDate.getMonth();
        shouldCreateTask = taskDate.getDate() === 1 && (month === 0 || month === 3 || month === 6 || month === 9);
      } else if (frequencyDays === 365) {
        // Ежегодные задачи - создаем 1 января
        shouldCreateTask = taskDate.getMonth() === 0 && taskDate.getDate() === 1;
      } else {
        // Для других периодичностей используем день года
        const dayOfYear = Math.floor((taskDate.getTime() - new Date(taskDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        shouldCreateTask = dayOfYear % frequencyDays === 0;
      }
      
      if (shouldCreateTask) {
        const taskId = `${techCard.id}-${taskDate.toISOString().split('T')[0]}`;
        const status = calculateTaskStatus(taskDate);
        
        virtualTasks.push({
          id: taskId,
          type: 'VIRTUAL',
          techCardId: techCard.id,
          description: techCard.name,
          scheduledDate: taskDate,
          status,
          
          objectId: techCard.objectId,
          objectName: techCard.object.name,
          roomId: techCard.roomId || undefined,
          roomName: techCard.room?.name || undefined,
          
          techCard: {
            id: techCard.id,
            name: techCard.name,
            description: techCard.description || undefined,
            frequency: techCard.frequency || 'ежедневно',
            workType: techCard.workType || undefined
          },
          
          object: {
            id: techCard.object.id,
            name: techCard.object.name,
            manager: techCard.object.manager || undefined
          },
          
          frequency: techCard.frequency || 'ежедневно',
          frequencyDays
        });
      }
    }
  }
  
  return virtualTasks;
}

// Получение материализованных (завершенных) задач
export async function getMaterializedTasks(
  baseDate: Date,
  userRole: string,
  userId?: string,
  objectId?: string
): Promise<UnifiedTask[]> {
  // ИСПРАВЛЕНО: Ищем задачи только для конкретного дня
  const startDate = startOfDay(baseDate);
  const endDate = endOfDay(baseDate);
  
  console.log('🔍 MATERIALIZED: Поиск выполненных задач для конкретного дня:', {
    baseDate: baseDate.toISOString().split('T')[0],
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });
  
  // Строим условия для поиска завершенных задач
  const whereClause: any = {
    OR: [
      { status: 'COMPLETED' },
      { status: 'CLOSED_WITH_PHOTO' }
    ],
    completedAt: {
      gte: startDate,
      lte: endDate
    }
  };

  // Добавляем фильтр по правам доступа
  if (userRole === 'MANAGER') {
    // Для менеджера - задачи объектов, которыми он управляет
    const managerObjects = await prisma.cleaningObject.findMany({
      where: { managerId: userId },
      select: { name: true }
    });
    const objectNames = managerObjects.map(obj => obj.name);
    
    if (objectNames.length > 0) {
      whereClause.objectName = { in: objectNames };
    } else {
      whereClause.objectName = { in: [] }; // Пустой результат
    }
  } else if (userRole === 'DEPUTY_ADMIN') {
    // Для заместителя - задачи только по назначенным объектам
    const deputyAssignments = await prisma.deputyAdminAssignment.findMany({
      where: { deputyAdminId: userId },
      select: { objectId: true }
    });
    
    if (deputyAssignments.length > 0) {
      const assignedObjects = await prisma.cleaningObject.findMany({
        where: { id: { in: deputyAssignments.map(a => a.objectId) } },
        select: { name: true }
      });
      const objectNames = assignedObjects.map(obj => obj.name);
      
      if (objectNames.length > 0) {
        whereClause.objectName = { in: objectNames };
      } else {
        whereClause.objectName = { in: [] }; // Пустой результат
      }
    } else {
      whereClause.objectName = { in: [] }; // Нет назначенных объектов
    }
  } else if (objectId) {
    // Для админа с выбранным объектом
    const selectedObject = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      select: { name: true }
    });
    if (selectedObject) {
      whereClause.objectName = selectedObject.name;
    }
  }

  console.log('🔍 MATERIALIZE: Поиск завершенных задач:', {
    userRole,
    userId,
    objectId,
    dateRange: { from: startDate.toISOString(), to: endDate.toISOString() },
    whereClause
  });

  const completedTasks = await prisma.task.findMany({
    where: whereClause,
    include: {
      completedBy: { select: { id: true, name: true } },
      checklist: {
        include: {
          object: { 
            select: { 
              id: true, 
              name: true,
              manager: {
                select: {
                  id: true,
                  name: true,
                  phone: true
                }
              }
            } 
          },
          room: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { completedAt: 'desc' }
  });

  console.log('🔍 MATERIALIZE: Найдено завершенных задач:', {
    count: completedTasks.length,
    tasks: completedTasks.map(t => ({ id: t.id, status: t.status, completedAt: t.completedAt, objectName: t.objectName }))
  });

  // Логируем структуру первых 3 задач для отладки
  completedTasks.slice(0, 3).forEach((task, index) => {
    console.log(`🔍 MATERIALIZE: Структура задачи ${index + 1}:`, {
      id: task.id,
      objectName: task.objectName,
      hasChecklist: !!task.checklist,
      checklistId: task.checklistId,
      checklist: task.checklist ? {
        id: task.checklist.id,
        hasObject: !!task.checklist.object,
        object: task.checklist.object ? {
          id: task.checklist.object.id,
          name: task.checklist.object.name,
          hasManager: !!task.checklist.object.manager,
          manager: task.checklist.object.manager
        } : null
      } : null
    });
  });

  // Получаем информацию об объектах для завершенных задач
  const objectNames = [...new Set(completedTasks.map(task => task.objectName).filter(Boolean))] as string[];
  const objectsInfo = await prisma.cleaningObject.findMany({
    where: { name: { in: objectNames } },
    include: {
      manager: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      }
    }
  });

  // Создаем карту объектов для быстрого поиска
  const objectsMap = new Map(objectsInfo.map(obj => [obj.name, obj]));

  console.log('🔍 MATERIALIZE: Карта объектов для завершенных задач:', {
    objectNames,
    objectsCount: objectsInfo.length,
    objectsWithManagers: objectsInfo.filter(obj => obj.manager).length
  });

  // Преобразуем в единый формат
  return completedTasks.map(task => {
    const objectInfo = objectsMap.get(task.objectName || '');
    
    // Пытаемся извлечь techCardId из разных источников
    let techCardId = 'unknown';
    
    // 1. Сначала пробуем checklistId
    if (task.checklistId && task.checklistId !== 'unknown') {
      techCardId = task.checklistId;
    }
    // 2. Если нет, пытаемся извлечь из ID задачи (формат: techCardId-YYYY-MM-DD)
    else if (task.id && task.id.includes('-')) {
      // ID формата: cmgz4wnwm000jvygkm0ag73u4-2025-10-25
      // Ищем последние 3 сегмента, которые выглядят как дата (число-число-число)
      const parts = task.id.split('-');
      
      // Проверяем, что последние 3 части - это дата
      if (parts.length >= 4) {
        const lastThree = parts.slice(-3);
        const isDate = lastThree.every(part => /^\d+$/.test(part));
        
        if (isDate) {
          // Последние 3 части - дата, все остальное - techCardId
          techCardId = parts.slice(0, -3).join('-');
        } else {
          // Если не похоже на дату, возможно это старый формат
          console.warn('🔍 MATERIALIZE: ID задачи не содержит дату в конце:', task.id);
        }
      }
    }
    // 3. Если все еще unknown, оставляем как есть
    // Это предотвратит создание разных ID для одинаковых задач
    
    // Извлекаем frequency из failureReason (временное решение)
    const frequency = task.failureReason || 'unknown';
    
    console.log('🔍 MATERIALIZE: Обработка завершенной задачи:', {
      taskId: task.id,
      checklistId: task.checklistId,
      objectName: task.objectName,
      description: task.description,
      foundObjectInfo: !!objectInfo,
      managerFromObjectInfo: objectInfo?.manager?.name || 'НЕТ',
      managerFromChecklist: task.checklist?.object?.manager?.name || 'НЕТ',
      extractedTechCardId: techCardId,
      extractedFrequency: frequency,
      techCardIdSource: task.checklistId ? 'checklistId' : task.id?.includes('-') ? 'taskId' : 'fallback'
    });
    
    return {
      id: task.id,
      type: 'MATERIALIZED' as const,
      techCardId: techCardId,
      description: task.description,
      scheduledDate: task.scheduledStart || task.completedAt || new Date(),
      status: 'COMPLETED' as const,
      
      objectId: objectInfo?.id || task.checklist?.object?.id || 'unknown',
      objectName: task.objectName || 'Неизвестный объект',
      roomId: task.checklist?.room?.id || undefined,
      roomName: task.checklist?.room?.name || task.roomName || undefined,
      
      techCard: {
        id: task.checklistId || 'unknown',
        name: task.description,
        frequency: frequency
      },
      
      object: {
        id: objectInfo?.id || 'unknown',
        name: task.objectName || 'Неизвестный объект',
        manager: objectInfo?.manager ? {
          id: objectInfo.manager.id,
          name: objectInfo.manager.name || 'Неизвестный менеджер',
          phone: objectInfo.manager.phone || undefined
        } : undefined
      },
      
      completedAt: task.completedAt || undefined,
      completedBy: task.completedBy ? {
        id: task.completedBy.id,
        name: task.completedBy.name || 'Неизвестный пользователь'
      } : undefined,
      completionComment: task.completionComment || undefined,
      completionPhotos: task.completionPhotos || [],
      
      frequency: frequency,
      frequencyDays: 1
    };
  });
}

// Получение просроченных ежедневных задач с предыдущих дней
export async function getOverdueDailyTasks(
  baseDate: Date,
  userRole: string,
  userId?: string,
  objectId?: string
): Promise<UnifiedTask[]> {
  const today = startOfDay(baseDate);
  
  console.log('🔍 OVERDUE: Поиск просроченных ежедневных задач до:', {
    baseDate: baseDate.toISOString().split('T')[0]
  });

  const overdueTasks: UnifiedTask[] = [];
  
  // Проверяем последние 7 дней на предмет невыполненных ежедневных задач
  for (let i = 1; i <= 7; i++) {
    const checkDate = subDays(today, i);
    
    // Получаем виртуальные задачи для этого дня
    const dayTasks = await generateVirtualTasks(checkDate, userRole, userId, objectId);
    
    // Фильтруем только ежедневные задачи
    const dailyTasks = dayTasks.filter(task => {
      const isDailyTask = task.frequency?.toLowerCase().includes('ежедневно') || task.frequency === 'daily';
      return isDailyTask;
    });

    // Проверяем каждую ежедневную задачу
    for (const task of dailyTasks) {
      // Ищем материализованную (выполненную) версию этой задачи
      const completedTask = await prisma.task.findFirst({
        where: {
          // Ищем по уникальному ID задачи для конкретного дня
          OR: [
            { id: task.id },
            {
              // Или по комбинации description + objectName + дата
              AND: [
                { description: task.description },
                { objectName: task.objectName },
                { scheduledStart: {
                  gte: startOfDay(checkDate),
                  lte: endOfDay(checkDate)
                }},
                { status: { in: ['COMPLETED', 'CLOSED_WITH_PHOTO'] }}
              ]
            }
          ]
        }
      });

      if (!completedTask) {
        // Задача не выполнена - добавляем как просроченную
        overdueTasks.push({
          ...task,
          status: 'OVERDUE',
          scheduledDate: checkDate // Сохраняем оригинальную дату
        });
      }
    }
  }

  console.log('🔍 OVERDUE: Найдено просроченных ежедневных задач:', overdueTasks.length);
  return overdueTasks;
}

// Объединение виртуальных и материализованных задач
export async function getUnifiedTasks(
  baseDate: Date,
  userRole: string,
  userId?: string,
  objectId?: string
): Promise<UnifiedTask[]> {
  console.log('🔍 UNIFIED: Получение объединенных задач:', { baseDate, userRole, userId, objectId });

  // ВРЕМЕННО ОТКЛЮЧЕНО: getOverdueDailyTasks вызывает бесконечный цикл
  console.log('🔍 UNIFIED: Начинаем получение виртуальных и материализованных задач...');
  const [virtualTasks, materializedTasks] = await Promise.all([
    generateVirtualTasks(baseDate, userRole, userId, objectId),
    getMaterializedTasks(baseDate, userRole, userId, objectId)
  ]);
  
  // Пустой массив просроченных задач пока что
  const overdueTasks: UnifiedTask[] = [];

  console.log('🔍 UNIFIED: Получено задач:', {
    virtual: virtualTasks.length,
    materialized: materializedTasks.length,
    overdue: overdueTasks.length
  });

  // Объединяем задачи, убирая дубликаты
  const taskMap = new Map<string, UnifiedTask>();
  
  // Сначала добавляем виртуальные задачи
  virtualTasks.forEach(task => {
    taskMap.set(task.id, task);
  });
  
  // Добавляем просроченные задачи (они не должны пересекаться с текущими)
  overdueTasks.forEach(task => {
    taskMap.set(task.id, task);
  });
  
  // Затем заменяем материализованными (если есть)
  materializedTasks.forEach(task => {
    taskMap.set(task.id, task);
  });
  
  return Array.from(taskMap.values());
}

// Получение просроченных задач с учетом статуса в БД
export async function getActualOverdueTasks(
  baseDate: Date,
  userRole: string,
  userId?: string,
  objectId?: string
): Promise<UnifiedTask[]> {
  const today = startOfDay(baseDate);
  
  console.log('🔍 OVERDUE: Поиск реальных просроченных задач до:', {
    baseDate: baseDate.toISOString().split('T')[0]
  });

  // Ищем невыполненные ежедневные задачи с предыдущих дней в БД
  const whereClause: any = {
    scheduledStart: {
      lt: today // Дата меньше сегодняшней
    },
    status: {
      notIn: ['COMPLETED', 'CLOSED_WITH_PHOTO', 'FAILED'] // Не выполненные и не сброшенные
    }
  };

  // Добавляем фильтр по правам доступа
  if (userRole === 'MANAGER') {
    const managerObjects = await prisma.cleaningObject.findMany({
      where: { managerId: userId },
      select: { name: true }
    });
    const objectNames = managerObjects.map(obj => obj.name);
    
    if (objectNames.length > 0) {
      whereClause.objectName = { in: objectNames };
    } else {
      whereClause.objectName = { in: [] };
    }
  } else if (userRole === 'DEPUTY_ADMIN') {
    const deputyAssignments = await prisma.deputyAdminAssignment.findMany({
      where: { deputyAdminId: userId },
      select: { objectId: true }
    });
    
    if (deputyAssignments.length > 0) {
      const assignedObjects = await prisma.cleaningObject.findMany({
        where: { id: { in: deputyAssignments.map(a => a.objectId) }},
        select: { name: true }
      });
      whereClause.objectName = { in: assignedObjects.map(obj => obj.name) };
    } else {
      whereClause.objectName = { in: [] };
    }
  }

  if (objectId) {
    const targetObject = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      select: { name: true }
    });
    if (targetObject) {
      whereClause.objectName = targetObject.name;
    }
  }

  const overdueTasks = await prisma.task.findMany({
    where: whereClause,
    include: {
      room: {
        include: {
          object: {
            include: {
              manager: true
            }
          }
        }
      }
    }
  });

  console.log('🔍 OVERDUE: Найдено реальных просроченных задач:', overdueTasks.length);

  // Преобразуем в UnifiedTask формат
  return overdueTasks.map(task => ({
    id: task.id,
    type: 'MATERIALIZED' as const,
    description: task.description,
    status: 'OVERDUE' as const,
    scheduledDate: task.scheduledStart || new Date(),
    objectId: task.room?.object?.id || 'unknown',
    objectName: task.objectName || 'Неизвестный объект',
    roomId: task.roomId || undefined,
    roomName: task.roomName || undefined,
    techCardId: 'unknown',
    techCard: {
      id: 'unknown',
      name: task.description,
      description: task.description,
      frequency: 'daily'
    },
    object: task.room?.object ? {
      id: task.room.object.id,
      name: task.room.object.name,
      manager: task.room.object.manager ? {
        id: task.room.object.manager.id,
        name: task.room.object.manager.name || 'Неизвестен',
        phone: task.room.object.manager.phone || undefined
      } : undefined
    } : undefined,
    completedAt: task.completedAt,
    completedBy: task.completedById ? {
      id: task.completedById,
      name: 'Неизвестен'
    } : undefined,
    completionComment: task.completionComment || undefined,
    completionPhotos: task.completionPhotos || [],
    frequency: 'daily',
    frequencyDays: 1
  }));
}

// Группировка задач по статусам с учетом конкретного дня
export function groupTasksByStatus(tasks: UnifiedTask[], baseDate: Date, overdueTasks: UnifiedTask[] = []) {
  const today = startOfDay(baseDate);
  
  console.log('🔍 STATUS: Группировка задач по статусам для даты:', {
    baseDate: baseDate.toISOString().split('T')[0],
    totalTasks: tasks.length,
    overdueTasksCount: overdueTasks.length
  });

  const result = {
    // Просроченные: используем переданный список реальных просроченных задач
    overdue: overdueTasks,
    
    // Сегодняшние: задачи точно на эту дату
    today: tasks.filter(task => {
      if (task.status !== 'AVAILABLE') return false;
      const taskDate = startOfDay(task.scheduledDate);
      return taskDate.getTime() === today.getTime();
    }),
    
    // Будущие: задачи на даты после сегодня
    upcoming: tasks.filter(task => {
      if (task.status !== 'PENDING') return false;
      const taskDate = startOfDay(task.scheduledDate);
      return taskDate > today;
    }),
    
    // Выполненные: только те, что выполнены именно в этот день
    completed: tasks.filter(task => {
      if (task.status !== 'COMPLETED') return false;
      if (!task.completedAt) return false;
      const completedDate = startOfDay(task.completedAt);
      return completedDate.getTime() === today.getTime();
    })
  };

  console.log('🔍 STATUS: Результат группировки:', {
    overdue: result.overdue.length,
    today: result.today.length,
    upcoming: result.upcoming.length,
    completed: result.completed.length
  });

  return result;
}

// Группировка задач по менеджерам
export function groupTasksByManager(tasks: UnifiedTask[]): ManagerTaskGroup[] {
  console.log('🔍 GROUP: Группировка задач по менеджерам:', {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'COMPLETED').length
  });

  const managerMap = new Map<string, ManagerTaskGroup>();
  
  tasks.forEach((task, index) => {
    // Логируем только завершенные задачи для отладки
    if (task.status === 'COMPLETED') {
      console.log(`🔍 GROUP: ЗАВЕРШЕННАЯ задача ${index + 1}:`, {
        id: task.id,
        status: task.status,
        objectName: task.objectName,
        hasObject: !!task.object,
        hasManager: !!task.object?.manager,
        managerId: task.object?.manager?.id,
        managerName: task.object?.manager?.name,
        completedAt: task.completedAt
      });
    }

    const managerId = task.object?.manager?.id || 'unassigned';
    const managerName = task.object?.manager?.name || 'Не назначен';
    const managerPhone = task.object?.manager?.phone || undefined;
    
    if (!managerMap.has(managerId)) {
      managerMap.set(managerId, {
        manager: { 
          id: managerId, 
          name: managerName, 
          phone: managerPhone 
        },
        tasks: [],
        stats: { total: 0, completed: 0, overdue: 0, today: 0, pending: 0 },
        objects: [],
        byPeriodicity: []
      });
    }
    
    const group = managerMap.get(managerId)!;
    group.tasks.push(task);
    group.stats.total++;
    
    // Обновляем статистику
    switch (task.status) {
      case 'OVERDUE':
        group.stats.overdue++;
        break;
      case 'AVAILABLE':
        group.stats.today++;
        break;
      case 'COMPLETED':
        group.stats.completed++;
        break;
      case 'PENDING':
        group.stats.pending++;
        break;
    }
    
    // Добавляем объект в список (если еще нет)
    const objectExists = group.objects.find(obj => obj.id === task.objectId);
    if (!objectExists) {
      group.objects.push({
        id: task.objectId,
        name: task.objectName
      });
    }
    
    // Добавляем периодичность - для материализованных задач ищем по techCardId
    let periodicityKey = task.frequency;
    
    // Для материализованных задач пытаемся найти группу по techCardId
    if (task.type === 'MATERIALIZED' && task.techCardId && task.techCardId !== 'unknown') {
      // Ищем существующую группу с тем же techCardId
      const existingGroup = group.byPeriodicity.find(p => 
        p.tasks.some(t => t.techCardId === task.techCardId)
      );
      
      if (existingGroup) {
        periodicityKey = existingGroup.frequency;
        console.log('🔍 GROUP: Найдена существующая группа для материализованной задачи:', {
          taskId: task.id,
          techCardId: task.techCardId,
          oldFrequency: task.frequency,
          newFrequency: periodicityKey
        });
      } else {
        // Если не нашли группу по techCardId, оставляем frequency как есть
        // НЕ ищем по описанию - это приводит к случайным совпадениям!
        console.log('🔍 GROUP: Не найдена группа для материализованной задачи:', {
          taskId: task.id,
          techCardId: task.techCardId,
          frequency: task.frequency,
          description: task.description
        });
      }
    }
    
    const periodicityExists = group.byPeriodicity.find(p => p.frequency === periodicityKey);
    if (!periodicityExists) {
      group.byPeriodicity.push({
        frequency: periodicityKey,
        count: 1,
        tasks: [task]
      });
    } else {
      periodicityExists.count++;
      periodicityExists.tasks.push(task);
    }
  });
  
  return Array.from(managerMap.values());
}

// Группировка задач по объектам
export function groupTasksByObject(tasks: UnifiedTask[]): ObjectTaskGroup[] {
  const objectMap = new Map<string, ObjectTaskGroup>();
  
  tasks.forEach(task => {
    if (!objectMap.has(task.objectId)) {
      objectMap.set(task.objectId, {
        object: {
          id: task.objectId,
          name: task.objectName
        },
        manager: task.manager || null,
        tasks: [],
        stats: { total: 0, completed: 0, overdue: 0, today: 0, pending: 0 },
        byPeriodicity: []
      });
    }
    
    const group = objectMap.get(task.objectId)!;
    group.tasks.push(task);
    group.stats.total++;
    
    // Обновляем статистику
    switch (task.status) {
      case 'OVERDUE':
        group.stats.overdue++;
        break;
      case 'AVAILABLE':
        group.stats.today++;
        break;
      case 'COMPLETED':
        group.stats.completed++;
        break;
      case 'PENDING':
        group.stats.pending++;
        break;
    }
  });
  
  // Группируем задачи по периодичности внутри каждого объекта
  objectMap.forEach((objectGroup) => {
    const periodicityMap = new Map<string, PeriodicityGroup>();
    
    objectGroup.tasks.forEach(task => {
      const frequency = task.frequency || 'Без периодичности';
      
      if (!periodicityMap.has(frequency)) {
        periodicityMap.set(frequency, {
          frequency,
          tasks: [],
          stats: { total: 0, completed: 0, overdue: 0, today: 0, pending: 0 }
        });
      }
      
      const periodGroup = periodicityMap.get(frequency)!;
      periodGroup.tasks.push(task);
      periodGroup.stats.total++;
      
      switch (task.status) {
        case 'OVERDUE':
          periodGroup.stats.overdue++;
          break;
        case 'AVAILABLE':
          periodGroup.stats.today++;
          break;
        case 'COMPLETED':
          periodGroup.stats.completed++;
          break;
        case 'PENDING':
          periodGroup.stats.pending++;
          break;
      }
    });
    
    objectGroup.byPeriodicity = Array.from(periodicityMap.values());
  });
  
  return Array.from(objectMap.values()).sort((a, b) => a.object.name.localeCompare(b.object.name));
}

// Материализация виртуальной задачи
export async function materializeVirtualTask(
  taskId: string,
  userId: string,
  status: string,
  comment?: string,
  photos?: string[]
): Promise<UnifiedTask> {
  console.log('🔧 MATERIALIZE: Начинаем материализацию задачи:', {
    taskId,
    userId,
    status,
    comment: comment?.length || 0,
    photos: photos?.length || 0
  });
  
  console.log('🔧 MATERIALIZE: Парсинг ID задачи:', {
    fullId: taskId,
    parts: taskId.split('-'),
    partsCount: taskId.split('-').length
  });

  // Парсим ID виртуальной задачи (формат: techCardId-date)
  const parts = taskId.split('-');
  if (parts.length < 4) {
    throw new Error(`Неверный формат ID задачи: ${taskId}`);
  }
  
  const dateStr = parts.slice(-3).join('-'); // последние 3 части - дата
  const techCardId = parts.slice(0, -3).join('-'); // все остальное - ID техкарты
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Неверная дата в ID задачи: ${dateStr}`);
  }
  
  // Получаем техкарту
  const techCard = await prisma.techCard.findUnique({
    where: { id: techCardId },
    include: {
      object: {
        include: {
          manager: true
        }
      },
      room: true
    }
  });
  
  if (!techCard) {
    throw new Error(`Техкарта не найдена: ${techCardId}`);
  }

  console.log('🔧 MATERIALIZE: Найдена техкарта:', {
    techCardId: techCard.id,
    name: techCard.name,
    frequency: techCard.frequency,
    objectName: techCard.object.name,
    roomName: techCard.room?.name
  });
  
  // Создаем материализованную задачу
  const completedAt = status === 'COMPLETED' ? new Date() : null;
  
  const materializedTask = await prisma.task.create({
    data: {
      id: taskId, // ID содержит techCardId в формате: techCardId-YYYY-MM-DD
      description: techCard.name,
      status,
      objectName: techCard.object.name,
      roomName: techCard.room?.name || undefined,
      scheduledStart: date,
      scheduledEnd: new Date(date.getTime() + 8 * 60 * 60 * 1000), // +8 часов
      completedAt,
      completedById: completedAt ? userId : null,
      completionComment: comment || null,
      completionPhotos: photos || [],
      failureReason: techCard.frequency // ВРЕМЕННО: используем failureReason для хранения frequency
      // НЕ устанавливаем checklistId - это внешний ключ на Checklist, а не TechCard
      // techCardId извлекается из id задачи при загрузке
    },
    include: {
      completedBy: { select: { id: true, name: true } }
    }
  });

  console.log('🔧 MATERIALIZE: Задача создана в БД:', {
    id: materializedTask.id,
    checklistId: materializedTask.checklistId,
    techCardId: techCardId,
    frequency: materializedTask.failureReason,
    status: materializedTask.status,
    completedAt: materializedTask.completedAt,
    objectName: materializedTask.objectName
  });
  
  // Возвращаем в едином формате
  return {
    id: materializedTask.id,
    type: 'MATERIALIZED',
    techCardId,
    description: materializedTask.description,
    scheduledDate: materializedTask.scheduledStart || date,
    status: materializedTask.status as 'PENDING' | 'AVAILABLE' | 'OVERDUE' | 'COMPLETED' | 'IN_PROGRESS',
    
    objectId: techCard.objectId,
    objectName: techCard.object.name,
    roomId: techCard.roomId || undefined,
    roomName: techCard.room?.name || undefined,
    
    techCard: {
      id: techCard.id,
      name: techCard.name,
      description: techCard.description || undefined,
      frequency: techCard.frequency || 'ежедневно',
      workType: techCard.workType || undefined
    },
    
    object: {
      id: techCard.object.id,
      name: techCard.object.name,
      manager: techCard.object.manager ? {
        id: techCard.object.manager.id,
        name: techCard.object.manager.name || 'Неизвестный менеджер',
        phone: techCard.object.manager.phone || undefined
      } : undefined
    },
    
    completedAt: materializedTask.completedAt || undefined,
    completedBy: materializedTask.completedBy || undefined,
    completionComment: materializedTask.completionComment || undefined,
    completionPhotos: materializedTask.completionPhotos || [],
    
    frequency: techCard.frequency || 'ежедневно',
    frequencyDays: parseFrequencyDays(techCard.frequency || 'ежедневно')
  };
}
