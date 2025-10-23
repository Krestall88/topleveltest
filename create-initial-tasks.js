const { PrismaClient } = require('@prisma/client');
const { addDays, startOfDay } = require('date-fns');

const prisma = new PrismaClient();

async function createInitialTasks() {
  try {
    console.log('🚀 Создание начальных задач для всех техкарт...\n');

    // Получаем все техкарты с объектами и менеджерами
    const techCards = await prisma.techCard.findMany({
      include: {
        object: {
          select: {
            id: true,
            name: true,
            address: true,
            managerId: true
          }
        }
      }
    });

    console.log(`📊 Найдено техкарт: ${techCards.length}`);

    let created = 0;
    const today = new Date();
    
    for (const techCard of techCards) {
      try {
        // Определяем периодичность
        let nextDate = new Date(today);
        
        if (techCard.frequency === 'DAILY') {
          // Ежедневные задачи - создаем на сегодня
          nextDate = startOfDay(today);
        } else if (techCard.frequency === 'WEEKLY') {
          // Еженедельные - создаем на завтра
          nextDate = startOfDay(addDays(today, 1));
        } else if (techCard.frequency === 'MONTHLY') {
          // Ежемесячные - создаем на послезавтра
          nextDate = startOfDay(addDays(today, 2));
        } else {
          // По умолчанию - завтра
          nextDate = startOfDay(addDays(today, 1));
        }

        // Проверяем, есть ли уже задача на эту дату
        const existingTask = await prisma.taskExecution.findFirst({
          where: {
            techCardId: techCard.id,
            objectId: techCard.objectId,
            scheduledFor: {
              gte: startOfDay(nextDate),
              lt: addDays(startOfDay(nextDate), 1)
            }
          }
        });

        if (!existingTask && techCard.object?.managerId) {
          // Создаем новую задачу
          await prisma.taskExecution.create({
            data: {
              techCardId: techCard.id,
              objectId: techCard.objectId,
              managerId: techCard.object.managerId,
              scheduledFor: nextDate,
              dueDate: addDays(nextDate, 1), // Крайний срок - на следующий день
              status: 'PENDING'
            }
          });

          created++;
          
          if (created % 10 === 0) {
            console.log(`✅ Создано задач: ${created}`);
          }
        }
      } catch (error) {
        console.error(`❌ Ошибка создания задачи для техкарты ${techCard.id}:`, error.message);
      }
    }

    console.log(`\n🎉 РЕЗУЛЬТАТ:`);
    console.log(`Всего техкарт: ${techCards.length}`);
    console.log(`Создано новых задач: ${created}`);
    console.log(`Пропущено (уже существуют): ${techCards.length - created}`);

    // Проверяем общее количество задач
    const totalTasks = await prisma.taskExecution.count();
    console.log(`Общее количество задач в системе: ${totalTasks}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createInitialTasks();
