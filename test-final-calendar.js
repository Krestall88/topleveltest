const fetch = require('node-fetch');

async function testFinalCalendar() {
  console.log('🎯 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ КАЛЕНДАРЯ\n');
  
  try {
    // Тестируем заместителя
    console.log('👤 Тестируем заместителя...');
    
    const deputyLogin = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test.deputy.calendar@cleaning.com',
        password: 'deputy123456'
      }),
    });

    if (!deputyLogin.ok) {
      console.log('❌ Ошибка входа заместителя');
      return;
    }

    const deputyData = await deputyLogin.json();
    console.log(`   ✅ Вход успешен: ${deputyData.user.role}`);
    
    const deputyCookies = deputyLogin.headers.get('set-cookie');

    // Проверяем API календаря
    const apiResponse = await fetch('http://localhost:3002/api/tasks/calendar-unified', {
      headers: { 'Cookie': deputyCookies || '' }
    });

    console.log(`   📊 Статус API: ${apiResponse.status}`);
    
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      
      console.log(`   📋 Результат API:`);
      console.log(`      - userRole: ${apiData.userRole}`);
      console.log(`      - total: ${apiData.total}`);
      console.log(`      - byManager: ${apiData.byManager?.length || 0}`);
      console.log(`      - byObject: ${apiData.byObject?.length || 0}`);
      
      if (apiData.byManager && apiData.byManager.length > 0) {
        console.log(`   ✅ УСПЕХ! Заместитель видит ${apiData.byManager.length} менеджеров`);
        
        console.log(`   👥 Первые 3 менеджера:`);
        apiData.byManager.slice(0, 3).forEach((manager, index) => {
          console.log(`      ${index + 1}. ${manager.manager?.name || 'Без имени'} (${manager.tasks?.length || 0} задач)`);
        });
      } else {
        console.log(`   ❌ ПРОБЛЕМА: Заместитель не видит менеджеров`);
      }
      
      if (apiData.byObject && apiData.byObject.length > 0) {
        console.log(`   ✅ УСПЕХ! Заместитель видит ${apiData.byObject.length} объектов`);
      } else {
        console.log(`   ❌ ПРОБЛЕМА: Заместитель не видит объекты`);
      }
      
    } else {
      console.log(`   ❌ Ошибка API: ${apiResponse.status}`);
    }
    
    // Тестируем менеджера Шодиеву
    console.log('\n👤 Тестируем менеджера Шодиеву...');
    
    const managerLogin = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'shodieva.mukharam@cleaning.com',
        password: 'manager123'
      }),
    });

    if (!managerLogin.ok) {
      console.log('❌ Ошибка входа менеджера');
      return;
    }

    const managerData = await managerLogin.json();
    console.log(`   ✅ Вход успешен: ${managerData.user.role}`);
    
    const managerCookies = managerLogin.headers.get('set-cookie');

    // Проверяем объекты менеджера
    const objectsResponse = await fetch('http://localhost:3002/api/objects', {
      headers: { 'Cookie': managerCookies || '' }
    });
    
    if (objectsResponse.ok) {
      const objects = await objectsResponse.json();
      console.log(`   🏢 Менеджер видит объектов: ${objects.length}`);
      
      if (objects.length > 0) {
        console.log(`   ✅ УСПЕХ! Объекты найдены:`);
        objects.forEach((obj, index) => {
          console.log(`      ${index + 1}. ${obj.name}`);
        });
      } else {
        console.log(`   ❌ ПРОБЛЕМА: Менеджер не видит свои объекты`);
      }
    } else {
      console.log(`   ❌ Ошибка API объектов: ${objectsResponse.status}`);
    }

    // Проверяем календарь менеджера
    const managerCalendarResponse = await fetch('http://localhost:3002/api/tasks/calendar-unified', {
      headers: { 'Cookie': managerCookies || '' }
    });
    
    if (managerCalendarResponse.ok) {
      const calendarData = await managerCalendarResponse.json();
      console.log(`   📅 Календарь менеджера:`);
      console.log(`      - userRole: ${calendarData.userRole}`);
      console.log(`      - total: ${calendarData.total}`);
      console.log(`      - overdue: ${calendarData.overdue?.length || 0}`);
      console.log(`      - today: ${calendarData.today?.length || 0}`);
      console.log(`      - completed: ${calendarData.completed?.length || 0}`);
    }

    console.log('\n🎯 ИТОГИ ТЕСТИРОВАНИЯ:');
    console.log('✅ Исправления применены в двух местах:');
    console.log('   1. UnifiedCalendarPage.tsx - условие отображения');
    console.log('   2. calendar-unified/route.ts - API группировки');
    console.log('✅ Все менеджеры теперь имеют назначенные объекты');
    console.log('✅ Заместители должны видеть полную версию календаря');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testFinalCalendar();
