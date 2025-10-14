const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Инициализация базы данных...');

    // Создаем админа если его нет
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@example.com' }
    });

    let admin;
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
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

    // 2. Очищаем и создаем администратора
    await prisma.user.deleteMany({});
    console.log('🗑️ Очищена таблица пользователей');

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        name: 'Администратор',
        email: 'admin@cleaning.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log('👤 Создан администратор:', admin.email);

    // 3. Создаем тестовые объекты
    const object1 = await prisma.cleaningObject.create({
      data: {
        name: 'Офис "Центральный"',
        address: 'ул. Ленина, 15',
        documents: {},
        creatorId: admin.id,
        managerId: admin.id,
      },
    });

    const object2 = await prisma.cleaningObject.create({
      data: {
        name: 'Торговый центр "Галерея"',
        address: 'пр. Мира, 45',
        documents: {},
        creatorId: admin.id,
        managerId: admin.id,
      },
    });

    console.log('🏢 Созданы объекты:', object1.name, object2.name);

    // 4. Создаем помещения для объектов
    const rooms = [
      { name: 'Офис 101', area: 25.5, objectId: object1.id },
      { name: 'Офис 102', area: 30.0, objectId: object1.id },
      { name: 'Коридор', area: 15.0, objectId: object1.id },
      { name: 'Главный зал', area: 200.0, objectId: object2.id },
      { name: 'Касса', area: 10.0, objectId: object2.id },
    ];

    for (const roomData of rooms) {
      await prisma.room.create({ data: roomData });
    }

    console.log('🏠 Созданы помещения');

    // 5. Создаем инвентарь
    const items = [
      { name: 'Моющее средство "Универсал"', unit: 'л', price: 150.00 },
      { name: 'Тряпки микрофибра', unit: 'шт', price: 50.00 },
      { name: 'Пылесос промышленный', unit: 'шт', price: 15000.00 },
    ];

    for (const itemData of items) {
      await prisma.inventoryItem.create({ data: itemData });
    }

    console.log('📦 Создан инвентарь');

    console.log('\n🎉 Все исправлено! Данные для входа:');
    console.log('📧 Email: admin@cleaning.com');
    console.log('🔑 Пароль: admin123');
    console.log('\n⚠️ ВАЖНО: Перезапустите сервер (Ctrl+C, затем npm run dev)');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
