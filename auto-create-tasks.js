const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function autoCreateTasksFromTechCards() {
  try {
    console.log('🚀 Автоматическое создание задач из существующих техкарт...');
    
    // Получаем все техкарты с полной иерархией
    const techCards = await prisma.techCard.findMany({
      include: {
        object: {
          include: {
            manager: {
              select: { id: true, name: true, phone: true }
            }
          }
        },
        room: {
          include: {
            roomGroup: {
              include: {
                zone: {
                  include: {
                    site: true
                  }
                }
              }
            }
          }
        },
        cleaningObjectItem: true
      }
    });

    console.log(`📋 Найдено техкарт: ${techCards.length}`);

    // Создаем задачи для сегодняшней даты
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    console.log(`📅 Создаем задачи на дату: ${dateStr}`);

    let createdTasks = 0;
    let createdChecklists = 0;
    const checklistsMap = new Map(); // Для отслеживания созданных чек-листов

    for (const techCard of techCards) {
      try {
        // Создаем уникальный ID задачи
        const taskId = `${techCard.id}-${dateStr}`;
        
        // Проверяем, не существует ли уже такая задача
        const existingTask = await prisma.task.findUnique({
          where: { id: taskId }
        });

        if (existingTask) {
          console.log(`⏭️ Задача ${taskId} уже существует, пропускаем`);
          continue;
        }

        // Создаем или получаем чек-лист для объекта
        const checklistId = `checklist-${techCard.objectId}-${dateStr}`;
        let checklist;

        if (checklistsMap.has(checklistId)) {
          checklist = checklistsMap.get(checklistId);
        } else {
          // Проверяем, существует ли чек-лист
          checklist = await prisma.checklist.findUnique({
            where: { id: checklistId }
          });

          if (!checklist) {
            // Создаем новый чек-лист
            checklist = await prisma.checklist.create({
              data: {
                id: checklistId,
                date: today,
                objectId: techCard.objectId,
                creatorId: techCard.object?.managerId || 'admin',
                name: `Чек-лист для ${techCard.object?.name || 'объекта'}`
              }
            });
            createdChecklists++;
            console.log(`✅ Создан чек-лист: ${checklistId}`);
          }
          
          checklistsMap.set(checklistId, checklist);
        }

        // Определяем статус задачи на основе времени
        let taskStatus = 'NEW';
        const currentHour = today.getHours();
        
        // Если рабочее время (8-20), то задача доступна
        if (currentHour >= 8 && currentHour < 20) {
          taskStatus = 'AVAILABLE';
        }

        // Создаем задачу
        const task = await prisma.task.create({
          data: {
            id: taskId,
            description: techCard.description || techCard.name,
            status: taskStatus,
            objectName: techCard.object?.name || 'Неизвестный объект',
            roomName: techCard.room?.name || 'Неизвестное помещение',
            scheduledStart: today,
            scheduledEnd: new Date(today.getTime() + 8 * 60 * 60 * 1000), // +8 часов
            checklistId: checklist.id,
            roomId: techCard.roomId
          }
        });

        createdTasks++;
        
        if (createdTasks % 100 === 0) {
          console.log(`📊 Создано задач: ${createdTasks}...`);
        }

      } catch (error) {
        console.error(`❌ Ошибка создания задачи для техкарты ${techCard.id}:`, error.message);
      }
    }

    console.log('\n🎉 РЕЗУЛЬТАТЫ:');
    console.log(`✅ Создано чек-листов: ${createdChecklists}`);
    console.log(`✅ Создано задач: ${createdTasks}`);
    console.log(`📋 Всего техкарт обработано: ${techCards.length}`);
    console.log(`📅 Дата: ${dateStr}`);
    
    // Проверяем результат
    const totalTasks = await prisma.task.count();
    const totalChecklists = await prisma.checklist.count();
    
    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`📋 Всего задач в базе: ${totalTasks}`);
    console.log(`📝 Всего чек-листов в базе: ${totalChecklists}`);
    
    console.log('\n🚀 Теперь можете открыть календарь и увидеть все задачи!');
    console.log('🌐 http://localhost:3002/manager-calendar');

  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем создание задач
autoCreateTasksFromTechCards();
