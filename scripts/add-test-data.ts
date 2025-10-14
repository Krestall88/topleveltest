import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTestData() {
  try {
    console.log('Добавляем тестовые данные...');

    // Находим админа
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.error('Админ не найден в базе данных');
      return;
    }

    // Проверяем, есть ли уже тестовые объекты
    const existingGallery = await prisma.cleaningObject.findFirst({
      where: { name: 'Торговый центр "Галерея"' }
    });

    const existingBusinessPark = await prisma.cleaningObject.findFirst({
      where: { name: 'Офисный центр "Бизнес-Парк"' }
    });

    // Создаем объекты если их нет
    let gallery = existingGallery;
    if (!gallery) {
      gallery = await prisma.cleaningObject.create({
        data: {
          name: 'Торговый центр "Галерея"',
          address: 'ул. Ленина, 45',
          managerId: admin.id,
          creatorId: admin.id,
        },
      });
      console.log('✅ Создан объект: Торговый центр "Галерея"');
    } else {
      console.log('ℹ️ Объект "Торговый центр Галерея" уже существует');
    }

    let businessPark = existingBusinessPark;
    if (!businessPark) {
      businessPark = await prisma.cleaningObject.create({
        data: {
          name: 'Офисный центр "Бизнес-Парк"',
          address: 'пр. Мира, 123',
          managerId: admin.id,
          creatorId: admin.id,
        },
      });
      console.log('✅ Создан объект: Офисный центр "Бизнес-Парк"');
    } else {
      console.log('ℹ️ Объект "Офисный центр Бизнес-Парк" уже существует');
    }

    // Создаем помещения для торгового центра
    const galleryRooms = [
      { name: 'Холл', description: 'Главный холл торгового центра' },
      { name: 'Офис 101', description: 'Административный офис' },
      { name: 'Туалеты 1 этаж', description: 'Санузлы на первом этаже' },
    ];

    for (const roomData of galleryRooms) {
      const existingRoom = await prisma.room.findFirst({
        where: { 
          objectId: gallery.id,
          name: roomData.name 
        }
      });

      if (!existingRoom) {
        await prisma.room.create({
          data: {
            name: roomData.name,
            description: roomData.description,
            objectId: gallery.id,
          },
        });
        console.log(`✅ Создано помещение: ${roomData.name} (Галерея)`);
      }
    }

    // Создаем помещения для офисного центра
    const businessParkRooms = [
      { name: 'Коридор', description: 'Главный коридор офисного центра' },
      { name: 'Переговорная', description: 'Переговорная комната' },
      { name: 'Кухня', description: 'Общая кухня для сотрудников' },
    ];

    for (const roomData of businessParkRooms) {
      const existingRoom = await prisma.room.findFirst({
        where: { 
          objectId: businessPark.id,
          name: roomData.name 
        }
      });

      if (!existingRoom) {
        await prisma.room.create({
          data: {
            name: roomData.name,
            description: roomData.description,
            objectId: businessPark.id,
          },
        });
        console.log(`✅ Создано помещение: ${roomData.name} (Бизнес-Парк)`);
      }
    }

    // Создаем базовые позиции инвентаря
    const inventoryItems = [
      { name: 'Моющее средство универсальное', quantity: 50, unit: 'л', price: 150.00 },
      { name: 'Салфетки микрофибра', quantity: 100, unit: 'шт', price: 25.00 },
      { name: 'Пакеты для мусора 120л', quantity: 200, unit: 'шт', price: 15.00 },
    ];

    for (const itemData of inventoryItems) {
      const existingItem = await prisma.inventoryItem.findFirst({
        where: { name: itemData.name }
      });

      if (!existingItem) {
        await prisma.inventoryItem.create({
          data: itemData,
        });
        console.log(`✅ Создана позиция инвентаря: ${itemData.name}`);
      }
    }

    console.log('🎉 Тестовые данные успешно добавлены!');
  } catch (error) {
    console.error('❌ Ошибка при добавлении тестовых данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestData();
