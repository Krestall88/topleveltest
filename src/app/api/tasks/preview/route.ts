import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Функция для парсинга периодичности из строки
function parseFrequencyDays(frequency: string): number {
  const freq = frequency.toLowerCase();
  
  if (freq.includes('ежедневно') || freq.includes('каждый день')) {
    return 1;
  } else if (freq.includes('еженедельно') || freq.includes('раз в неделю')) {
    return 7;
  } else if (freq.includes('ежемесячно') || freq.includes('раз в месяц')) {
    return 30;
  }
  
  return 1; // По умолчанию ежедневно
}

// Простая функция для добавления дней
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Простая функция для начала дня
function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

// Простая функция для конца дня
function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

// Простая функция форматирования даты
function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU');
}

// GET /api/tasks/preview - Предварительный просмотр задач
export async function GET(req: NextRequest) {
  try {
    // Упрощенная версия без аутентификации для тестирования
    const { searchParams } = new URL(req.url);
    const managerId = searchParams.get('managerId');
    const objectId = searchParams.get('objectId');
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const days = parseInt(searchParams.get('days') || '7'); // По умолчанию 7 дней

    // Определяем диапазон дат для предварительного просмотра
    const baseDate = new Date(dateStr);
    const startDate = startOfDay(addDays(baseDate, 1)); // Начинаем с завтра
    const endDate = endOfDay(addDays(baseDate, days));

    // Получаем техкарты с учетом фильтров
    const whereClause: any = {};
    
    if (objectId) {
      whereClause.objectId = objectId;
    }

    const techCards = await prisma.techCard.findMany({
      where: whereClause,
      include: {
        object: {
          select: {
            id: true,
            name: true,
            managerId: true
          }
        }
      }
    });

    // Генерируем предварительный просмотр задач (упрощенная версия)
    const previewTasks: any[] = [];
    const tasksByDate: { [key: string]: any[] } = {};

    for (const techCard of techCards) {
      // Парсим периодичность из строки frequency
      const frequencyDays = parseFrequencyDays(techCard.frequency);
      
      // Рассчитываем следующую дату выполнения (упрощенная версия)
      const scheduledFor = new Date();
      scheduledFor.setHours(9, 0, 0, 0); // По умолчанию 9:00
      
      // Добавляем дни согласно периодичности
      scheduledFor.setDate(scheduledFor.getDate() + 1); // Завтра

      // Генерируем задачи на весь период предварительного просмотра
      let currentDate = new Date(scheduledFor);
      
      while (currentDate <= endDate) {
        // Проверяем, попадает ли задача в период предварительного просмотра
        if (currentDate >= startDate && currentDate <= endDate) {
          const dueDate = new Date(currentDate);
          dueDate.setHours(dueDate.getHours() + 24); // По умолчанию 24 часа

          const task = {
            id: `${techCard.id}-${currentDate.toISOString()}`,
            techCard: {
              id: techCard.id,
              name: techCard.name,
              workType: techCard.workType,
              frequency: techCard.frequency,
              description: techCard.description,
              frequencyDays: frequencyDays
            },
            object: {
              id: techCard.object.id,
              name: techCard.object.name
            },
            scheduledFor: currentDate,
            dueDate,
            status: 'PENDING'
          };

          previewTasks.push(task);

          // Группируем по датам
          const dateKey = currentDate.toISOString().split('T')[0];
          if (!tasksByDate[dateKey]) {
            tasksByDate[dateKey] = [];
          }
          tasksByDate[dateKey].push(task);
        }

        // Переходим к следующей дате выполнения
        currentDate = addDays(currentDate, frequencyDays);
      }
    }

    // Сортируем задачи по дате
    previewTasks.sort((a: any, b: any) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

    // Создаем структуру по дням
    const dailyPreview = Object.keys(tasksByDate)
      .sort()
      .map(dateKey => {
        const date = new Date(dateKey);
        const tasks = tasksByDate[dateKey].sort((a: any, b: any) => 
          a.scheduledFor.getTime() - b.scheduledFor.getTime()
        );

        return {
          date: dateKey,
          dateFormatted: formatDate(date),
          tasksCount: tasks.length,
          tasks: tasks,
          summary: {
            daily: tasks.filter((t: any) => (t.techCard.frequencyDays || 1) === 1).length,
            weekly: tasks.filter((t: any) => (t.techCard.frequencyDays || 1) === 7).length,
            monthly: tasks.filter((t: any) => (t.techCard.frequencyDays || 1) === 30).length,
            other: tasks.filter((t: any) => {
              const freq = t.techCard.frequencyDays || 1;
              return freq !== 1 && freq !== 7 && freq !== 30;
            }).length
          }
        };
      });

    // Общая статистика
    const totalStats = {
      totalTasks: previewTasks.length,
      dailyTasks: previewTasks.filter((t: any) => (t.techCard.frequencyDays || 1) === 1).length,
      weeklyTasks: previewTasks.filter((t: any) => (t.techCard.frequencyDays || 1) === 7).length,
      monthlyTasks: previewTasks.filter((t: any) => (t.techCard.frequencyDays || 1) === 30).length,
      otherTasks: previewTasks.filter((t: any) => {
        const freq = t.techCard.frequencyDays || 1;
        return freq !== 1 && freq !== 7 && freq !== 30;
      }).length,
      objectsCount: new Set(previewTasks.map((t: any) => t.object.id)).size,
      averageTasksPerDay: Math.round(previewTasks.length / days * 10) / 10
    };

    // Топ объектов по количеству задач
    const objectStats = previewTasks.reduce((acc: any, task: any) => {
      const objectId = task.object.id;
      if (!acc[objectId]) {
        acc[objectId] = {
          objectId,
          objectName: task.object.name,
          tasksCount: 0
        };
      }
      acc[objectId].tasksCount++;
      return acc;
    }, {});

    const topObjects = Object.values(objectStats)
      .sort((a: any, b: any) => b.tasksCount - a.tasksCount)
      .slice(0, 5);

    return NextResponse.json({
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        days,
        startDateFormatted: formatDate(startDate),
        endDateFormatted: formatDate(endDate)
      },
      stats: totalStats,
      dailyPreview,
      topObjects,
      allTasks: previewTasks
    });

  } catch (error) {
    console.error('Ошибка получения предварительного просмотра:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
