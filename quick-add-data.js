const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addData() {
  try {
    // Проверяем админа
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.log('❌ Админ не найден. Создаем админа...');
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          name: 'Admin',
          password: hashedPassword,
          role: 'ADMIN',
        }
      });
      console.log('✅ Админ создан:', newAdmin.email);
      admin = newAdmin;
    }

    // Проверяем объекты
    const existingObjects = await prisma.cleaningObject.findMany();
    console.log(`Найдено объектов: ${existingObjects.length}`);

    if (existingObjects.length === 0) {
      console.log('Добавляем тестовые объекты...');
      
      const gallery = await prisma.cleaningObject.create({
        data: {
          name: 'Торговый центр "Галерея"',
          address: 'ул. Ленина, 45',
          managerId: admin.id,
          creatorId: admin.id,
        }
      });

      const businessPark = await prisma.cleaningObject.create({
        data: {
          name: 'Офисный центр "Бизнес-Парк"',
          address: 'пр. Мира, 123',
          managerId: admin.id,
          creatorId: admin.id,
        }
      });

      console.log('✅ Объекты созданы');

      // Добавляем помещения
      await prisma.room.createMany({
        data: [
          { name: 'Холл', description: 'Главный холл торгового центра', objectId: gallery.id },
          { name: 'Офис 101', description: 'Административный офис', objectId: gallery.id },
          { name: 'Туалеты 1 этаж', description: 'Санузлы на первом этаже', objectId: gallery.id },
          { name: 'Коридор', description: 'Главный коридор офисного центра', objectId: businessPark.id },
          { name: 'Переговорная', description: 'Переговорная комната', objectId: businessPark.id },
          { name: 'Кухня', description: 'Общая кухня для сотрудников', objectId: businessPark.id },
        ]
      });

      console.log('✅ Помещения созданы');
    }

    // Проверяем инвентарь
    const existingInventory = await prisma.inventoryItem.findMany();
    console.log(`Найдено позиций инвентаря: ${existingInventory.length}`);

    if (existingInventory.length === 0) {
      await prisma.inventoryItem.createMany({
        data: [
          { name: 'Моющее средство универсальное', quantity: 50, unit: 'л', price: 150.00 },
          { name: 'Салфетки микрофибра', quantity: 100, unit: 'шт', price: 25.00 },
          { name: 'Пакеты для мусора 120л', quantity: 200, unit: 'шт', price: 15.00 },
        ]
      });

      console.log('✅ Инвентарь создан');
    }

    console.log('🎉 Тестовые данные готовы!');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addData();
