import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentTimeInTimezone } from '@/lib/timezone-utils';

// POST /api/tasks/update-statuses - Автоматическое обновление статусов задач
export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Запуск автоматического обновления статусов задач...');

    // Получаем все активные задачи с временными окнами
    const tasks = await prisma.task.findMany({
      where: {
        status: {
          in: ['NEW', 'AVAILABLE', 'IN_PROGRESS']
        },
        scheduledStart: { not: null },
        scheduledEnd: { not: null }
      },
      include: {
        checklist: {
          include: {
            object: {
              select: { 
                id: true, 
                name: true, 
                timezone: true 
              }
            }
          }
        }
      }
    });

    console.log(`📋 Найдено активных задач для обновления: ${tasks.length}`);

    let updatedCount = 0;
    const statusUpdates = {
      newToAvailable: 0,
      availableToOverdue: 0,
      inProgressToOverdue: 0
    };

    for (const task of tasks) {
      try {
        if (!task.scheduledStart || !task.scheduledEnd || !task.checklist?.object) {
          continue;
        }

        // Получаем текущее время в часовом поясе объекта
        const objectTimezone = task.checklist.object.timezone || 'Europe/Moscow';
        const now = getCurrentTimeInTimezone(objectTimezone);
        
        let newStatus = task.status;
        let shouldUpdate = false;

        // Логика обновления статусов
        if (task.status === 'NEW') {
          // NEW → AVAILABLE (когда наступает время выполнения)
          if (now >= task.scheduledStart && now <= task.scheduledEnd) {
            newStatus = 'AVAILABLE';
            shouldUpdate = true;
            statusUpdates.newToAvailable++;
          }
          // NEW → OVERDUE (если время уже прошло)
          else if (now > task.scheduledEnd) {
            newStatus = 'OVERDUE';
            shouldUpdate = true;
            statusUpdates.newToAvailable++; // Считаем как пропущенную доступную
          }
        }
        else if (task.status === 'AVAILABLE') {
          // AVAILABLE → OVERDUE (когда время истекло)
          if (now > task.scheduledEnd) {
            newStatus = 'OVERDUE';
            shouldUpdate = true;
            statusUpdates.availableToOverdue++;
          }
        }
        else if (task.status === 'IN_PROGRESS') {
          // IN_PROGRESS → OVERDUE (если задача в работе, но время истекло)
          if (now > task.scheduledEnd) {
            newStatus = 'OVERDUE';
            shouldUpdate = true;
            statusUpdates.inProgressToOverdue++;
          }
        }

        // Обновляем статус если нужно
        if (shouldUpdate) {
          await prisma.task.update({
            where: { id: task.id },
            data: { status: newStatus as any }
          });

          console.log(`📝 Обновлен статус задачи "${task.description}": ${task.status} → ${newStatus}`);
          updatedCount++;

          // Логируем изменение статуса
          await prisma.auditLog.create({
            data: {
              action: 'TASK_STATUS_AUTO_UPDATED',
              entityType: 'TASK' as any,
              entityId: task.id,
              details: {
                taskDescription: task.description,
                objectName: task.checklist.object.name,
                oldStatus: task.status,
                newStatus: newStatus,
                scheduledStart: task.scheduledStart,
                scheduledEnd: task.scheduledEnd,
                currentTime: now,
                timezone: objectTimezone,
                autoUpdated: true
              },
              userId: 'system-status-updater'
            }
          });
        }

      } catch (taskError) {
        console.error(`❌ Ошибка обновления задачи ${task.id}:`, taskError);
        continue;
      }
    }

    const result = {
      success: true,
      message: `Обновлено статусов: ${updatedCount}`,
      updatedCount,
      statusUpdates,
      totalTasksChecked: tasks.length,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Автоматическое обновление статусов завершено:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Ошибка автоматического обновления статусов:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Ошибка при обновлении статусов задач',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/tasks/update-statuses - Получить статистику обновлений
export async function GET(req: NextRequest) {
  try {
    // Получаем статистику по статусам задач
    const statusStats = await prisma.task.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    // Получаем задачи с временными окнами
    const tasksWithSchedule = await prisma.task.count({
      where: {
        scheduledStart: { not: null },
        scheduledEnd: { not: null }
      }
    });

    // Получаем просроченные задачи
    const overdueTasks = await prisma.task.count({
      where: {
        status: 'OVERDUE'
      }
    });

    return NextResponse.json({
      statusStats,
      tasksWithSchedule,
      overdueTasks,
      lastCheck: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка получения статистики статусов:', error);
    return NextResponse.json(
      { message: 'Ошибка получения статистики' },
      { status: 500 }
    );
  }
}
