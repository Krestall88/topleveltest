const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestPhotos() {
  try {
    console.log('🔍 Создаем тестовые фотоотчеты...');

    // Получаем первого пользователя и объект
    const user = await prisma.user.findFirst({
      where: { role: 'MANAGER' }
    });

    const object = await prisma.cleaningObject.findFirst();

    if (!user || !object) {
      console.log('❌ Не найдены пользователь или объект для создания тестовых фото');
      return;
    }

    console.log('📝 Найдены:', { user: user.name, object: object.name });

    // Создаем тестовые фотоотчеты
    const testPhotos = [
      {
        url: '/uploads/photos/test1.jpg',
        comment: 'Уборка завершена успешно',
        uploaderId: user.id,
        objectId: object.id,
        taskId: null,
        checklistId: null,
        requestId: null
      },
      {
        url: '/uploads/photos/test2.jpg', 
        comment: 'Все поверхности обработаны',
        uploaderId: user.id,
        objectId: object.id,
        taskId: null,
        checklistId: null,
        requestId: null
      }
    ];

    for (const photo of testPhotos) {
      const created = await prisma.photoReport.create({
        data: photo
      });
      console.log('✅ Создан фотоотчет:', created.id);
    }

    console.log('🎉 Тестовые фотоотчеты созданы!');

  } catch (error) {
    console.error('❌ Ошибка создания тестовых фотоотчетов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPhotos();
