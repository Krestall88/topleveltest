const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllPhotos() {
  try {
    console.log('🔍 ПОЛНАЯ ПРОВЕРКА ВСЕХ ФОТОГРАФИЙ В БАЗЕ ДАННЫХ...');
    console.log('='.repeat(60));

    // 1. Проверяем таблицу photoReport
    console.log('\n📊 1. ПРОВЕРКА ТАБЛИЦЫ photoReport:');
    const photoReports = await prisma.photoReport.findMany({
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
    console.log(`   Всего записей: ${photoReports.length}`);
    
    if (photoReports.length > 0) {
      photoReports.forEach((photo, index) => {
        console.log(`   ${index + 1}. ID: ${photo.id}`);
        console.log(`      URL: ${photo.url}`);
        console.log(`      Загрузчик: ${photo.uploaderId}`);
        console.log(`      Объект: ${photo.objectId}`);
        console.log(`      Задача: ${photo.taskId}`);
        console.log(`      Дата: ${photo.createdAt}`);
        console.log('      ---');
      });
    }

    // 2. Проверяем завершенные задачи
    console.log('\n📊 2. ПРОВЕРКА ЗАВЕРШЕННЫХ ЗАДАЧ:');
    const allCompletedTasks = await prisma.task.findMany({
      where: {
        status: 'COMPLETED'
      },
      select: {
        id: true,
        description: true,
        completionPhotos: true,
        completedAt: true,
        completedById: true,
        checklistId: true
      }
    });
    console.log(`   Всего завершенных задач: ${allCompletedTasks.length}`);

    // 3. Проверяем задачи с фотографиями
    const tasksWithPhotos = allCompletedTasks.filter(task => 
      task.completionPhotos && task.completionPhotos.length > 0
    );
    console.log(`   Задач с фотографиями: ${tasksWithPhotos.length}`);

    if (tasksWithPhotos.length > 0) {
      console.log('\n📋 ДЕТАЛИ ЗАДАЧ С ФОТОГРАФИЯМИ:');
      for (const task of tasksWithPhotos) {
        console.log(`   Задача ID: ${task.id}`);
        console.log(`   Описание: ${task.description}`);
        console.log(`   Фотографии (${task.completionPhotos.length}):`, task.completionPhotos);
        console.log(`   Завершена: ${task.completedAt}`);
        console.log(`   Кем: ${task.completedById}`);
        console.log(`   Чек-лист: ${task.checklistId}`);

        // Проверяем связанный объект через чек-лист
        if (task.checklistId) {
          const checklist = await prisma.checklist.findUnique({
            where: { id: task.checklistId },
            select: {
              object: {
                select: {
                  id: true,
                  name: true,
                  address: true
                }
              }
            }
          });
          
          if (checklist?.object) {
            console.log(`   Объект: ${checklist.object.name} (${checklist.object.address})`);
          } else {
            console.log(`   ❌ Объект не найден для чек-листа ${task.checklistId}`);
          }
        }

        // Проверяем пользователя
        if (task.completedById) {
          const user = await prisma.user.findUnique({
            where: { id: task.completedById },
            select: { name: true, role: true }
          });
          
          if (user) {
            console.log(`   Пользователь: ${user.name} (${user.role})`);
          }
        }
        
        console.log('   ' + '-'.repeat(50));
      }
    }

    // 4. Подсчитываем общее количество фотографий
    let totalPhotos = photoReports.length;
    tasksWithPhotos.forEach(task => {
      totalPhotos += task.completionPhotos.length;
    });

    console.log('\n🎯 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`   Фотографии в photoReport: ${photoReports.length}`);
    console.log(`   Фотографии в завершенных задачах: ${tasksWithPhotos.reduce((sum, task) => sum + task.completionPhotos.length, 0)}`);
    console.log(`   ВСЕГО ФОТОГРАФИЙ: ${totalPhotos}`);

  } catch (error) {
    console.error('❌ Ошибка проверки фотографий:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllPhotos();
