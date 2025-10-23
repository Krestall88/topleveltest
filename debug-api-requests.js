const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugApiRequests() {
  try {
    console.log('🔍 ОТЛАДКА API ЗАПРОСОВ...\n');

    // 1. Проверяем последние комментарии админа
    console.log('💬 ПОСЛЕДНИЕ КОММЕНТАРИИ АДМИНА:');
    const recentComments = await prisma.taskAdminComment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { name: true, role: true } }
      }
    });

    if (recentComments.length === 0) {
      console.log('❌ Комментарии админа не найдены - возможно API не работает');
    } else {
      console.log('✅ Найдено комментариев:', recentComments.length);
      recentComments.forEach(comment => {
        console.log(`- ${comment.createdAt.toISOString()}: ${comment.content.substring(0, 50)}...`);
      });
    }

    // 2. Проверяем последние завершенные задачи
    console.log('\n🏁 ПОСЛЕДНИЕ ЗАВЕРШЕННЫЕ ЗАДАЧИ:');
    const completedTasks = await prisma.task.findMany({
      where: {
        OR: [
          { status: 'COMPLETED' },
          { status: 'CLOSED_WITH_PHOTO' }
        ]
      },
      take: 5,
      orderBy: { completedAt: 'desc' },
      include: {
        completedBy: { select: { name: true } }
      }
    });

    if (completedTasks.length === 0) {
      console.log('❌ Завершенные задачи не найдены - возможно API завершения не работает');
    } else {
      console.log('✅ Найдено завершенных задач:', completedTasks.length);
      completedTasks.forEach(task => {
        console.log(`- ${task.completedAt?.toISOString()}: ${task.description?.substring(0, 50) || 'Без описания'}...`);
      });
    }

    // 3. Проверяем виртуальные задачи
    console.log('\n📋 ПРОВЕРКА ВИРТУАЛЬНЫХ ЗАДАЧ:');
    const sampleTechCard = await prisma.techCard.findFirst({
      include: {
        object: { select: { name: true } },
        room: { select: { name: true } }
      }
    });

    if (sampleTechCard) {
      const virtualTaskId = `${sampleTechCard.id}-2025-10-23`;
      console.log('🔧 Тестовый ID виртуальной задачи:', virtualTaskId);
      
      // Проверяем, есть ли уже материализованная задача
      const existingTask = await prisma.task.findUnique({
        where: { id: virtualTaskId }
      });

      if (existingTask) {
        console.log('✅ Задача уже материализована:', existingTask.status);
      } else {
        console.log('📝 Задача виртуальная, нужна материализация');
      }
    }

    // 4. Проверяем AuditLog для отслеживания действий
    console.log('\n📊 ПОСЛЕДНИЕ ДЕЙСТВИЯ В СИСТЕМЕ:');
    const recentActions = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, role: true } }
      }
    });

    recentActions.forEach(action => {
      console.log(`- ${action.createdAt.toISOString()}: ${action.action} by ${action.user?.name || 'Unknown'}`);
    });

    // 5. Проверяем статистику по статусам задач
    console.log('\n📈 СТАТИСТИКА ЗАДАЧ ПО СТАТУСАМ:');
    const taskStats = await prisma.task.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    taskStats.forEach(stat => {
      console.log(`- ${stat.status}: ${stat._count.status} задач`);
    });

    console.log('\n🎯 РЕКОМЕНДАЦИИ ПО ОТЛАДКЕ:');
    console.log('1. Проверьте Network tab в браузере - доходят ли запросы до сервера');
    console.log('2. Проверьте Console в браузере - есть ли ошибки JavaScript');
    console.log('3. Проверьте логи сервера Next.js - обрабатываются ли запросы');
    console.log('4. Убедитесь что JWT токен валиден и не истек');
    console.log('5. Проверьте что пользователь имеет права ADMIN/DEPUTY для комментариев');

  } catch (error) {
    console.error('❌ Ошибка отладки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugApiRequests();
