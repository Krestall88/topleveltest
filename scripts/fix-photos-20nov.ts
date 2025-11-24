import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzePhotos() {
  console.log('🔍 Анализ фотографий за 20.11.2025...\n');

  // 1. Найти объект Яндекс
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

  console.log(`✅ Найден объект: ${yandexObject.name} (ID: ${yandexObject.id})\n`);

  // 2. Все фото за 20.11
  const startDate = new Date('2025-11-20T00:00:00');
  const endDate = new Date('2025-11-20T23:59:59');

  const allPhotos = await prisma.photoReport.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      uploader: { select: { name: true } },
      object: { select: { name: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`📸 Всего фото за 20.11: ${allPhotos.length}`);
  
  // Фото с objectId
  const photosWithObject = allPhotos.filter(p => p.objectId === yandexObject.id);
  console.log(`   - С привязкой к Яндекс: ${photosWithObject.length}`);
  
  // Фото БЕЗ objectId
  const photosWithoutObject = allPhotos.filter(p => p.objectId === null);
  console.log(`   - БЕЗ привязки к объекту: ${photosWithoutObject.length}`);
  
  // Фото с другими объектами
  const photosOtherObjects = allPhotos.filter(p => p.objectId && p.objectId !== yandexObject.id);
  console.log(`   - С другими объектами: ${photosOtherObjects.length}\n`);

  // 3. Завершенные задачи за 20.11 для Яндекс
  const completedTasks = await prisma.task.findMany({
    where: {
      completedAt: {
        gte: startDate,
        lte: endDate
      },
      objectName: { contains: 'Яндекс', mode: 'insensitive' },
      status: { in: ['COMPLETED', 'CLOSED_WITH_PHOTO'] }
    },
    include: {
      completedBy: { select: { name: true } }
    },
    orderBy: { completedAt: 'asc' }
  });

  console.log(`✅ Завершенных задач для Яндекс: ${completedTasks.length}`);
  
  const tasksWithPhotos = completedTasks.filter(t => t.completionPhotos && t.completionPhotos.length > 0);
  const tasksWithoutPhotos = completedTasks.filter(t => !t.completionPhotos || t.completionPhotos.length === 0);
  
  console.log(`   - С фото: ${tasksWithPhotos.length}`);
  console.log(`   - Без фото: ${tasksWithoutPhotos.length}`);
  
  // Подсчет фото в completionPhotos
  const totalPhotosInTasks = completedTasks.reduce((sum, task) => {
    return sum + (task.completionPhotos?.length || 0);
  }, 0);
  console.log(`   - Всего фото в completionPhotos: ${totalPhotosInTasks}\n`);

  // 4. Анализ расхождений
  console.log('📊 АНАЛИЗ РАСХОЖДЕНИЙ:\n');
  
  console.log(`Фото в PhotoReport (Яндекс): ${photosWithObject.length}`);
  console.log(`Фото в PhotoReport (БЕЗ объекта): ${photosWithoutObject.length}`);
  console.log(`Фото в Task.completionPhotos: ${totalPhotosInTasks}`);
  console.log(`Задач с фото: ${tasksWithPhotos.length}`);
  console.log(`Задач без фото: ${tasksWithoutPhotos.length}\n`);

  // 5. Проверка дубликатов по URL
  const urlMap = new Map<string, any[]>();
  allPhotos.forEach(photo => {
    if (!urlMap.has(photo.url)) {
      urlMap.set(photo.url, []);
    }
    urlMap.get(photo.url)!.push(photo);
  });

  const duplicates = Array.from(urlMap.entries()).filter(([_, photos]) => photos.length > 1);
  
  if (duplicates.length > 0) {
    console.log(`⚠️  Найдено дубликатов по URL: ${duplicates.length}\n`);
    duplicates.forEach(([url, photos]) => {
      console.log(`   URL: ${url.substring(0, 50)}...`);
      console.log(`   Количество: ${photos.length}`);
      photos.forEach(p => {
        console.log(`     - ID: ${p.id}, objectId: ${p.objectId || 'NULL'}, taskId: ${p.taskId || 'NULL'}`);
      });
      console.log('');
    });
  }

  // 6. Фото без привязки к объекту - детальный анализ
  if (photosWithoutObject.length > 0) {
    console.log(`\n🔍 ФОТО БЕЗ ПРИВЯЗКИ К ОБЪЕКТУ (${photosWithoutObject.length}):\n`);
    
    for (const photo of photosWithoutObject) {
      console.log(`📸 Фото ID: ${photo.id}`);
      console.log(`   URL: ${photo.url}`);
      console.log(`   Загружено: ${photo.createdAt.toISOString()}`);
      console.log(`   Загрузил: ${photo.uploader?.name || 'Неизвестно'}`);
      console.log(`   taskId: ${photo.taskId || 'NULL'}`);
      
      // Проверяем связанную задачу
      if (photo.taskId) {
        const task = await prisma.task.findUnique({
          where: { id: photo.taskId },
          select: { 
            id: true, 
            description: true, 
            objectName: true, 
            status: true,
            completedAt: true,
            checklistId: true
          }
        });
        
        if (task) {
          console.log(`   Задача: ${task.description}`);
          console.log(`   Объект задачи: ${task.objectName}`);
          console.log(`   Статус: ${task.status}`);
          
          // Пытаемся найти objectId через checklist
          if (task.checklistId) {
            const checklist = await prisma.checklist.findUnique({
              where: { id: task.checklistId },
              select: { objectId: true, object: { select: { name: true } } }
            });
            
            if (checklist) {
              console.log(`   ✅ Можно привязать к объекту: ${checklist.object.name} (${checklist.objectId})`);
            }
          } else {
            // Пытаемся найти объект по имени
            const possibleObject = await prisma.cleaningObject.findFirst({
              where: { name: { contains: task.objectName, mode: 'insensitive' } }
            });
            
            if (possibleObject) {
              console.log(`   ✅ Можно привязать к объекту: ${possibleObject.name} (${possibleObject.id})`);
            }
          }
        } else {
          console.log(`   ❌ Задача не найдена!`);
        }
      }
      console.log('');
    }
  }

  // 7. Проверка связи фото с задачами
  console.log('\n🔗 ПРОВЕРКА СВЯЗИ ФОТО С ЗАДАЧАМИ:\n');
  
  const photosWithTask = allPhotos.filter(p => p.taskId);
  const photosWithoutTask = allPhotos.filter(p => !p.taskId);
  
  console.log(`Фото с taskId: ${photosWithTask.length}`);
  console.log(`Фото БЕЗ taskId: ${photosWithoutTask.length}\n`);

  // Проверяем существование задач
  let tasksNotFound = 0;
  for (const photo of photosWithTask) {
    const task = await prisma.task.findUnique({
      where: { id: photo.taskId! }
    });
    
    if (!task) {
      tasksNotFound++;
      console.log(`⚠️  Фото ${photo.id} ссылается на несуществующую задачу ${photo.taskId}`);
    }
  }
  
  if (tasksNotFound > 0) {
    console.log(`\n❌ Найдено фото со ссылками на несуществующие задачи: ${tasksNotFound}\n`);
  }

  return {
    yandexObject,
    allPhotos,
    photosWithObject,
    photosWithoutObject,
    completedTasks,
    tasksWithPhotos,
    tasksWithoutPhotos,
    duplicates,
    totalPhotosInTasks
  };
}

async function fixPhotos() {
  console.log('\n🔧 НАЧИНАЕМ ИСПРАВЛЕНИЕ...\n');

  const analysis = await analyzePhotos();
  
  if (!analysis) {
    console.error('❌ Анализ не выполнен');
    return;
  }

  const { yandexObject, photosWithoutObject, duplicates } = analysis;

  // 1. Исправляем фото без привязки к объекту
  if (photosWithoutObject.length > 0) {
    console.log(`\n🔧 Исправление фото без привязки к объекту (${photosWithoutObject.length})...\n`);
    
    for (const photo of photosWithoutObject) {
      let objectIdToSet: string | null = null;
      
      // Пытаемся найти objectId через задачу
      if (photo.taskId) {
        const task = await prisma.task.findUnique({
          where: { id: photo.taskId },
          select: { checklistId: true, objectName: true }
        });
        
        if (task) {
          // Через checklist
          if (task.checklistId) {
            const checklist = await prisma.checklist.findUnique({
              where: { id: task.checklistId },
              select: { objectId: true }
            });
            objectIdToSet = checklist?.objectId || null;
          }
          
          // Через имя объекта
          if (!objectIdToSet && task.objectName) {
            const object = await prisma.cleaningObject.findFirst({
              where: { name: { contains: task.objectName, mode: 'insensitive' } }
            });
            objectIdToSet = object?.id || null;
          }
        }
      }
      
      // Если это фото Яндекса (по имени загрузчика или времени)
      if (!objectIdToSet) {
        // Проверяем, загружал ли менеджер Яндекса
        const uploader = await prisma.user.findUnique({
          where: { id: photo.uploaderId! },
          select: { name: true }
        });
        
        if (uploader?.name?.includes('Гордеев')) {
          objectIdToSet = yandexObject.id;
          console.log(`   ℹ️  Фото ${photo.id}: привязываем к Яндекс (загрузил Гордеев)`);
        }
      }
      
      if (objectIdToSet) {
        await prisma.photoReport.update({
          where: { id: photo.id },
          data: { objectId: objectIdToSet as string }
        });
        console.log(`   ✅ Фото ${photo.id}: установлен objectId = ${objectIdToSet}`);
      } else {
        console.log(`   ⚠️  Фото ${photo.id}: не удалось определить objectId`);
      }
    }
  }

  // 2. Удаляем дубликаты
  if (duplicates.length > 0) {
    console.log(`\n🔧 Удаление дубликатов (${duplicates.length} групп)...\n`);
    
    for (const [url, photos] of duplicates) {
      // Сортируем по дате создания, оставляем самое раннее
      const sorted = photos.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const toKeep = sorted[0];
      const toDelete = sorted.slice(1);
      
      console.log(`   URL: ${url.substring(0, 50)}...`);
      console.log(`   Оставляем: ${toKeep.id} (создано ${toKeep.createdAt.toISOString()})`);
      console.log(`   Удаляем: ${toDelete.map(p => p.id).join(', ')}`);
      
      for (const photo of toDelete) {
        await prisma.photoReport.delete({
          where: { id: photo.id }
        });
      }
      
      console.log(`   ✅ Удалено ${toDelete.length} дубликатов\n`);
    }
  }

  console.log('\n✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!\n');
  
  // Повторный анализ
  console.log('🔍 Повторный анализ после исправлений:\n');
  await analyzePhotos();
}

async function resetYandexTasks() {
  console.log('\n⚠️  СБРОС ЗАДАЧ ЯНДЕКС ЗА 20.11.2025...\n');
  console.log('Это действие:');
  console.log('1. Удалит все фото из PhotoReport за 20.11 для Яндекс');
  console.log('2. Вернет завершенные задачи в статус AVAILABLE');
  console.log('3. Очистит completionPhotos, completionComment, completedAt\n');

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

  // 1. Удалить фото
  const deletedPhotos = await prisma.photoReport.deleteMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      objectId: yandexObject.id
    }
  });

  console.log(`✅ Удалено фото: ${deletedPhotos.count}`);

  // 2. Сбросить задачи
  const updatedTasks = await prisma.task.updateMany({
    where: {
      completedAt: {
        gte: startDate,
        lte: endDate
      },
      objectName: { contains: 'Яндекс', mode: 'insensitive' }
    },
    data: {
      status: 'AVAILABLE',
      completedAt: null,
      completedById: null,
      completionComment: null,
      completionPhotos: []
    }
  });

  console.log(`✅ Сброшено задач: ${updatedTasks.count}`);
  
  console.log('\n✅ СБРОС ЗАВЕРШЕН!\n');
}

// Главная функция
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'analyze') {
      await analyzePhotos();
    } else if (command === 'fix') {
      await fixPhotos();
    } else if (command === 'reset') {
      await resetYandexTasks();
    } else {
      console.log('Использование:');
      console.log('  npm run fix-photos analyze  - Анализ фото');
      console.log('  npm run fix-photos fix      - Исправить фото');
      console.log('  npm run fix-photos reset    - Сбросить задачи Яндекс за 20.11');
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
