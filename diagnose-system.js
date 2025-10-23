const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnoseSystem() {
  try {
    console.log('🔍 ДОСКОННАЯ ДИАГНОСТИКА СИСТЕМЫ...\n');

    // 1. Проверяем состояние задач
    console.log('📋 АНАЛИЗ ЗАДАЧ:');
    const taskStats = await prisma.task.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    console.log('Статистика по статусам:');
    taskStats.forEach(stat => {
      console.log(`- ${stat.status}: ${stat._count.status} задач`);
    });

    // 2. Проверяем выполненные задачи детально
    const completedTasks = await prisma.task.findMany({
      where: { 
        OR: [
          { status: 'COMPLETED' },
          { completedAt: { not: null } },
          { completionComment: { not: null } }
        ]
      },
      select: {
        id: true,
        status: true,
        description: true,
        completedAt: true,
        completionComment: true,
        objectName: true,
        roomName: true,
        checklistId: true
      }
    });

    console.log(`\n✅ ВЫПОЛНЕННЫЕ ЗАДАЧИ (${completedTasks.length}):`);
    completedTasks.forEach(task => {
      console.log(`- ${task.id}: ${task.description} (${task.status})`);
      console.log(`  Объект: ${task.objectName}, Помещение: ${task.roomName}`);
      console.log(`  Завершена: ${task.completedAt ? task.completedAt.toISOString() : 'НЕТ'}`);
      console.log(`  Комментарий: ${task.completionComment || 'НЕТ'}`);
      console.log(`  Чек-лист: ${task.checklistId || 'НЕТ'}`);
      console.log('');
    });

    // 3. Проверяем техкарты
    console.log('📝 АНАЛИЗ ТЕХКАРТ:');
    const techCardCount = await prisma.techCard.count();
    console.log(`Всего техкарт: ${techCardCount}`);

    // Берем несколько техкарт для тестирования виртуальных задач
    const sampleTechCards = await prisma.techCard.findMany({
      take: 5,
      include: {
        object: { select: { name: true, managerId: true } },
        room: { select: { name: true } }
      }
    });

    console.log('\nПример техкарт для виртуальных задач:');
    const today = new Date().toISOString().split('T')[0];
    
    sampleTechCards.forEach(tc => {
      const virtualId = `${tc.id}-${today}`;
      console.log(`- Виртуальная задача: ${virtualId}`);
      console.log(`  Техкарта: ${tc.name}`);
      console.log(`  Объект: ${tc.object?.name || 'НЕТ'}`);
      console.log(`  Помещение: ${tc.room?.name || 'НЕТ'}`);
      console.log(`  Менеджер: ${tc.object?.managerId || 'НЕТ'}`);
      console.log('');
    });

    // 4. Проверяем API комментариев админа
    console.log('💬 АНАЛИЗ КОММЕНТАРИЕВ АДМИНА:');
    const adminComments = await prisma.taskAdminComment.findMany({
      include: {
        task: { select: { id: true, description: true } },
        admin: { select: { name: true } }
      }
    });

    console.log(`Всего комментариев админа: ${adminComments.length}`);
    if (adminComments.length > 0) {
      adminComments.forEach(comment => {
        console.log(`- ${comment.task?.description}: ${comment.content}`);
        console.log(`  Админ: ${comment.admin?.name}, Тип: ${comment.type}`);
      });
    }

    // 5. Проверяем менеджеров
    console.log('\n👥 АНАЛИЗ МЕНЕДЖЕРОВ:');
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: { id: true, name: true, email: true }
    });

    console.log(`Всего менеджеров: ${managers.length}`);
    managers.slice(0, 3).forEach(manager => {
      console.log(`- ${manager.name} (${manager.id})`);
    });

    // 6. Тестируем виртуальную логику
    console.log('\n🧪 ТЕСТ ВИРТУАЛЬНОЙ ЛОГИКИ:');
    if (sampleTechCards.length > 0) {
      const testTechCard = sampleTechCards[0];
      const testVirtualId = `${testTechCard.id}-${today}`;
      
      console.log(`Тестовая виртуальная задача: ${testVirtualId}`);
      
      // Проверяем существует ли реальная задача
      const realTask = await prisma.task.findUnique({
        where: { id: testVirtualId }
      });
      
      console.log(`Реальная задача существует: ${realTask ? 'ДА' : 'НЕТ'}`);
      
      if (realTask) {
        console.log(`- Статус: ${realTask.status}`);
        console.log(`- Описание: ${realTask.description}`);
        console.log(`- Объект: ${realTask.objectName}`);
      }
    }

    // 7. Проверяем чек-листы
    console.log('\n📋 АНАЛИЗ ЧЕК-ЛИСТОВ:');
    const checklistCount = await prisma.checklist.count();
    const recentChecklists = await prisma.checklist.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        object: { select: { name: true } },
        tasks: { select: { id: true, status: true } }
      }
    });

    console.log(`Всего чек-листов: ${checklistCount}`);
    recentChecklists.forEach(checklist => {
      console.log(`- ${checklist.object?.name}: ${checklist.tasks.length} задач`);
      console.log(`  Дата: ${checklist.date.toISOString().split('T')[0]}`);
    });

    console.log('\n🎯 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:');
    console.log('1. Проверить API /api/tasks/[id]/complete на поддержку виртуальных задач');
    console.log('2. Проверить API /api/tasks/[id]/admin-comments на материализацию');
    console.log('3. Убедиться что фронтенд передает правильные ID задач');
    console.log('4. Проверить логику генерации виртуальных ID');
    console.log('5. Протестировать материализацию в реальном времени');

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseSystem();
