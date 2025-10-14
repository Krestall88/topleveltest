const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupSBKKRequirements() {
  try {
    // Найти объект ЗАО "СБКК"
    const sbkkObject = await prisma.cleaningObject.findFirst({
      where: {
        name: {
          contains: 'СБКК'
        }
      }
    });

    if (!sbkkObject) {
      console.log('❌ Объект СБКК не найден');
      return;
    }

    console.log('✅ Найден объект:', sbkkObject.name);

    // Обновить настройки объекта - требовать и фото, и комментарий
    const updatedObject = await prisma.cleaningObject.update({
      where: { id: sbkkObject.id },
      data: {
        requirePhotoForCompletion: true,
        requireCommentForCompletion: true,
        completionRequirements: {
          photo: true,
          comment: true,
          minPhotos: 2,
          photoDescription: "Сфотографируйте общий вид помещений до и после уборки",
          commentDescription: "Опишите качество выполненной уборки и особенности объекта"
        }
      }
    });

    console.log('✅ Настройки объекта СБКК обновлены:');
    console.log('- Обязательное фото: ДА (минимум 2 фото)');
    console.log('- Обязательный комментарий: ДА');
    console.log('- Подсказка для фото:', updatedObject.completionRequirements.photoDescription);
    console.log('- Подсказка для комментария:', updatedObject.completionRequirements.commentDescription);

    // Проверить существующие чек-листы
    const existingChecklists = await prisma.checklist.findMany({
      where: {
        objectId: sbkkObject.id,
        completedAt: null // Только незавершенные
      },
      include: {
        room: true,
        tasks: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log(`\n📋 Найдено ${existingChecklists.length} незавершенных чек-листов для СБКК:`);
    existingChecklists.forEach((checklist, index) => {
      const completedTasks = checklist.tasks.filter(t => t.status === 'COMPLETED' || t.status === 'CLOSED_WITH_PHOTO').length;
      console.log(`${index + 1}. ${checklist.date.toLocaleDateString('ru-RU')} - ${checklist.room?.name || 'Без помещения'} (${completedTasks}/${checklist.tasks.length} задач)`);
    });

    if (existingChecklists.length === 0) {
      console.log('\n🔄 Создаем тестовый чек-лист...');
      
      // Найти помещение с техкартами
      const roomWithTechCards = await prisma.room.findFirst({
        where: {
          objectId: sbkkObject.id
        },
        include: {
          techCards: true
        }
      });

      if (roomWithTechCards && roomWithTechCards.techCards.length > 0) {
        const checklist = await prisma.checklist.create({
          data: {
            date: new Date(),
            objectId: sbkkObject.id,
            roomId: roomWithTechCards.id,
            createdById: sbkkObject.creatorId,
            tasks: {
              create: roomWithTechCards.techCards.slice(0, 3).map(techCard => ({
                description: techCard.description || techCard.name,
                status: 'AVAILABLE',
                roomId: roomWithTechCards.id,
                techCardId: techCard.id
              }))
            }
          },
          include: {
            tasks: true,
            room: true
          }
        });

        console.log('✅ Создан тестовый чек-лист:');
        console.log('- ID:', checklist.id);
        console.log('- Помещение:', checklist.room.name);
        console.log('- Задач:', checklist.tasks.length);
      }
    }

    console.log('\n🎯 Теперь можно тестировать:');
    console.log('1. Откройте http://localhost:3001/objects');
    console.log('2. Найдите объект "ЗАО СБКК"');
    console.log('3. Нажмите "Подробно"');
    console.log('4. В разделе "Последние чек-листы" нажмите "Завершить"');
    console.log('5. Увидите требования: минимум 2 фото + комментарий');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupSBKKRequirements();
