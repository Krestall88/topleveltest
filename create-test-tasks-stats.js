const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestTasks() {
  try {
    console.log('🔍 Создаем тестовые задачи для статистики...');

    // Получаем первый чек-лист
    const checklist = await prisma.checklist.findFirst();
    
    if (!checklist) {
      console.log('❌ Не найден чек-лист для создания задач');
      return;
    }

    console.log('📝 Найден чек-лист:', checklist.id);

    // Создаем тестовые задачи с разными статусами
    const testTasks = [
      {
        description: 'Тестовая задача - выполнена',
        status: 'COMPLETED',
        checklistId: checklist.id,
        completedAt: new Date(),
        completedById: checklist.createdById
      },
      {
        description: 'Тестовая задача - в работе',
        status: 'IN_PROGRESS',
        checklistId: checklist.id
      },
      {
        description: 'Тестовая задача - просрочена',
        status: 'OVERDUE',
        checklistId: checklist.id
      },
      {
        description: 'Тестовая задача - новая',
        status: 'NEW',
        checklistId: checklist.id
      },
      {
        description: 'Тестовая задача - доступна',
        status: 'AVAILABLE',
        checklistId: checklist.id
      }
    ];

    for (const task of testTasks) {
      const created = await prisma.task.create({
        data: task
      });
      console.log(`✅ Создана задача: ${created.id} - ${created.status}`);
    }

    console.log('🎉 Тестовые задачи созданы!');

    // Проверяем статистику
    const stats = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.task.count({ where: { status: { in: ['NEW', 'AVAILABLE', 'IN_PROGRESS'] } } }),
      prisma.task.count({ where: { status: 'OVERDUE' } })
    ]);

    console.log('📊 Статистика задач:');
    console.log(`   Всего: ${stats[0]}`);
    console.log(`   Выполнено: ${stats[1]}`);
    console.log(`   Активные: ${stats[2]}`);
    console.log(`   Просрочено: ${stats[3]}`);

  } catch (error) {
    console.error('❌ Ошибка создания тестовых задач:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestTasks();
