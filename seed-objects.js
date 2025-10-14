const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Добавляем тестовые данные в базу...');

  try {
    // Создаем или находим админа
    let admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.log('Создаем админа...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      admin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          name: 'Администратор',
          password: hashedPassword,
          role: 'ADMIN',
        }
      });
      console.log('✅ Админ создан');
    }

    // Проверяем существующие объекты
    const existingObjects = await prisma.cleaningObject.count();
    
    if (existingObjects === 0) {
      console.log('Добавляем тестовые объекты...');
      
      // Создаем объекты
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
      const rooms = [
        // Для галереи
        { name: 'Холл', description: 'Главный холл торгового центра', objectId: gallery.id },
        { name: 'Офис 101', description: 'Административный офис', objectId: gallery.id },
        { name: 'Туалеты 1 этаж', description: 'Санузлы на первом этаже', objectId: gallery.id },
        // Для бизнес-парка
        { name: 'Коридор', description: 'Главный коридор офисного центра', objectId: businessPark.id },
        { name: 'Переговорная', description: 'Переговорная комната', objectId: businessPark.id },
        { name: 'Кухня', description: 'Общая кухня для сотрудников', objectId: businessPark.id },
      ];

      await prisma.room.createMany({
        data: rooms
      });

      console.log('✅ Помещения созданы');
    } else {
      console.log(`ℹ️  Объекты уже существуют (${existingObjects} шт.)`);
    }

    // Проверяем инвентарь
    const existingInventory = await prisma.inventoryItem.count();
    
    if (existingInventory === 0) {
      console.log('Добавляем базовый инвентарь...');
      
      const inventory = [
        { name: 'Моющее средство универсальное', quantity: 50, unit: 'л', price: 150.00 },
        { name: 'Салфетки микрофибра', quantity: 100, unit: 'шт', price: 25.00 },
        { name: 'Пакеты для мусора 120л', quantity: 200, unit: 'шт', price: 15.00 },
        { name: 'Дезинфицирующее средство', quantity: 25, unit: 'л', price: 200.00 },
        { name: 'Перчатки резиновые', quantity: 50, unit: 'пар', price: 35.00 },
      ];

      await prisma.inventoryItem.createMany({
        data: inventory
      });

      console.log('✅ Инвентарь создан');
    } else {
      console.log(`ℹ️  Инвентарь уже существует (${existingInventory} позиций)`);
    }

    console.log('🎉 Тестовые данные успешно добавлены!');
    console.log('');
    console.log('📋 Данные для входа:');
    console.log('   Email: admin@example.com');
    console.log('   Пароль: admin123');

  } catch (error) {
    console.error('❌ Ошибка при добавлении данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
