const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTasksForMultipleDays() {
  console.log('🚀 Создание задач на несколько дней...');

  // Получаем все техкарты
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

  // Создаем задачи на 7 дней (включая сегодня)
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    dates.push(date);
  }

  let totalCreated = 0;
  let totalChecklists = 0;

  for (const targetDate of dates) {
    const dateStr = targetDate.toISOString().split('T')[0];
    console.log(`\n📅 Создаем задачи на дату: ${dateStr}`);

    // Группируем техкарты по объектам для создания чек-листов
    const checklistsMap = new Map();

    let createdTasks = 0;
    let createdChecklists = 0;

    for (const techCard of techCards) {
      try {
        const taskId = `${techCard.id}-${dateStr}`;
        
        // Проверяем, не существует ли уже такая задача
        const existingTask = await prisma.task.findUnique({
          where: { id: taskId }
        });

        if (existingTask) {
          continue; // Пропускаем, если задача уже существует
        }

        // Создаем или получаем чек-лист для объекта
        const checklistId = `checklist-${techCard.objectId}-${dateStr}`;
        let checklist = checklistsMap.get(checklistId);
        
        if (!checklist) {
          checklist = await prisma.checklist.findUnique({
            where: { id: checklistId }
          });

          if (!checklist) {
            // Создаем новый чек-лист
            checklist = await prisma.checklist.create({
              data: {
                id: checklistId,
                date: targetDate,
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
        const currentHour = new Date().getHours();
        let taskStatus = 'NEW';
        
        // Если это сегодняшняя дата и рабочее время
        if (dateStr === new Date().toISOString().split('T')[0] && currentHour >= 8 && currentHour < 20) {
          taskStatus = 'AVAILABLE';
        }

        // Создаем задачу
        await prisma.task.create({
          data: {
            id: taskId,
            description: techCard.description || techCard.name,
            status: taskStatus,
            objectName: techCard.object?.name || 'Неизвестный объект',
            roomName: techCard.room?.name || 'Неизвестное помещение',
            scheduledStart: targetDate,
            scheduledEnd: new Date(targetDate.getTime() + 8 * 60 * 60 * 1000), // +8 часов
            roomId: techCard.roomId,
            checklistId: checklist.id
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

    console.log(`✅ За ${dateStr}: создано ${createdTasks} задач, ${createdChecklists} чек-листов`);
    totalCreated += createdTasks;
    totalChecklists += createdChecklists;
  }

  // Итоговая статистика
  const totalTasks = await prisma.task.count();
  const totalChecklistsInDb = await prisma.checklist.count();

  console.log(`\n🎉 РЕЗУЛЬТАТЫ:`);
  console.log(`✅ Создано задач: ${totalCreated}`);
  console.log(`✅ Создано чек-листов: ${totalChecklists}`);
  console.log(`📋 Всего техкарт обработано: ${techCards.length}`);
  console.log(`📅 Дней: ${dates.length}`);

  console.log(`\n📊 ИТОГОВАЯ СТАТИСТИКА:`);
  console.log(`📋 Всего задач в базе: ${totalTasks}`);
  console.log(`📝 Всего чек-листов в базе: ${totalChecklistsInDb}`);

  console.log(`\n🚀 Теперь можете открыть календарь и увидеть все задачи!`);
  console.log(`🌐 http://localhost:3002/manager-calendar`);
}

createTasksForMultipleDays()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
