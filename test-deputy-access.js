const fetch = require('node-fetch');

async function testDeputyAccess() {
  console.log('🧪 ТЕСТИРОВАНИЕ ДОСТУПА ЗАМЕСТИТЕЛЯ К СТРАНИЦАМ\n');
  
  try {
    // 1. Вход как заместитель
    console.log('🔐 Вход как заместитель...');
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nikita@cleaning.com',
        password: 'deputy123456' // Попробуем стандартный пароль
      }),
    });

    if (!loginResponse.ok) {
      console.log('❌ Ошибка входа заместителя:', loginResponse.status);
      console.log('Попробуем создать заместителя...');
      
      // Сначала войдем как админ
      const adminLoginResponse = await fetch('http://localhost:3002/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@cleaning.com',
          password: 'admin123'
        }),
      });

      if (adminLoginResponse.ok) {
        const adminCookies = adminLoginResponse.headers.get('set-cookie');
        
        // Создаем заместителя
        const createResponse = await fetch('http://localhost:3002/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': adminCookies || ''
          },
          body: JSON.stringify({
            email: 'test.deputy@cleaning.com',
            name: 'Тестовый Заместитель',
            password: 'deputy123456',
            role: 'DEPUTY_ADMIN',
            phone: '+7 (999) 123-45-67',
            assignedObjectIds: [] // Пока без объектов
          })
        });

        if (createResponse.ok) {
          console.log('✅ Заместитель создан');
          
          // Пробуем войти снова
          const deputyLoginResponse = await fetch('http://localhost:3002/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test.deputy@cleaning.com',
              password: 'deputy123456'
            }),
          });

          if (deputyLoginResponse.ok) {
            const deputyData = await deputyLoginResponse.json();
            console.log(`✅ Заместитель вошел: ${deputyData.user.name}`);
            
            const deputyCookies = deputyLoginResponse.headers.get('set-cookie');
            await testPages(deputyCookies);
          }
        }
      }
      return;
    }

    const deputyData = await loginResponse.json();
    console.log(`✅ Заместитель вошел: ${deputyData.user.name}`);
    
    const deputyCookies = loginResponse.headers.get('set-cookie');
    await testPages(deputyCookies);
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

async function testPages(cookies) {
  const pages = [
    { name: 'Дашборд', url: '/' },
    { name: 'Объекты', url: '/objects' },
    { name: 'Менеджеры', url: '/managers' },
    { name: 'Календарь', url: '/manager-calendar' },
    { name: 'Инвентарь', url: '/inventory' },
    { name: 'Администраторы', url: '/admin' }
  ];

  console.log('\n📋 Тестирование доступа к страницам:');
  
  for (const page of pages) {
    try {
      const response = await fetch(`http://localhost:3002${page.url}`, {
        headers: { 'Cookie': cookies || '' },
        redirect: 'manual' // Не следуем редиректам
      });
      
      let status = '';
      if (response.status === 200) {
        status = '✅ Доступ разрешен';
      } else if (response.status === 302 || response.status === 301) {
        const location = response.headers.get('location');
        status = `🔄 Редирект на: ${location}`;
      } else if (response.status === 403) {
        status = '🚫 Доступ запрещен';
      } else {
        status = `❓ Статус: ${response.status}`;
      }
      
      console.log(`   ${page.name}: ${status}`);
      
    } catch (error) {
      console.log(`   ${page.name}: ❌ Ошибка: ${error.message}`);
    }
  }

  // Тестируем API
  console.log('\n🔌 Тестирование API:');
  
  const apis = [
    { name: 'Менеджеры API', url: '/api/managers' },
    { name: 'Инвентарь API', url: '/api/inventory' },
    { name: 'Календарь API', url: '/api/tasks/calendar-unified' }
  ];

  for (const api of apis) {
    try {
      const response = await fetch(`http://localhost:3002${api.url}`, {
        headers: { 'Cookie': cookies || '' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ${api.name}: ✅ Работает (записей: ${Array.isArray(data) ? data.length : 'объект'})`);
      } else {
        console.log(`   ${api.name}: ❌ Ошибка ${response.status}`);
      }
      
    } catch (error) {
      console.log(`   ${api.name}: ❌ Ошибка: ${error.message}`);
    }
  }
}

testDeputyAccess();
