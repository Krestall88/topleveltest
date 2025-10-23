const { PrismaClient } = require('@prisma/client');
const { addDays, subDays } = require('date-fns');

const prisma = new PrismaClient();

async function createTestTasks() {
  try {
    console.log('🚀 Создание тестовых задач для календаря...');

    // Получаем первые несколько объектов с техкартами
    const objects = await prisma.cleaningObject.findMany({
      take: 5,
      include: {
        techCards: {
          take: 3 // Берем по 3 техкарты с каждого объекта
        }
      }
    });

    if (objects.length === 0) {
      console.log('❌ Нет объектов для создания задач');
      return;
    }

    let createdCount = 0;
    const now = new Date();

    for (const object of objects) {
      console.log(`📋 Создаем задачи для объекта: ${object.name}`);
      
      for (const techCard of object.techCards) {
        // Создаем задачи на разные даты
        const tasks = [
          // Просроченная задача (вчера)
          {
            techCardId: techCard.id,
            objectId: object.id,
            scheduledFor: subDays(now, 1),
            dueDate: subDays(now, 1),
            status: 'PENDING'
          },
          // Задача на сегодня
          {
            techCardId: techCard.id,
            objectId: object.id,
            scheduledFor: now,
            dueDate: addDays(now, 1),
            status: 'PENDING'
          },
          // Задача на завтра
          {
            techCardId: techCard.id,
            objectId: object.id,
            scheduledFor: addDays(now, 1),
            dueDate: addDays(now, 2),
            status: 'PENDING'
          },
          // Выполненная задача (позавчера)
          {
            techCardId: techCard.id,
            objectId: object.id,
            scheduledFor: subDays(now, 2),
            dueDate: subDays(now, 1),
            status: 'COMPLETED',
            executedAt: subDays(now, 2),
            executedById: object.managerId // Если есть менеджер
          }
        ];

        for (const taskData of tasks) {
          try {
            // Проверяем, не существует ли уже такая задача
            const existing = await prisma.taskExecution.findFirst({
              where: {
                techCardId: taskData.techCardId,
                scheduledFor: taskData.scheduledFor
              }
            });

            if (!existing) {
              await prisma.taskExecution.create({
                data: taskData
              });
              createdCount++;
            }
          } catch (error) {
            console.log(`⚠️ Ошибка создания задачи: ${error.message}`);
          }
        }
      }
    }

    console.log(`✅ Создано ${createdCount} тестовых задач`);

    // Статистика
    const stats = await prisma.taskExecution.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    console.log('\n📊 Статистика задач:');
    stats.forEach(stat => {
      console.log(`   ${stat.status}: ${stat._count.id} задач`);
    });

  } catch (error) {
    console.error('❌ Ошибка создания тестовых задач:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestTasks();
