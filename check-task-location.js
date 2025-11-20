const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTaskLocation() {
  try {
    // Получаем одну из дублированных задач
    const task = await prisma.task.findFirst({
      where: {
        description: {
          contains: 'Посыпка тротуаров',
          mode: 'insensitive'
        },
        scheduledStart: {
          gte: new Date('2025-11-20')
        }
      },
      include: {
        checklist: {
          include: {
            object: true,
            room: {
              include: {
                site: true,
                zone: true,
                roomGroup: true
              }
            }
          }
        }
      }
    });

    if (!task) {
      console.log('❌ Задача не найдена');
      return;
    }

    console.log('\n📋 Задача:', task.description);
    console.log('   ID:', task.id);
    console.log('   Объект:', task.objectName);
    console.log('   Помещение:', task.roomName);
    console.log('\n📍 Данные из checklist:');
    console.log('   Объект:', task.checklist?.object?.name || 'НЕТ');
    console.log('   Помещение:', task.checklist?.room?.name || 'НЕТ');
    
    if (task.checklist?.room) {
      console.log('\n🏗️ Иерархия помещения:');
      console.log('   Участок:', task.checklist.room.site?.name || 'НЕТ');
      console.log('   Зона:', task.checklist.room.zone?.name || 'НЕТ');
      console.log('   Группа помещений:', task.checklist.room.roomGroup?.name || 'НЕТ');
    }

    // Проверим, есть ли у задачи прямые связи с иерархией
    console.log('\n🔍 Проверка прямых связей задачи:');
    console.log('   checklistId:', task.checklistId);
    
    // Попробуем извлечь techCardId из ID задачи
    const parts = task.id.split('-');
    if (parts.length >= 4) {
      const techCardId = parts.slice(0, -3).join('-');
      console.log('   Извлечённый techCardId:', techCardId);
      
      // Получаем техкарту
      const techCard = await prisma.techCard.findUnique({
        where: { id: techCardId },
        include: {
          room: {
            include: {
              site: true,
              zone: true,
              roomGroup: true
            }
          },
          object: true
        }
      });
      
      if (techCard) {
        console.log('\n📝 Данные из техкарты:');
        console.log('   Название:', techCard.name);
        console.log('   Объект:', techCard.object.name);
        console.log('   Помещение:', techCard.room?.name || 'НЕТ');
        
        if (techCard.room) {
          console.log('\n🏗️ Иерархия помещения из техкарты:');
          console.log('   Участок:', techCard.room.site?.name || 'НЕТ');
          console.log('   Зона:', techCard.room.zone?.name || 'НЕТ');
          console.log('   Группа помещений:', techCard.room.roomGroup?.name || 'НЕТ');
        }
      }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTaskLocation();
