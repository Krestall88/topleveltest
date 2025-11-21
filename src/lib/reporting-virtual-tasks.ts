// Утилиты для работы с виртуальными задачами отчетности
import { prisma } from '@/lib/prisma';

export interface VirtualReportingTask {
  id: string; // parentTaskId-date или realTaskId
  parentTaskId?: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: Date;
  dueDate: Date | null;
  completedAt: Date | null;
  objectId: string;
  createdById: string;
  assignedToId: string;
  isRecurring: boolean;
  frequency: string | null;
  weekDay: number | null;
  stoppedAt: Date | null;
  isVirtual: boolean;
  scheduledDate: Date; // Дата для которой создана виртуальная задача
  createdBy: {
    name: string;
  };
  assignedTo: {
    name: string;
  };
  _count: {
    comments: number;
    attachments: number;
  };
}

// Определяет нужно ли создать виртуальную задачу на конкретную дату
function shouldCreateTaskForDate(
  parentTask: any,
  date: Date,
  createdAt: Date
): boolean {
  // Не создаем задачи до даты создания родительской
  if (date < createdAt) {
    return false;
  }

  // Если задача остановлена, не создаем после даты остановки
  if (parentTask.stoppedAt && date >= new Date(parentTask.stoppedAt)) {
    return false;
  }

  const frequency = parentTask.frequency;
  
  if (frequency === 'DAILY') {
    return true; // Каждый день
  } else if (frequency === 'WEEKLY') {
    const dayOfWeek = date.getDay(); // 0=Воскресенье, 1=Понедельник, и т.д.
    const targetDay = parentTask.weekDay;
    
    // Отладочный лог для первых нескольких проверок
    if (Math.random() < 0.01) { // Логируем ~1% проверок чтобы не спамить
      console.log('🔍 Проверка дня недели:', {
        date: date.toISOString().split('T')[0],
        dayOfWeek,
        targetDay,
        match: dayOfWeek === targetDay
      });
    }
    
    return dayOfWeek === targetDay; // Указанный день недели
  }
  
  return false;
}

