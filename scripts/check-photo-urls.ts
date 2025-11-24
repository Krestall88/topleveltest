import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPhotoUrls() {
  console.log('🔍 Проверка URL фотографий за 20.11.2025\n');

  const startDate = new Date('2025-11-20T00:00:00');
  const endDate = new Date('2025-11-20T23:59:59');

  // Найти объект Яндекс
  const yandexObject = await prisma.cleaningObject.findFirst({
    where: {
      OR: [
        { name: { contains: 'Яндекс', mode: 'insensitive' } },
        { name: { contains: 'Yandex', mode: 'insensitive' } }
      ]
    }
  });

  if (!yandexObject) {
    console.error('❌ Объект Яндекс не найден!');
    return;
  }

  // Все фото за 20.11
  const photos = await prisma.photoReport.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      objectId: yandexObject.id
    },
    include: {
      uploader: { select: { id: true, name: true } },
      task: { select: { id: true, description: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`📸 Всего фото: ${photos.length}\n`);

  for (const photo of photos) {
    console.log(`\n📸 Фото ID: ${photo.id}`);
    console.log(`   URL: ${photo.url}`);
    console.log(`   Загружено: ${photo.createdAt.toISOString()}`);
    console.log(`   Загрузил: ${photo.uploader?.name || 'Неизвестно'}`);
    console.log(`   Комментарий: ${photo.comment || 'Нет'}`);
    console.log(`   Задача ID: ${photo.taskId || 'Нет'}`);
    console.log(`   Описание задачи: ${photo.task?.description || 'Нет'}`);
    
    // Проверяем формат URL
    if (photo.url.startsWith('https://s3.twcstorage.ru/')) {
      console.log(`   ✅ URL корректный (S3)`);
    } else if (photo.url.startsWith('/uploads/')) {
      console.log(`   ⚠️  URL локальный (не S3!)`);
    } else if (photo.url.startsWith('https://')) {
      console.log(`   ✅ URL корректный (HTTPS)`);
    } else {
      console.log(`   ❌ URL некорректный!`);
    }
  }

  // Проверяем задачи
  console.log('\n\n📋 ПРОВЕРКА ЗАДАЧ:\n');
  
  const tasks = await prisma.task.findMany({
    where: {
      completedAt: { gte: startDate, lte: endDate },
      objectName: { contains: 'Яндекс', mode: 'insensitive' }
    },
    select: {
      id: true,
      description: true,
      completedAt: true,
      completionComment: true,
      completionPhotos: true
    },
    orderBy: { completedAt: 'asc' }
  });

  console.log(`✅ Завершенных задач: ${tasks.length}\n`);

  for (const task of tasks) {
    console.log(`\n📌 Задача: ${task.id}`);
    console.log(`   Описание: ${task.description}`);
    console.log(`   Завершена: ${task.completedAt?.toISOString()}`);
    console.log(`   Комментарий: ${task.completionComment || 'Нет'}`);
    console.log(`   Фото в completionPhotos: ${task.completionPhotos?.length || 0}`);
    
    if (task.completionPhotos && task.completionPhotos.length > 0) {
      task.completionPhotos.forEach((url, i) => {
        console.log(`      ${i + 1}. ${url}`);
      });
    }
  }
}

async function main() {
  try {
    await checkPhotoUrls();
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
