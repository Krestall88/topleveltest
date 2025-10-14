const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Добавляем тестовые данные...');

    // Находим админа
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.error('Админ не найден');
      return;
    }

    // Добавляем объекты
    const gallery = await prisma.cleaningObject.upsert({
      where: { id: 'test-gallery' },
      update: {},
      create: {
        id: 'test-gallery',
        name: 'Торговый центр "Галерея"',
        address: 'ул. Ленина, 45',
        managerId: admin.id,
        creatorId: admin.id,
      }
    });

    const businessPark = await prisma.cleaningObject.upsert({
      where: { id: 'test-business-park' },
      update: {},
      create: {
        id: 'test-business-park',
        name: 'Офисный центр "Бизнес-Парк"',
        address: 'пр. Мира, 123',
        managerId: admin.id,
        creatorId: admin.id,
      }
    });

    console.log('✅ Объекты созданы');

    // Добавляем помещения для галереи
    await prisma.room.upsert({
      where: { id: 'room-gallery-hall' },
      update: {},
      create: {
        id: 'room-gallery-hall',
        name: 'Холл',
        description: 'Главный холл торгового центра',
        objectId: gallery.id,
      }
    });

    await prisma.room.upsert({
      where: { id: 'room-gallery-office' },
      update: {},
      create: {
        id: 'room-gallery-office',
        name: 'Офис 101',
        description: 'Административный офис',
        objectId: gallery.id,
      }
    });

    await prisma.room.upsert({
      where: { id: 'room-gallery-toilet' },
      update: {},
      create: {
        id: 'room-gallery-toilet',
        name: 'Туалеты 1 этаж',
        description: 'Санузлы на первом этаже',
        objectId: gallery.id,
      }
    });

    // Добавляем помещения для бизнес-парка
    await prisma.room.upsert({
      where: { id: 'room-bp-corridor' },
      update: {},
      create: {
        id: 'room-bp-corridor',
        name: 'Коридор',
        description: 'Главный коридор офисного центра',
        objectId: businessPark.id,
      }
    });

    await prisma.room.upsert({
      where: { id: 'room-bp-meeting' },
      update: {},
      create: {
        id: 'room-bp-meeting',
        name: 'Переговорная',
        description: 'Переговорная комната',
        objectId: businessPark.id,
      }
    });

    await prisma.room.upsert({
      where: { id: 'room-bp-kitchen' },
      update: {},
      create: {
        id: 'room-bp-kitchen',
        name: 'Кухня',
        description: 'Общая кухня для сотрудников',
        objectId: businessPark.id,
      }
    });

    console.log('✅ Помещения созданы');

    // Добавляем инвентарь
    await prisma.inventoryItem.upsert({
      where: { id: 'inv-cleaner' },
      update: {},
      create: {
        id: 'inv-cleaner',
        name: 'Моющее средство универсальное',
        quantity: 50,
        unit: 'л',
        price: 150.00,
      }
    });

    await prisma.inventoryItem.upsert({
      where: { id: 'inv-microfiber' },
      update: {},
      create: {
        id: 'inv-microfiber',
        name: 'Салфетки микрофибра',
        quantity: 100,
        unit: 'шт',
        price: 25.00,
      }
    });

    await prisma.inventoryItem.upsert({
      where: { id: 'inv-bags' },
      update: {},
      create: {
        id: 'inv-bags',
        name: 'Пакеты для мусора 120л',
        quantity: 200,
        unit: 'шт',
        price: 15.00,
      }
    });

    console.log('✅ Инвентарь создан');
    console.log('🎉 Все тестовые данные успешно добавлены!');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
