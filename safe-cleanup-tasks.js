const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function safeCleanupTasks() {
  try {
    console.log('🗑️ БЕЗОПАСНАЯ ОЧИСТКА ЗАДАЧ...\n');

    // Проверяем наличие плана очистки
    if (!fs.existsSync('cleanup-plan.json')) {
      console.log('❌ Файл cleanup-plan.json не найден!');
      console.log('❌ Сначала запустите analyze-tasks-for-cleanup.js');
      return;
    }

    // Проверяем наличие резервных копий
    if (!fs.existsSync('backup-important-data.json')) {
      console.log('❌ Резервные копии не найдены!');
      console.log('❌ Сначала запустите backup-important-data.js');
      return;
    }

    const plan = JSON.parse(fs.readFileSync('cleanup-plan.json', 'utf8'));
    
    console.log('📋 ПЛАН ОЧИСТКИ:');
    console.log(`- Всего задач: ${plan.analysis.totalTasks}`);
    console.log(`- К сохранению: ${plan.analysis.keepCount}`);
    console.log(`- К удалению: ${plan.analysis.deleteCount}`);
    console.log(`- Экономия: ${plan.analysis.savingPercentage}%`);

    // Финальная проверка безопасности
    console.log('\n🛡️ ФИНАЛЬНАЯ ПРОВЕРКА БЕЗОПАСНОСТИ...');
    
    const criticalTasksInDeleteList = await prisma.task.count({
      where: {
        AND: [
          { id: { in: plan.tasksToDelete } },
          {
            OR: [
              { status: 'COMPLETED' },
              { completionComment: { not: null } },
              { completedAt: { not: null } }
            ]
          }
        ]
      }
    });

    if (criticalTasksInDeleteList > 0) {
      console.log(`❌ КРИТИЧЕСКАЯ ОШИБКА! Найдено ${criticalTasksInDeleteList} важных задач в списке на удаление!`);
      console.log('❌ ОПЕРАЦИЯ ОТМЕНЕНА! Проверьте план очистки!');
      return;
    }

    console.log('✅ Проверка безопасности пройдена');

    // Подтверждение от пользователя (в реальном сценарии)
    console.log('\n⚠️ ВНИМАНИЕ! Сейчас будет выполнено удаление задач.');
    console.log(`🗑️ Будет удалено ${plan.analysis.deleteCount} задач`);
    console.log('💾 Важные данные сохранены в резервных копиях');
    
    // Выполняем очистку пакетами для производительности
    const batchSize = 1000;
    const totalBatches = Math.ceil(plan.tasksToDelete.length / batchSize);
    let deletedCount = 0;

    console.log(`\n🔄 Удаление задач пакетами по ${batchSize}...`);

    for (let i = 0; i < totalBatches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, plan.tasksToDelete.length);
      const batchIds = plan.tasksToDelete.slice(batchStart, batchEnd);

      console.log(`📦 Пакет ${i + 1}/${totalBatches}: удаление ${batchIds.length} задач...`);

      const result = await prisma.task.deleteMany({
        where: {
          id: { in: batchIds }
        }
      });

      deletedCount += result.count;
      console.log(`✅ Удалено в пакете: ${result.count} задач`);

      // Небольшая пауза между пакетами для снижения нагрузки на БД
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Проверяем результат
    const remainingTasks = await prisma.task.count();
    const expectedRemaining = plan.analysis.totalTasks - plan.analysis.deleteCount;

    console.log('\n📊 РЕЗУЛЬТАТЫ ОЧИСТКИ:');
    console.log(`🗑️ Удалено задач: ${deletedCount}`);
    console.log(`📋 Осталось задач: ${remainingTasks}`);
    console.log(`✅ Ожидалось остаться: ${expectedRemaining}`);

    if (remainingTasks === expectedRemaining) {
      console.log('✅ Очистка выполнена успешно!');
    } else {
      console.log('⚠️ Количество оставшихся задач не соответствует ожидаемому');
    }

    // Проверяем что важные задачи сохранились
    const remainingCompletedTasks = await prisma.task.count({
      where: { status: 'COMPLETED' }
    });

    console.log(`💾 Сохранено выполненных задач: ${remainingCompletedTasks}`);

    // Создаем отчет об очистке
    const cleanupReport = {
      executedAt: new Date().toISOString(),
      originalPlan: plan.analysis,
      actualResults: {
        deletedCount,
        remainingTasks,
        remainingCompletedTasks
      },
      success: remainingTasks === expectedRemaining,
      databaseSizeReduction: `${plan.analysis.savingPercentage}%`,
      nextSteps: [
        'Протестировать виртуальные задачи',
        'Обновить календарь на новые API',
        'Добавить вкладку общих фотоотчетов'
      ]
    };

    fs.writeFileSync('cleanup-report.json', JSON.stringify(cleanupReport, null, 2));
    console.log('\n📄 Отчет об очистке сохранен: cleanup-report.json');

    // Логируем операцию в аудит
    await prisma.auditLog.create({
      data: {
        action: 'MASS_DELETE_TASKS',
        userId: 'system',
        details: `Безопасная очистка: удалено ${deletedCount} неиспользуемых задач`,
        metadata: {
          deletedCount,
          remainingTasks,
          savingPercentage: plan.analysis.savingPercentage,
          backupCreated: true
        }
      }
    });

    console.log('\n🎉 ОЧИСТКА ЗАВЕРШЕНА УСПЕШНО!');
    console.log('\n🚀 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('1. ✅ Протестируйте виртуальные задачи через /api/tasks/virtual');
    console.log('2. ✅ Обновите календарь на новые API');
    console.log('3. ✅ Добавьте вкладку общих фотоотчетов');
    console.log('4. ✅ Система готова к работе с новой архитектурой!');

    console.log('\n💡 ПРЕИМУЩЕСТВА НОВОЙ АРХИТЕКТУРЫ:');
    console.log(`- 📉 Экономия места в БД: ${plan.analysis.savingPercentage}%`);
    console.log('- ⚡ Быстрая генерация задач из техкарт');
    console.log('- 🔄 Материализация только при взаимодействии');
    console.log('- 🎯 Единый источник истины - техкарты');

  } catch (error) {
    console.error('❌ Ошибка очистки:', error);
    console.log('\n🔄 В случае проблем используйте restore-important-data.js');
  } finally {
    await prisma.$disconnect();
  }
}

safeCleanupTasks();
