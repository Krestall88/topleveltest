import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetCompletedTasks() {
  try {
    console.log('🔄 Начинаем сброс завершенных задач...');

    // Получаем все завершенные задачи
    const completedTasks = await prisma.task.findMany({
      where: {
        status: 'COMPLETED'
      },
      select: {
        id: true,
        description: true,
        status: true,
        completedAt: true,
        failureReason: true
      }
    });

    console.log(`📊 Найдено завершенных задач: ${completedTasks.length}`);

    if (completedTasks.length === 0) {
      console.log('✅ Нет задач для сброса');
      return;
    }

    // Сбрасываем статус задач
    const result = await prisma.task.updateMany({
      where: {
        status: 'COMPLETED'
      },
      data: {
        status: 'NEW',
        completedAt: null,
        completedById: null,
        completionComment: null,
        completionPhotos: []
      }
    });

    console.log(`✅ Сброшено задач: ${result.count}`);

    // Удаляем фотоотчеты для этих задач
    const photoReportsDeleted = await prisma.photoReport.deleteMany({
      where: {
        taskId: {
          in: completedTasks.map(t => t.id)
        }
      }
    });

    console.log(`🗑️ Удалено фотоотчетов: ${photoReportsDeleted.count}`);

    // Удаляем комментарии к этим задачам
    const commentsDeleted = await prisma.taskAdminComment.deleteMany({
      where: {
        taskId: {
          in: completedTasks.map(t => t.id)
        }
      }
    });

    console.log(`🗑️ Удалено комментариев: ${commentsDeleted.count}`);

    console.log('✅ Сброс завершен успешно!');
    console.log('📝 Все задачи возвращены в статус NEW');
    console.log('📝 Все связанные данные (фото, комментарии) удалены');

  } catch (error) {
    console.error('❌ Ошибка при сбросе задач:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем скрипт
resetCompletedTasks()
  .then(() => {
    console.log('✅ Скрипт выполнен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка выполнения скрипта:', error);
    process.exit(1);
  });
