const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkExistingTasks() {
  try {
    console.log('🔍 Проверяем существующие задачи в системе...\n');

    // Проверяем TaskExecution (новая система)
    const taskExecutions = await prisma.taskExecution.findMany({
      take: 5,
      include: {
        techCard: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        object: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    console.log(`📊 TaskExecution найдено: ${taskExecutions.length}`);
    
    if (taskExecutions.length > 0) {
      console.log('\n--- Примеры TaskExecution ---');
      taskExecutions.forEach((task, index) => {
        console.log(`${index + 1}. ${task.techCard?.name || 'Без названия'}`);
        console.log(`   Объект: ${task.object?.name || 'Неизвестный'}`);
        console.log(`   Статус: ${task.status}`);
        console.log(`   Дата: ${task.scheduledFor}`);
        console.log('');
      });
    }

    // Проверяем старые Task
    const oldTasks = await prisma.task.findMany({
      take: 5,
      include: {
        checklist: {
          include: {
            object: true,
            room: true
          }
        }
      }
    });

    console.log(`📊 Task (старые) найдено: ${oldTasks.length}`);
    
    if (oldTasks.length > 0) {
      console.log('\n--- Примеры Task ---');
      oldTasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.description || 'Без описания'}`);
        console.log(`   Объект: ${task.checklist?.object?.name || task.objectName || 'Неизвестный'}`);
        console.log(`   Помещение: ${task.checklist?.room?.name || task.roomName || 'Неизвестное'}`);
        console.log('');
      });
    }

    // Общая статистика
    const totalTaskExecutions = await prisma.taskExecution.count();
    const totalTasks = await prisma.task.count();
    const totalTechCards = await prisma.techCard.count();
    const totalObjects = await prisma.cleaningObject.count();

    console.log('📈 ОБЩАЯ СТАТИСТИКА:');
    console.log(`TaskExecution: ${totalTaskExecutions}`);
    console.log(`Task (старые): ${totalTasks}`);
    console.log(`TechCard: ${totalTechCards}`);
    console.log(`CleaningObject: ${totalObjects}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingTasks();
