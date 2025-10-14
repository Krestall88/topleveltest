const http = require('http');

// Функция для выполнения HTTP запроса
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testAndSeed() {
  console.log('🔍 Проверяем API и добавляем тестовые данные...');

  try {
    // Проверяем API объектов
    console.log('Проверяем /api/objects...');
    const objectsResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/objects',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`Статус: ${objectsResponse.status}`);
    console.log(`Найдено объектов: ${Array.isArray(objectsResponse.data) ? objectsResponse.data.length : 'неизвестно'}`);

    if (Array.isArray(objectsResponse.data) && objectsResponse.data.length === 0) {
      console.log('База пуста, добавляем тестовые данные через Prisma...');
      
      // Используем Prisma напрямую
      const { PrismaClient } = require('@prisma/client');
      const bcrypt = require('bcryptjs');
      const prisma = new PrismaClient();

      try {
        // Создаем админа
        let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (!admin) {
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

        // Создаем помещения
        await prisma.room.createMany({
          data: [
            { name: 'Холл', description: 'Главный холл', objectId: gallery.id },
            { name: 'Офис 101', description: 'Административный офис', objectId: gallery.id },
            { name: 'Туалеты 1 этаж', description: 'Санузлы', objectId: gallery.id },
            { name: 'Коридор', description: 'Главный коридор', objectId: businessPark.id },
            { name: 'Переговорная', description: 'Переговорная комната', objectId: businessPark.id },
            { name: 'Кухня', description: 'Общая кухня', objectId: businessPark.id },
          ]
        });

        console.log('✅ Помещения созданы');

        // Создаем инвентарь
        await prisma.inventoryItem.createMany({
          data: [
            { name: 'Моющее средство универсальное', quantity: 50, unit: 'л', price: 150.00 },
            { name: 'Салфетки микрофибра', quantity: 100, unit: 'шт', price: 25.00 },
            { name: 'Пакеты для мусора 120л', quantity: 200, unit: 'шт', price: 15.00 },
          ]
        });

        console.log('✅ Инвентарь создан');
        await prisma.$disconnect();

        // Проверяем результат
        const finalCheck = await makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: '/api/objects',
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        console.log(`🎉 Готово! Теперь в базе ${finalCheck.data.length} объектов`);

      } catch (prismaError) {
        console.error('❌ Ошибка Prisma:', prismaError.message);
        await prisma.$disconnect();
      }
    } else {
      console.log('✅ Данные уже есть в базе');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testAndSeed();
