const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestChecklist() {
  try {
    // Найти объект ЗАО "СБКК"
    const sbkkObject = await prisma.cleaningObject.findFirst({
      where: {
        name: {
          contains: 'СБКК'
        }
      },
      include: {
        rooms: {
          include: {
            techCards: true
          }
        }
      }
    });

    if (!sbkkObject) {
      console.log('Объект СБКК не найден');
      return;
    }

    console.log('Найден объект:', sbkkObject.name);

    // Найти первое помещение с техкартами
    const roomWithTechCards = sbkkObject.rooms.find(room => room.techCards.length > 0);
    
    if (!roomWithTechCards) {
      console.log('Помещение с техкартами не найдено');
      return;
    }

    console.log('Найдено помещение:', roomWithTechCards.name, 'с', roomWithTechCards.techCards.length, 'техкартами');

    // Создать чек-лист
    const checklist = await prisma.checklist.create({
      data: {
        date: new Date(),
        objectId: sbkkObject.id,
        roomId: roomWithTechCards.id,
        createdById: sbkkObject.creatorId, // Используем создателя объекта
        tasks: {
          create: roomWithTechCards.techCards.map(techCard => ({
            description: techCard.description || techCard.name,
            status: 'AVAILABLE',
            roomId: roomWithTechCards.id,
            techCardId: techCard.id
          }))
        }
      },
      include: {
        tasks: true,
        room: true,
        object: true
      }
    });

    console.log('✅ Создан тестовый чек-лист:');
    console.log('- ID:', checklist.id);
    console.log('- Объект:', checklist.object.name);
    console.log('- Помещение:', checklist.room.name);
    console.log('- Задач:', checklist.tasks.length);
    console.log('- Дата:', checklist.date.toLocaleDateString('ru-RU'));

    console.log('\n📋 Задачи в чек-листе:');
    checklist.tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.description} (${task.status})`);
    });

  } catch (error) {
    console.error('Ошибка при создании чек-листа:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestChecklist();
