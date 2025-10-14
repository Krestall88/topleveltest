import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/checklists/cleanup - Очистка старых чек-листов
export async function POST(req: NextRequest) {
  try {
    console.log('🧹 Запуск очистки старых чек-листов...');
    
    // Определяем дату 30 дней назад
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Определяем дату 90 дней назад для полного удаления
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    console.log(`📅 Архивация чек-листов старше ${thirtyDaysAgo.toISOString().split('T')[0]}`);
    console.log(`🗑️ Удаление чек-листов старше ${ninetyDaysAgo.toISOString().split('T')[0]}`);

    // 1. Архивируем чек-листы старше 30 дней (меняем статус на ARCHIVED)
    const archivedResult = await prisma.checklist.updateMany({
      where: {
        date: {
          lt: thirtyDaysAgo,
          gte: ninetyDaysAgo
        },
        status: {
          not: 'ARCHIVED'
        }
      },
      data: {
        status: 'ARCHIVED'
      }
    });

    // 2. Полностью удаляем чек-листы старше 90 дней
    // Сначала удаляем связанные задачи
    const deletedTasks = await prisma.task.deleteMany({
      where: {
        checklist: {
          date: {
            lt: ninetyDaysAgo
          }
        }
      }
    });

    // Затем удаляем сами чек-листы
    const deletedChecklists = await prisma.checklist.deleteMany({
      where: {
        date: {
          lt: ninetyDaysAgo
        }
      }
    });

    // 3. Очищаем старые логи аудита (старше 6 месяцев)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const deletedLogs = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: sixMonthsAgo
        }
      }
    });

    // 4. Создаем лог о выполненной очистке
    await prisma.auditLog.create({
      data: {
        action: 'SYSTEM_CLEANUP',
        entityType: 'SYSTEM',
        entityId: 'cleanup-task',
        details: {
          archivedChecklists: archivedResult.count,
          deletedChecklists: deletedChecklists.count,
          deletedTasks: deletedTasks.count,
          deletedLogs: deletedLogs.count,
          cleanupDate: new Date().toISOString(),
          thresholds: {
            archiveAfterDays: 30,
            deleteAfterDays: 90,
            logsRetentionMonths: 6
          }
        },
        userId: null // Системное действие
      }
    });

    const result = {
      message: 'Очистка базы данных завершена',
      archived: archivedResult.count,
      deletedChecklists: deletedChecklists.count,
      deletedTasks: deletedTasks.count,
      deletedLogs: deletedLogs.count,
      cleanupDate: new Date().toISOString()
    };

    console.log('✅ Очистка завершена:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Ошибка при очистке базы данных:', error);
    return NextResponse.json(
      { 
        message: 'Ошибка при очистке базы данных',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/checklists/cleanup - Получить статистику для очистки
export async function GET(req: NextRequest) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Подсчитываем количество записей для очистки
    const [
      checklistsToArchive,
      checklistsToDelete,
      tasksToDelete,
      logsToDelete
    ] = await Promise.all([
      prisma.checklist.count({
        where: {
          date: { lt: thirtyDaysAgo, gte: ninetyDaysAgo },
          status: { not: 'ARCHIVED' }
        }
      }),
      prisma.checklist.count({
        where: { date: { lt: ninetyDaysAgo } }
      }),
      prisma.task.count({
        where: {
          checklist: { date: { lt: ninetyDaysAgo } }
        }
      }),
      prisma.auditLog.count({
        where: { createdAt: { lt: sixMonthsAgo } }
      })
    ]);

    return NextResponse.json({
      thresholds: {
        archiveAfterDays: 30,
        deleteAfterDays: 90,
        logsRetentionMonths: 6
      },
      toCleanup: {
        checklistsToArchive,
        checklistsToDelete,
        tasksToDelete,
        logsToDelete
      },
      dates: {
        archiveThreshold: thirtyDaysAgo.toISOString().split('T')[0],
        deleteThreshold: ninetyDaysAgo.toISOString().split('T')[0],
        logsThreshold: sixMonthsAgo.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Ошибка получения статистики очистки:', error);
    return NextResponse.json(
      { message: 'Ошибка получения статистики' },
      { status: 500 }
    );
  }
}
