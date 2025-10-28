const fetch = require('node-fetch');

async function testRoleFiltering() {
  console.log('🧪 ТЕСТИРОВАНИЕ ФИЛЬТРАЦИИ ПО РОЛЯМ\n');
  
  try {
    // Тестируем разные роли
    const testUsers = [
      { name: 'Админ', email: 'admin@cleaning.com', password: 'admin123', expectedRole: 'ADMIN' },
      { name: 'Заместитель', email: 'test.deputy.calendar@cleaning.com', password: 'deputy123456', expectedRole: 'DEPUTY_ADMIN' },
      { name: 'Менеджер Шодиева', email: 'shodieva.mukharam@cleaning.com', password: 'manager123', expectedRole: 'MANAGER' }
    ];

    for (const testUser of testUsers) {
      console.log(`👤 Тестируем: ${testUser.name}`);
      
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

      // Проверяем API календаря
      const apiResponse = await fetch('http://localhost:3002/api/tasks/calendar-unified', {
        headers: { 'Cookie': cookies || '' }
      });

      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        
        console.log(`   📊 API ответ:`);
        console.log(`      - userRole: ${apiData.userRole}`);
        console.log(`      - total: ${apiData.total}`);
        console.log(`      - byManager: ${apiData.byManager?.length || 0}`);
        console.log(`      - byObject: ${apiData.byObject?.length || 0}`);
        
        // Проверяем ожидаемое поведение
        if (testUser.expectedRole === 'ADMIN' || testUser.expectedRole === 'DEPUTY_ADMIN') {
          const shouldHaveGroupings = apiData.byManager && apiData.byManager.length > 0;
          console.log(`   ${shouldHaveGroupings ? '✅' : '❌'} Группировки: ${shouldHaveGroupings ? 'есть' : 'нет'}`);
        } else if (testUser.expectedRole === 'MANAGER') {
          const shouldNotHaveGroupings = !apiData.byManager || apiData.byManager.length === 0;
          console.log(`   ${shouldNotHaveGroupings ? '✅' : '❌'} Группировки: ${shouldNotHaveGroupings ? 'нет (правильно)' : 'есть (ошибка)'}`);
        }
        
        // Проверяем фильтрацию задач
        if (testUser.expectedRole === 'DEPUTY_ADMIN') {
          console.log(`   🔍 Заместитель должен видеть только свои объекты`);
          console.log(`   📋 Всего задач: ${apiData.total} (должно быть меньше чем у админа)`);
        } else if (testUser.expectedRole === 'MANAGER') {
          console.log(`   🔍 Менеджер должен видеть только свои задачи`);
          console.log(`   📋 Всего задач: ${apiData.total} (должно быть намного меньше)`);
        }
        
      } else {
        console.log(`   ❌ Ошибка API: ${apiResponse.status}`);
      }
      
      console.log('');
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testRoleFiltering();
