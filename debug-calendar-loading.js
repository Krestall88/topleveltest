const fetch = require('node-fetch');

async function debugCalendarLoading() {
  console.log('🔍 ОТЛАДКА ЗАГРУЗКИ ДАННЫХ КАЛЕНДАРЯ\n');
  
  try {
    // Тестируем разные роли
    const testUsers = [
      { name: 'Админ', email: 'admin@cleaning.com', password: 'admin123' },
      { name: 'Заместитель', email: 'test.deputy.calendar@cleaning.com', password: 'deputy123456' }
    ];

    for (const testUser of testUsers) {
      console.log(`👤 Тестируем календарь для: ${testUser.name}`);
      
      // Вход
      const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        }),
      });

      if (!loginResponse.ok) {
        console.log(`   ❌ Ошибка входа: ${loginResponse.status}`);
        continue;
      }

      const userData = await loginResponse.json();
      console.log(`   ✅ Вход успешен: ${userData.user.role}`);
      
      const cookies = loginResponse.headers.get('set-cookie');

      // Проверяем API календаря с подробной отладкой
      console.log('   🔌 Тестируем API календаря...');
      
      const apiResponse = await fetch('http://localhost:3002/api/tasks/calendar-unified', {
        headers: { 'Cookie': cookies || '' }
      });

      console.log(`   📊 Статус API: ${apiResponse.status}`);
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        
        console.log(`   📋 Структура ответа:`);
        console.log(`      - userRole: ${apiData.userRole}`);
        console.log(`      - total: ${apiData.total}`);
        console.log(`      - overdue: ${apiData.overdue?.length || 0}`);
        console.log(`      - today: ${apiData.today?.length || 0}`);
        console.log(`      - completed: ${apiData.completed?.length || 0}`);
        console.log(`      - byManager: ${apiData.byManager?.length || 0}`);
        console.log(`      - byObject: ${apiData.byObject?.length || 0}`);
        
        // Проверяем детали менеджеров
        if (apiData.byManager && apiData.byManager.length > 0) {
          console.log(`   👥 Первые 3 менеджера:`);
          apiData.byManager.slice(0, 3).forEach((manager, index) => {
            console.log(`      ${index + 1}. ${manager.manager?.name || 'Без имени'}`);
            console.log(`         - ID: ${manager.manager?.id}`);
            console.log(`         - Задач: ${manager.tasks?.length || 0}`);
            console.log(`         - Статистика: ${JSON.stringify(manager.stats || {})}`);
          });
        } else {
          console.log(`   ❌ Нет данных по менеджерам!`);
        }
        
        // Проверяем детали объектов
        if (apiData.byObject && apiData.byObject.length > 0) {
          console.log(`   🏢 Первые 3 объекта:`);
          apiData.byObject.slice(0, 3).forEach((object, index) => {
            console.log(`      ${index + 1}. ${object.object?.name || 'Без имени'}`);
            console.log(`         - ID: ${object.object?.id}`);
            console.log(`         - Задач: ${object.tasks?.length || 0}`);
          });
        } else {
          console.log(`   ❌ Нет данных по объектам!`);
        }
        
      } else {
        const errorText = await apiResponse.text();
        console.log(`   ❌ Ошибка API: ${apiResponse.status}`);
        console.log(`   📝 Текст ошибки: ${errorText.substring(0, 200)}...`);
      }
      
      console.log('');
    }
    
    // Дополнительно проверим базовые данные в БД
    console.log('🗄️ ПРОВЕРКА БАЗОВЫХ ДАННЫХ В БД:');
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const managersCount = await prisma.user.count({ where: { role: 'MANAGER' } });
      const objectsCount = await prisma.cleaningObject.count();
      const tasksCount = await prisma.task.count();
      
      console.log(`   👥 Менеджеров в БД: ${managersCount}`);
      console.log(`   🏢 Объектов в БД: ${objectsCount}`);
      console.log(`   📋 Задач в БД: ${tasksCount}`);
      
      // Проверим связи менеджер-объект
      const managersWithObjects = await prisma.user.findMany({
        where: { role: 'MANAGER' },
        select: {
          id: true,
          name: true,
          managedObjects: {
            select: {
              id: true,
              name: true
            }
          }
        },
        take: 5
      });
      
      console.log(`   🔗 Связи менеджер-объект (первые 5):`);
      managersWithObjects.forEach((manager, index) => {
        console.log(`      ${index + 1}. ${manager.name}: ${manager.managedObjects.length} объектов`);
      });
      
    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('❌ Ошибка отладки:', error.message);
  }
}

debugCalendarLoading();
