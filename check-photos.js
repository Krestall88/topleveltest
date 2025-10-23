const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPhotos() {
  try {
    console.log('🔍 Проверяем фотоотчеты в базе данных...');

    // Проверяем все фотоотчеты
    const allPhotos = await prisma.photoReport.findMany({
      select: {
        id: true,
        url: true,
        comment: true,
        uploaderId: true,
        objectId: true,
        taskId: true,
        createdAt: true
      }
    });

    console.log('📊 Всего фотоотчетов в базе:', allPhotos.length);
    
    if (allPhotos.length > 0) {
      console.log('📋 Список фотоотчетов:');
      allPhotos.forEach((photo, index) => {
        console.log(`${index + 1}. ID: ${photo.id}`);
        console.log(`   URL: ${photo.url}`);
        console.log(`   Комментарий: ${photo.comment || 'Нет'}`);
        console.log(`   Загрузчик: ${photo.uploaderId}`);
        console.log(`   Объект: ${photo.objectId}`);
        console.log(`   Задача: ${photo.taskId || 'Нет'}`);
        console.log(`   Дата: ${photo.createdAt}`);
        console.log('---');
      });
    }

    // Проверяем завершенные задачи с фото
    const completedTasks = await prisma.task.findMany({
      where: {
        status: 'COMPLETED',
        completionPhotos: {
          isEmpty: false
        }
      },
      select: {
        id: true,
        description: true,
        completionPhotos: true,
        completedAt: true,
        completedById: true
      }
    });

    console.log('📊 Завершенных задач с фото:', completedTasks.length);
    
    if (completedTasks.length > 0) {
      console.log('📋 Список завершенных задач с фото:');
      completedTasks.forEach((task, index) => {
        console.log(`${index + 1}. ID: ${task.id}`);
        console.log(`   Описание: ${task.description}`);
        console.log(`   Фото: ${task.completionPhotos}`);
        console.log(`   Завершена: ${task.completedAt}`);
        console.log(`   Кем: ${task.completedById}`);
        console.log('---');
      });
    }

  } catch (error) {
    console.error('❌ Ошибка проверки фотоотчетов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhotos();