// Генерирует виртуальные задачи на основе родительских повторяющихся задач
export async function generateVirtualReportingTasks(
  objectId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<VirtualReportingTask[]> {
  // По умолчанию показываем задачи за последние 30 дней и будущие 90 дней
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  defaultFrom.setHours(0, 0, 0, 0);
  
  const defaultTo = new Date();
  defaultTo.setDate(defaultTo.getDate() + 90); // Увеличили до 90 дней вперед
  defaultTo.setHours(23, 59, 59, 999);

  const from = dateFrom || defaultFrom;
  const to = dateTo || defaultTo;

  // Получаем родительские повторяющиеся задачи для этого объекта
  const parentTasks = await prisma.reportingTask.findMany({
    where: {
      objectId,
      isRecurring: true,
      parentTaskId: null // Только родительские задачи
    },
    include: {
      createdBy: {
        select: {
          name: true
        }
      },
      assignedTo: {
        select: {
          name: true
        }
      }
    }
  });

  const virtualTasks: VirtualReportingTask[] = [];

  // Для каждой родительской задачи генерируем виртуальные на каждый день
  for (const parentTask of parentTasks) {
    const currentDate = new Date(from);
    const parentCreatedAt = new Date(parentTask.createdAt);
    parentCreatedAt.setHours(0, 0, 0, 0);

    while (currentDate <= to) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Проверяем нужно ли создать задачу на эту дату
      if (shouldCreateTaskForDate(parentTask, currentDate, parentCreatedAt)) {
        const virtualTaskId = `${parentTask.id}-${dateStr}`;
        
        // Логируем для отладки (только первые 3 задачи каждого родителя)
        if (virtualTasks.filter(t => t.parentTaskId === parentTask.id).length < 3) {
          console.log('🔄 Виртуальная задача:', {
            title: parentTask.title,
            frequency: parentTask.frequency,
            weekDay: parentTask.weekDay,
            date: dateStr,
            dayOfWeek: currentDate.getDay()
          });
        }
        
        virtualTasks.push({
          id: virtualTaskId,
          parentTaskId: parentTask.id,
          title: parentTask.title,
          description: parentTask.description,
          status: 'NEW', // Виртуальные задачи всегда NEW
          priority: parentTask.priority,
          createdAt: new Date(currentDate), // Дата создания = дата для которой создана
          dueDate: null,
          completedAt: null,
          objectId: parentTask.objectId,
          createdById: parentTask.createdById,
          assignedToId: parentTask.assignedToId,
          isRecurring: false, // Виртуальные задачи не повторяются
          frequency: null,
          weekDay: null,
          stoppedAt: null,
          isVirtual: true,
          scheduledDate: new Date(currentDate),
          createdBy: parentTask.createdBy,
          assignedTo: parentTask.assignedTo,
          _count: {
            comments: 0,
            attachments: 0
          }
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return virtualTasks;
}

// Получает все задачи (реальные + виртуальные) для объекта
export async function getReportingTasksWithVirtual(
  objectId: string,
  dateFrom?: Date,
  dateTo?: Date
) {
  // Получаем реальные задачи
  const realTasks = await prisma.reportingTask.findMany({
    where: {
      objectId,
      parentTaskId: { not: null } // Только дочерние задачи (материализованные)
    },
    include: {
      createdBy: {
        select: {
          name: true
        }
      },
      assignedTo: {
        select: {
          name: true
        }
      },
      _count: {
        select: {
          comments: true,
          attachments: true
        }
      }
    }
  });

  // Получаем родительские задачи (шаблоны)
  const parentTasks = await prisma.reportingTask.findMany({
    where: {
      objectId,
      isRecurring: true,
      parentTaskId: null
    },
    include: {
      createdBy: {
        select: {
          name: true
        }
      },
      assignedTo: {
        select: {
          name: true
        }
      },
      _count: {
        select: {
          comments: true,
          attachments: true
        }
      }
    }
  });

  // Получаем обычные задачи (не повторяющиеся)
  const regularTasks = await prisma.reportingTask.findMany({
    where: {
      objectId,
      isRecurring: false,
      parentTaskId: null
    },
    include: {
      createdBy: {
        select: {
          name: true
        }
      },
      assignedTo: {
        select: {
          name: true
        }
      },
      _count: {
        select: {
          comments: true,
          attachments: true
        }
      }
    }
  });

  // Генерируем виртуальные задачи
  const virtualTasks = await generateVirtualReportingTasks(objectId, dateFrom, dateTo);

  // Создаем карту реальных задач по виртуальному ID
  const realTasksMap = new Map();
  realTasks.forEach(task => {
    if (task.parentTaskId && task.createdAt) {
      const dateStr = task.createdAt.toISOString().split('T')[0];
      const virtualId = `${task.parentTaskId}-${dateStr}`;
      realTasksMap.set(virtualId, task);
    }
  });

  // Заменяем виртуальные задачи на реальные где они существуют
  const mergedTasks = virtualTasks.map(vTask => {
    const realTask = realTasksMap.get(vTask.id);
    if (realTask) {
      return {
        ...realTask,
        isVirtual: false,
        scheduledDate: vTask.scheduledDate,
        parentTaskId: vTask.parentTaskId
      };
    }
    return vTask;
  });

  // Добавляем родительские задачи (шаблоны) и обычные задачи
  const allTasks = [
    ...mergedTasks,
    ...parentTasks.map(t => ({ ...t, isVirtual: false, scheduledDate: t.createdAt })),
    ...regularTasks.map(t => ({ ...t, isVirtual: false, scheduledDate: t.createdAt }))
  ];

  return allTasks;
}

// Материализует виртуальную задачу (создает реальную запись в БД)
export async function materializeVirtualTask(
  virtualTaskId: string,
  updateData: any
) {
  // Парсим виртуальный ID: parentTaskId-date
  const [parentTaskId, dateStr] = virtualTaskId.split('-').slice(0, 2);
  
  if (!parentTaskId || !dateStr) {
    throw new Error('Invalid virtual task ID');
  }

  // Проверяем не материализована ли уже
  const existingTask = await prisma.reportingTask.findFirst({
    where: {
      parentTaskId,
      createdAt: {
        gte: new Date(dateStr + 'T00:00:00'),
        lt: new Date(dateStr + 'T23:59:59')
      }
    }
  });

  if (existingTask) {
    // Обновляем существующую
    return await prisma.reportingTask.update({
      where: { id: existingTask.id },
      data: updateData
    });
  }

  // Получаем родительскую задачу
  const parentTask = await prisma.reportingTask.findUnique({
    where: { id: parentTaskId }
  });

  if (!parentTask) {
    throw new Error('Parent task not found');
  }

  // Создаем новую материализованную задачу
  return await prisma.reportingTask.create({
    data: {
      title: parentTask.title,
      description: parentTask.description,
      priority: parentTask.priority,
      objectId: parentTask.objectId,
      createdById: parentTask.createdById,
      assignedToId: parentTask.assignedToId,
      parentTaskId: parentTask.id,
      isRecurring: false,
      frequency: null,
      weekDay: null,
      createdAt: new Date(dateStr),
      ...updateData
    }
  });
}
