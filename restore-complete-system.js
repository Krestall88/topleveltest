const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function restoreCompleteSystem() {
  try {
    console.log('🔄 Восстановление полной системы клининга...\n');

    // 1. Создаем всех пользователей
    console.log('👥 Создание пользователей...');
    
    const users = [
      {
        name: 'Администратор',
        email: 'admin@cleaning.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'ADMIN'
      },
      {
        name: 'Заместитель',
        email: 'deputy@cleaning.com', 
        password: await bcrypt.hash('deputy123', 10),
        role: 'DEPUTY'
      },
      {
        name: 'Главный бухгалтер',
        email: 'accountant@cleaning.com',
        password: await bcrypt.hash('accountant123', 10),
        role: 'ACCOUNTANT'
      },
      {
        name: 'Менеджер Иванов',
        email: 'ivanov@cleaning.com',
        password: await bcrypt.hash('manager123', 10),
        role: 'MANAGER'
      },
      {
        name: 'Менеджер Петров',
        email: 'petrov@cleaning.com',
        password: await bcrypt.hash('manager123', 10),
        role: 'MANAGER'
      },
      {
        name: 'Менеджер Сидоров',
        email: 'sidorov@cleaning.com',
        password: await bcrypt.hash('manager123', 10),
        role: 'MANAGER'
      }
    ];

    for (const userData of users) {
      try {
        const user = await prisma.user.create({ data: userData });
        console.log(`   ✅ ${user.name} (${user.role})`);
      } catch (error) {
        console.log(`   ⚠️ Пользователь ${userData.email} уже существует`);
      }
    }

    // Получаем созданных пользователей
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const managers = await prisma.user.findMany({ where: { role: 'MANAGER' } });

    // 2. Создаем объекты БКК и другие
    console.log('\n🏢 Создание объектов...');
    
    const objects = [
      // БКК объекты
      { name: 'БКК - Главный офис', address: 'ул. Центральная, 1', managerId: managers[0]?.id },
      { name: 'БКК - Филиал №1', address: 'пр. Ленина, 45', managerId: managers[0]?.id },
      { name: 'БКК - Филиал №2', address: 'ул. Советская, 12', managerId: managers[1]?.id },
      { name: 'БКК - Операционный зал', address: 'ул. Банковская, 8', managerId: managers[1]?.id },
      { name: 'БКК - Кредитный отдел', address: 'пр. Финансовый, 3', managerId: managers[2]?.id },
      
      // Офисные здания
      { name: 'Бизнес-центр "Альфа"', address: 'ул. Деловая, 15', managerId: managers[0]?.id },
      { name: 'Офисный комплекс "Бета"', address: 'пр. Корпоративный, 22', managerId: managers[1]?.id },
      { name: 'Административное здание', address: 'ул. Управленческая, 7', managerId: managers[2]?.id },
      
      // Торговые центры
      { name: 'ТРЦ "Мега"', address: 'ул. Торговая, 100', managerId: managers[0]?.id },
      { name: 'ТЦ "Центральный"', address: 'пл. Центральная, 1', managerId: managers[1]?.id },
      { name: 'Гипермаркет "Глобус"', address: 'ш. Московское, 45', managerId: managers[2]?.id },
      
      // Производственные объекты
      { name: 'Завод "Металлург"', address: 'ул. Заводская, 12', managerId: managers[0]?.id },
      { name: 'Фабрика "Текстиль"', address: 'пр. Промышленный, 8', managerId: managers[1]?.id },
      { name: 'Склад "Логистик"', address: 'ул. Складская, 25', managerId: managers[2]?.id },
      
      // Медицинские учреждения
      { name: 'Поликлиника №1', address: 'ул. Медицинская, 5', managerId: managers[0]?.id },
      { name: 'Больница "Здоровье"', address: 'пр. Лечебный, 18', managerId: managers[1]?.id },
      { name: 'Стоматология "Дента"', address: 'ул. Зубная, 3', managerId: managers[2]?.id },
      
      // Образовательные учреждения
      { name: 'Школа №15', address: 'ул. Школьная, 10', managerId: managers[0]?.id },
      { name: 'Университет', address: 'пр. Студенческий, 2', managerId: managers[1]?.id },
      { name: 'Детский сад "Солнышко"', address: 'ул. Детская, 7', managerId: managers[2]?.id },
      
      // Гостиницы и рестораны
      { name: 'Отель "Премиум"', address: 'ул. Гостиничная, 20', managerId: managers[0]?.id },
      { name: 'Ресторан "Деликатес"', address: 'пр. Ресторанный, 12', managerId: managers[1]?.id },
      { name: 'Кафе "Уют"', address: 'ул. Кафейная, 5', managerId: managers[2]?.id },
      
      // Спортивные объекты
      { name: 'Спортзал "Олимп"', address: 'ул. Спортивная, 30', managerId: managers[0]?.id },
      { name: 'Бассейн "Нептун"', address: 'пр. Водный, 8', managerId: managers[1]?.id },
      { name: 'Фитнес-центр "Энергия"', address: 'ул. Фитнес, 15', managerId: managers[2]?.id },
      
      // Культурные объекты
      { name: 'Театр драмы', address: 'пл. Театральная, 1', managerId: managers[0]?.id },
      { name: 'Музей истории', address: 'ул. Музейная, 12', managerId: managers[1]?.id },
      { name: 'Библиотека центральная', address: 'пр. Книжный, 6', managerId: managers[2]?.id },
      
      // Транспортные объекты
      { name: 'Автовокзал', address: 'ул. Вокзальная, 1', managerId: managers[0]?.id },
      { name: 'Аэропорт - терминал А', address: 'ш. Аэропортовское, 10', managerId: managers[1]?.id },
      { name: 'ЖД вокзал', address: 'пл. Железнодорожная, 2', managerId: managers[2]?.id }
    ];

    for (const objectData of objects) {
      try {
        const object = await prisma.cleaningObject.create({
          data: {
            name: objectData.name,
            address: objectData.address,
            creator: { connect: { id: admin.id } },
            manager: objectData.managerId ? { connect: { id: objectData.managerId } } : undefined,
            timezone: 'Europe/Moscow',
            workingHours: {
              start: '08:00',
              end: '20:00'
            },
            workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
            autoChecklistEnabled: true,
            requirePhotoForCompletion: false
          }
        });
        console.log(`   ✅ ${object.name}`);
      } catch (error) {
        console.log(`   ⚠️ Объект ${objectData.name} уже существует`);
      }
    }

    // 3. Создаем помещения для некоторых объектов
    console.log('\n🏠 Создание помещений...');
    
    const createdObjects = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: 'БКК'
        }
      }
    });

    for (const object of createdObjects.slice(0, 3)) {
      const rooms = [
        { name: 'Операционный зал', description: 'Главный зал обслуживания клиентов', area: 150 },
        { name: 'Кабинеты менеджеров', description: 'Рабочие места менеджеров', area: 80 },
        { name: 'Коридоры', description: 'Проходные зоны', area: 50 },
        { name: 'Санузлы', description: 'Туалетные комнаты', area: 20 },
        { name: 'Кухня', description: 'Место для приема пищи', area: 25 }
      ];

      for (const roomData of rooms) {
        try {
          const room = await prisma.room.create({
            data: {
              ...roomData,
              object: { connect: { id: object.id } }
            }
          });
          console.log(`   ✅ ${object.name} - ${room.name}`);
        } catch (error) {
          console.log(`   ⚠️ Помещение уже существует`);
        }
      }
    }

    console.log('\n🎉 Система восстановлена!');
    console.log('\n📋 Данные для входа:');
    console.log('Администратор: admin@cleaning.com / admin123');
    console.log('Заместитель: deputy@cleaning.com / deputy123');
    console.log('Бухгалтер: accountant@cleaning.com / accountant123');
    console.log('Менеджеры: ivanov@cleaning.com, petrov@cleaning.com, sidorov@cleaning.com / manager123');

  } catch (error) {
    console.error('❌ Ошибка восстановления:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreCompleteSystem();
