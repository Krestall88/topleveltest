const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTasksData() {
  try {
    console.log('🔍 Проверяем данные задач...\n');

    // Получаем несколько задач с полными данными
    const tasks = await prisma.task.findMany({
      take: 5,
      include: {
        checklist: {
          include: {
            object: {
              select: {
                id: true,
                name: true,
                address: true
              }
            },
            room: {
              select: {
                id: true,
                name: true,
                area: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Найдено задач: ${tasks.length}\n`);

    tasks.forEach((task, index) => {
      console.log(`--- Задача ${index + 1} ---`);
      console.log(`ID: ${task.id}`);
      console.log(`Описание: ${task.description || 'НЕТ'}`);
      console.log(`objectName: ${task.objectName || 'НЕТ'}`);
      console.log(`roomName: ${task.roomName || 'НЕТ'}`);
      console.log(`checklistId: ${task.checklistId || 'НЕТ'}`);
      
      if (task.checklist) {
        console.log(`Чек-лист найден:`);
        console.log(`  - Объект: ${task.checklist.object?.name || 'НЕТ'}`);
        console.log(`  - Адрес: ${task.checklist.object?.address || 'НЕТ'}`);
        console.log(`  - Помещение: ${task.checklist.room?.name || 'НЕТ'}`);
        console.log(`  - Площадь: ${task.checklist.room?.area || 'НЕТ'}`);
      } else {
        console.log(`Чек-лист: НЕТ`);
      }
      console.log('');
    });

    // Проверяем общую статистику
    const totalTasks = await prisma.task.count();
    const tasksWithChecklist = await prisma.task.count({
      where: {
        checklistId: {
          not: null
        }
      }
    });
    const tasksWithObjectName = await prisma.task.count({
      where: {
        objectName: {
          not: null
        }
      }
    });

    console.log('📈 СТАТИСТИКА:');
    console.log(`Всего задач: ${totalTasks}`);
    console.log(`С чек-листом: ${tasksWithChecklist}`);
    console.log(`С objectName: ${tasksWithObjectName}`);
    console.log(`Без связей: ${totalTasks - tasksWithChecklist - tasksWithObjectName}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTasksData();
