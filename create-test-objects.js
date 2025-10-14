const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('🏢 Создание тестовых объектов...');

    // Найдем существующего админа для создания объектов
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.log('❌ Не найден администратор для создания объектов');
      return;
    }

    // Создаем тестовые объекты
    const objects = [
      { name: 'Офис "Центральный"', address: 'ул. Ленина, 1' },
      { name: 'Торговый центр "Мега"', address: 'пр. Победы, 15' },
      { name: 'Бизнес-центр "Альфа"', address: 'ул. Советская, 25' }
    ];

    for (const objectData of objects) {
      const object = await prisma.cleaningObject.create({
        data: {
          name: objectData.name,
          address: objectData.address,
          creator: {
            connect: { id: admin.id }
          },
          timezone: 'Europe/Moscow',
          workingHours: {
            start: '09:00',
            end: '18:00'
          },
          workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
        }
      });

      console.log(`✅ Объект создан: ${object.name}`);
    }

    console.log('\n🎉 Тестовые объекты созданы!');
    console.log('\n📋 Данные для входа:');
    console.log('Бухгалтер: accountant@cleaning.com / accountant123');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
