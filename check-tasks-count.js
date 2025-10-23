const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTasksCount() {
  try {
    console.log('🔍 Проверяем количество задач в разных таблицах...\n');

    // Проверяем TaskExecution
    const taskExecutionCount = await prisma.taskExecution.count();
    console.log(`📊 TaskExecution: ${taskExecutionCount} задач`);

    // Проверяем Task
    const taskCount = await prisma.task.count();
    console.log(`📊 Task (старые): ${taskCount} задач`);

    // Проверяем TechCard
    const techCardCount = await prisma.techCard.count();
    console.log(`📊 TechCard: ${techCardCount} техкарт`);

    // Проверяем Objects
    const objectCount = await prisma.cleaningObject.count();
    console.log(`📊 CleaningObject: ${objectCount} объектов`);

    if (taskExecutionCount > 0) {
      console.log('\n🔍 Пример TaskExecution:');
      const sample = await prisma.taskExecution.findFirst({
        include: {
          techCard: true,
          object: true
        }
      });
      console.log({
        id: sample?.id,
        techCardName: sample?.techCard?.name,
        objectName: sample?.object?.name,
        status: sample?.status
      });
    }

    if (taskCount > 0) {
      console.log('\n🔍 Пример Task:');
      const sample = await prisma.task.findFirst({
        include: {
          checklist: {
            include: {
              object: true
            }
          }
        }
      });
      console.log({
        id: sample?.id,
        description: sample?.description,
        objectName: sample?.objectName,
        checklistObjectName: sample?.checklist?.object?.name
      });
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTasksCount();
