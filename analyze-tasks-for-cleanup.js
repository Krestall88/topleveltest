const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function analyzeTasksForCleanup() {
  try {
    console.log('🔍 АНАЛИЗ ЗАДАЧ ДЛЯ БЕЗОПАСНОЙ ОЧИСТКИ...\n');

    // Анализируем какие задачи нужно сохранить
    const tasksToKeep = await prisma.task.findMany({
      where: {
        OR: [
          { status: 'COMPLETED' },
          { status: 'IN_PROGRESS' },
          { completionComment: { not: null } },
          { completedAt: { not: null } }
        ]
      },
      select: {
        id: true,
        status: true,
        description: true,
        completionComment: true,
        completionPhotos: true,
        completedAt: true,
        objectName: true,
        roomName: true
      }
    });

    // Подсчитываем комментарии админов
    const adminComments = await prisma.taskAdminComment.findMany({
      select: { taskId: true }
    });
    const tasksWithComments = [...new Set(adminComments.map(c => c.taskId))];

    // Подсчитываем фотоотчеты
    const photoReports = await prisma.photoReport.findMany({
      where: { taskId: { not: null } },
      select: { taskId: true }
    });
    const tasksWithPhotoReports = [...new Set(photoReports.map(p => p.taskId).filter(Boolean))];

    // Объединяем все задачи, которые нужно сохранить
    const allTasksToKeepIds = new Set([
      ...tasksToKeep.map(t => t.id),
      ...tasksWithComments,
      ...tasksWithPhotoReports
    ]);

    // Задачи к удалению (безопасные для удаления)
    const tasksToDelete = await prisma.task.findMany({
      where: {
        AND: [
          { id: { notIn: Array.from(allTasksToKeepIds) } },
          { status: { in: ['NEW', 'AVAILABLE', 'OVERDUE'] } },
          { completionComment: null },
          { completedAt: null }
        ]
      },
      select: {
        id: true,
        status: true,
        description: true,
        objectName: true,
        scheduledStart: true
      }
    });

    // Статистика по статусам задач к сохранению
    const keepStats = {
      COMPLETED: tasksToKeep.filter(t => t.status === 'COMPLETED').length,
      IN_PROGRESS: tasksToKeep.filter(t => t.status === 'IN_PROGRESS').length,
      withComments: tasksWithComments.length,
      withPhotos: tasksWithPhotoReports.length,
      withCompletionData: tasksToKeep.filter(t => t.completionComment || t.completedAt).length
    };

    // Статистика по статусам задач к удалению
    const deleteStats = {
      NEW: tasksToDelete.filter(t => t.status === 'NEW').length,
      AVAILABLE: tasksToDelete.filter(t => t.status === 'AVAILABLE').length,
      OVERDUE: tasksToDelete.filter(t => t.status === 'OVERDUE').length
    };

    const totalTasks = allTasksToKeepIds.size + tasksToDelete.length;
    const savingPercentage = Math.round((tasksToDelete.length / totalTasks) * 100);

    console.log('📊 РЕЗУЛЬТАТЫ АНАЛИЗА:');
    console.log(`📋 Всего задач в системе: ${totalTasks}`);
    console.log(`✅ Задач к сохранению: ${allTasksToKeepIds.size}`);
    console.log(`🗑️ Задач к удалению: ${tasksToDelete.length}`);
    console.log(`💾 Экономия места в БД: ${savingPercentage}%`);

    console.log('\n🔒 ДЕТАЛИЗАЦИЯ ЗАДАЧ К СОХРАНЕНИЮ:');
    console.log(`- Выполненные: ${keepStats.COMPLETED}`);
    console.log(`- В процессе: ${keepStats.IN_PROGRESS}`);
    console.log(`- С комментариями админов: ${keepStats.withComments}`);
    console.log(`- С фотоотчетами: ${keepStats.withPhotos}`);
    console.log(`- С данными о завершении: ${keepStats.withCompletionData}`);

    console.log('\n🗑️ ДЕТАЛИЗАЦИЯ ЗАДАЧ К УДАЛЕНИЮ:');
    console.log(`- Новые (NEW): ${deleteStats.NEW}`);
    console.log(`- Доступные (AVAILABLE): ${deleteStats.AVAILABLE}`);
    console.log(`- Просроченные (OVERDUE): ${deleteStats.OVERDUE}`);

    // Анализ по объектам
    const objectStats = {};
    tasksToDelete.forEach(task => {
      const objName = task.objectName || 'Неизвестный объект';
      objectStats[objName] = (objectStats[objName] || 0) + 1;
    });

    console.log('\n🏢 ТОП-5 ОБЪЕКТОВ ПО КОЛИЧЕСТВУ УДАЛЯЕМЫХ ЗАДАЧ:');
    Object.entries(objectStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([objName, count]) => {
        console.log(`- ${objName}: ${count} задач`);
      });

    // Создаем план очистки
    const cleanupPlan = {
      analysis: {
        totalTasks,
        keepCount: allTasksToKeepIds.size,
        deleteCount: tasksToDelete.length,
        savingPercentage,
        analyzedAt: new Date().toISOString()
      },
      tasksToKeep: Array.from(allTasksToKeepIds),
      tasksToDelete: tasksToDelete.map(t => t.id),
      keepReasons: {
        completed: tasksToKeep.filter(t => t.status === 'COMPLETED').map(t => t.id),
        inProgress: tasksToKeep.filter(t => t.status === 'IN_PROGRESS').map(t => t.id),
        withComments: tasksWithComments.map(t => t.id),
        withPhotos: tasksWithPhotoReports.map(t => t.id)
      },
      deleteStats,
      keepStats,
      objectStats
    };

    // Сохраняем план в файл
    fs.writeFileSync('cleanup-plan.json', JSON.stringify(cleanupPlan, null, 2));
    console.log('\n💾 План очистки сохранен в cleanup-plan.json');

    // Проверяем безопасность плана
    console.log('\n🛡️ ПРОВЕРКА БЕЗОПАСНОСТИ:');
    
    const criticalTasks = await prisma.task.count({
      where: {
        id: { in: tasksToDelete.map(t => t.id) },
        OR: [
          { status: 'COMPLETED' },
          { completionComment: { not: null } },
          { completedAt: { not: null } }
        ]
      }
    });

    if (criticalTasks > 0) {
      console.log(`❌ ОПАСНОСТЬ! Найдено ${criticalTasks} критических задач в списке на удаление!`);
      console.log('❌ ОСТАНОВКА! Проверьте план перед выполнением!');
    } else {
      console.log('✅ Безопасность подтверждена - критические задачи не затронуты');
      console.log('✅ План готов к выполнению');
    }

    console.log('\n🚀 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('1. Проверьте файл cleanup-plan.json');
    console.log('2. Запустите backup-important-data.js для создания резервных копий');
    console.log('3. Протестируйте виртуальные задачи');
    console.log('4. Выполните safe-cleanup-tasks.js');

  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeTasksForCleanup();
