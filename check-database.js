const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 АНАЛИЗ ТЕКУЩЕЙ СТРУКТУРЫ...\n');

    // Техкарты
    const techCards = await prisma.techCard.count();
    const techCardSample = await prisma.techCard.findFirst({
      include: {
        object: { select: { name: true } },
        room: { select: { name: true } }
      }
    });
    
    console.log('📋 ТЕХКАРТЫ:');
    console.log('Всего техкарт:', techCards);
    if (techCardSample) {
      console.log('Пример техкарты:', {
        id: techCardSample.id,
        name: techCardSample.name,
        object: techCardSample.object?.name,
        room: techCardSample.room?.name,
        frequency: techCardSample.frequency
      });
    }
    
    // Задачи
    const tasks = await prisma.task.count();
    const completedTasks = await prisma.task.count({ where: { status: 'COMPLETED' } });
    const availableTasks = await prisma.task.count({ where: { status: 'AVAILABLE' } });
    
    console.log('\n📝 ЗАДАЧИ:');
    console.log('Всего задач:', tasks);
    console.log('Выполненных:', completedTasks);
    console.log('Доступных:', availableTasks);
    
    // Чек-листы
    const checklists = await prisma.checklist.count();
    console.log('\n📊 ЧЕК-ЛИСТЫ:', checklists);
    
    // Комментарии админов
    const adminComments = await prisma.taskAdminComment.count();
    console.log('\n💬 КОММЕНТАРИИ АДМИНОВ:', adminComments);
    
    // Даты задач
    const taskDates = await prisma.task.groupBy({
      by: ['scheduledStart'],
      _count: { id: true },
      orderBy: { scheduledStart: 'desc' },
      take: 5
    });
    
    console.log('\n📅 ПОСЛЕДНИЕ ДАТЫ ЗАДАЧ:');
    taskDates.forEach(group => {
      const date = new Date(group.scheduledStart).toLocaleDateString('ru-RU');
      console.log(`${date}: ${group._count.id} задач`);
    });

    // Проверяем связи
    const tasksWithTechCards = await prisma.task.count({
      where: { 
        AND: [
          { objectName: { not: null } },
          { roomName: { not: null } }
        ]
      }
    });
    
    console.log('\n🔗 СВЯЗИ:');
    console.log('Задач с данными объектов/помещений:', tasksWithTechCards);
    
    console.log('\n✅ Анализ завершен');

  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
