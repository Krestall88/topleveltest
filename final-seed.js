const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedDatabase() {
  console.log('🚀 Инициализация базы данных...');

  try {
    // Создаем админа
    const adminEmail = 'admin@example.com';
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Администратор',
          password: hashedPassword,
          role: 'ADMIN',
        }
      });
      console.log('✅ Админ создан');
    } else {
      console.log('ℹ️ Админ уже существует');
    }

    // Проверяем объекты
    const objectsCount = await prisma.cleaningObject.count();
    console.log(`Объектов в базе: ${objectsCount}`);

    if (objectsCount === 0) {
      // Создаем тестовые объекты
      const objects = await prisma.$transaction([
        prisma.cleaningObject.create({
          data: {
            name: 'Торговый центр "Галерея"',
            address: 'ул. Ленина, 45',
            managerId: admin.id,
            creatorId: admin.id,
          }
        }),
        prisma.cleaningObject.create({
          data: {
            name: 'Офисный центр "Бизнес-Парк"',
            address: 'пр. Мира, 123',
            managerId: admin.id,
            creatorId: admin.id,
          }
        })
      ]);

      console.log('✅ Объекты созданы');

      // Создаем помещения
      const rooms = [
        // Для галереи
        { name: 'Холл', description: 'Главный холл торгового центра', objectId: objects[0].id },
        { name: 'Офис 101', description: 'Административный офис', objectId: objects[0].id },
        { name: 'Туалеты 1 этаж', description: 'Санузлы на первом этаже', objectId: objects[0].id },
        // Для бизнес-парка
        { name: 'Коридор', description: 'Главный коридор офисного центра', objectId: objects[1].id },
        { name: 'Переговорная', description: 'Переговорная комната', objectId: objects[1].id },
        { name: 'Кухня', description: 'Общая кухня для сотрудников', objectId: objects[1].id },
      ];

      await prisma.room.createMany({ data: rooms });
      console.log('✅ Помещения созданы');
    }

    // Проверяем инвентарь
    const inventoryCount = await prisma.inventoryItem.count();
    console.log(`Позиций инвентаря в базе: ${inventoryCount}`);

    if (inventoryCount === 0) {
      const inventory = [
        { name: 'Моющее средство универсальное', quantity: 50, unit: 'л', price: 150.00 },
        { name: 'Салфетки микрофибра', quantity: 100, unit: 'шт', price: 25.00 },
        { name: 'Пакеты для мусора 120л', quantity: 200, unit: 'шт', price: 15.00 },
        { name: 'Дезинфицирующее средство', quantity: 25, unit: 'л', price: 200.00 },
        { name: 'Перчатки резиновые', quantity: 50, unit: 'пар', price: 35.00 },
      ];

      await prisma.inventoryItem.createMany({ data: inventory });
      console.log('✅ Инвентарь создан');
    }

    // Финальная проверка
    const finalObjectsCount = await prisma.cleaningObject.count();
    const finalInventoryCount = await prisma.inventoryItem.count();
    const roomsCount = await prisma.room.count();

    console.log('\n🎉 База данных готова!');
    console.log(`📊 Статистика:`);
    console.log(`   Объекты: ${finalObjectsCount}`);
    console.log(`   Помещения: ${roomsCount}`);
    console.log(`   Инвентарь: ${finalInventoryCount}`);
    console.log(`\n🔑 Данные для входа:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Пароль: admin123`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();
