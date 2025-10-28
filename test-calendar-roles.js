const fetch = require('node-fetch');

async function testCalendarRoles() {
  console.log('🧪 ТЕСТИРОВАНИЕ КАЛЕНДАРЯ ДЛЯ РАЗНЫХ РОЛЕЙ\n');
  
  try {
    // Тестируем разные роли
    const testUsers = [
      { name: 'Админ', email: 'admin@cleaning.com', password: 'admin123', expectedView: 'admin' },
      { name: 'Заместитель', email: 'test.deputy.calendar@cleaning.com', password: 'deputy123456', expectedView: 'admin' },
      { name: 'Менеджер', email: 'kobzeva.anna@cleaning.com', password: 'manager123', expectedView: 'manager' }
    ];

    for (const testUser of testUsers) {
      console.log(`👤 Тестируем роль: ${testUser.name}`);
      
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
        console.log(`   📊 API userRole: ${apiData.userRole}`);
        console.log(`   📋 Данные: ${apiData.total || 0} задач, ${apiData.byManager?.length || 0} менеджеров`);
        
        // Проверяем ожидаемое поведение
        if (testUser.expectedView === 'admin') {
          if (apiData.userRole === 'ADMIN' || apiData.userRole === 'DEPUTY_ADMIN') {
            console.log(`   ✅ Правильно: видит админ-версию календаря`);
          } else {
            console.log(`   ❌ Ошибка: должен видеть админ-версию, но userRole = ${apiData.userRole}`);
          }
        } else {
          if (apiData.userRole === 'MANAGER') {
            console.log(`   ✅ Правильно: видит менеджер-версию календаря`);
          } else {
            console.log(`   ❌ Ошибка: должен видеть менеджер-версию, но userRole = ${apiData.userRole}`);
          }
        }
      } else {
        console.log(`   ❌ Ошибка API: ${apiResponse.status}`);
      }

      // Проверяем HTML страницы
      const pageResponse = await fetch('http://localhost:3002/manager-calendar', {
        headers: { 'Cookie': cookies || '' }
      });

      if (pageResponse.ok) {
        const html = await pageResponse.text();
        
        // Ищем характерные элементы
        const hasManagerTabs = html.includes('По менеджерам') && html.includes('По объектам');
        const hasStatusTabs = html.includes('Просроченные') && html.includes('Текущие') && html.includes('Выполненные');
        
        console.log(`   📄 HTML содержит:`);
        console.log(`      - Вкладки "По менеджерам/объектам": ${hasManagerTabs ? '✅' : '❌'}`);
        console.log(`      - Вкладки "Просроченные/Текущие": ${hasStatusTabs ? '✅' : '❌'}`);
        
        if (testUser.expectedView === 'admin' && hasManagerTabs && !hasStatusTabs) {
          console.log(`   ✅ Календарь отображается правильно для админ-роли`);
        } else if (testUser.expectedView === 'manager' && !hasManagerTabs && hasStatusTabs) {
          console.log(`   ✅ Календарь отображается правильно для менеджер-роли`);
        } else {
          console.log(`   ⚠️  Возможно неправильное отображение календаря`);
        }
      }
      
      console.log('');
    }

    console.log('🎯 ИТОГИ ТЕСТИРОВАНИЯ:');
    console.log('✅ Админ должен видеть: группировку по менеджерам/объектам');
    console.log('✅ Заместитель должен видеть: группировку по менеджерам/объектам (как админ)');
    console.log('✅ Менеджер должен видеть: задачи по статусам (просроченные/текущие/выполненные)');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testCalendarRoles();
