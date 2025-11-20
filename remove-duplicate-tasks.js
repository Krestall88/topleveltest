const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeDuplicates() {
  try {
    console.log('🔍 Поиск и удаление дублированных задач...\n');

    // Получаем все задачи на объектах Юг-сервис
    const tasks = await prisma.task.findMany({
      where: {
        objectName: {
          contains: 'Юг-сервис',
          mode: 'insensitive'
        },
        scheduledStart: {
          gte: new Date('2025-11-01')
        }
      },
      orderBy: [
        { description: 'asc' },
        { scheduledStart: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    console.log(`📊 Найдено задач: ${tasks.length}\n`);

    // Группируем по описанию и дате
    const groups = {};
    tasks.forEach(task => {
      const dateStr = task.scheduledStart?.toISOString().split('T')[0] || 'no-date';
      const key = `${task.description}|${dateStr}|${task.objectName}`;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    });

    // Находим дубли
    const duplicates = Object.entries(groups).filter(([_, tasks]) => tasks.length > 1);

    console.log(`⚠️  Найдено групп с дублями: ${duplicates.length}\n`);

    let totalDeleted = 0;

    for (const [key, tasks] of duplicates) {
      const [desc, date, objName] = key.split('|');
      console.log(`\n📌 "${desc}" на ${date}`);
      console.log(`   Объект: ${objName}`);
      console.log(`   Дублей: ${tasks.length}`);

      // Оставляем самую старую задачу (первую созданную), удаляем остальные
      const toKeep = tasks[0];
      const toDelete = tasks.slice(1);

      console.log(`   ✅ Оставляем: ${toKeep.id} (создана ${toKeep.createdAt.toISOString()})`);
      
      for (const task of toDelete) {
        console.log(`   ❌ Удаляем: ${task.id} (создана ${task.createdAt.toISOString()})`);
        
        // Удаляем задачу
        await prisma.task.delete({
          where: { id: task.id }
        });
        
        totalDeleted++;
      }
    }

    console.log(`\n✅ Удалено дублей: ${totalDeleted}`);
    console.log(`✅ Осталось уникальных задач: ${tasks.length - totalDeleted}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeDuplicates();
