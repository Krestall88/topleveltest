const fetch = require('node-fetch');

async function testMenuFix() {
  console.log('🧪 ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЯ МЕНЮ\n');
  
  try {
    // Вход как админ
    console.log('👤 Входим как админ...');
    
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@cleaning.com',
        password: 'admin123'
      }),
    });

    if (!loginResponse.ok) {
      console.log('❌ Ошибка входа');
      return;
    }

    const userData = await loginResponse.json();
    console.log(`   ✅ Вход успешен: ${userData.user.role}`);
    
    const cookies = loginResponse.headers.get('set-cookie');

    // Проверяем API /api/auth/me
    console.log('\n🔍 Проверяем API /api/auth/me:');
    const meResponse = await fetch('http://localhost:3002/api/auth/me', {
      headers: { 'Cookie': cookies || '' }
    });

    if (meResponse.ok) {
      const meData = await meResponse.json();
      console.log(`   ✅ API работает:`);
      console.log(`      - Структура: ${meData.user ? '{ user: {...} }' : 'прямой объект'}`);
      console.log(`      - role: ${meData.user?.role || meData.role}`);
      console.log(`      - name: ${meData.user?.name || meData.name}`);
    } else {
      console.log(`   ❌ Ошибка API: ${meResponse.status}`);
    }

    // Проверяем главную страницу
    console.log('\n📄 Загружаем главную страницу...');
    const pageResponse = await fetch('http://localhost:3002/', {
      headers: { 
        'Cookie': cookies || '',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (pageResponse.ok) {
      const html = await pageResponse.text();
      
      // Проверяем наличие элементов меню
      const hasObjectsMenu = html.includes('🏢') && html.includes('Объекты');
      const hasCalendarMenu = html.includes('📅') && html.includes('Календарь');
      const hasAdminMenu = html.includes('⚙️') && html.includes('Администрирование');
      const hasLogoutButton = html.includes('Выход') || html.includes('logout');
      
      console.log(`   📋 Элементы меню:`);
      console.log(`      - Объекты: ${hasObjectsMenu ? '✅' : '❌'}`);
      console.log(`      - Календарь: ${hasCalendarMenu ? '✅' : '❌'}`);
      console.log(`      - Администрирование: ${hasAdminMenu ? '✅' : '❌'}`);
      console.log(`      - Кнопка выхода: ${hasLogoutButton ? '✅' : '❌'}`);
      
      if (hasObjectsMenu && hasCalendarMenu && hasAdminMenu) {
        console.log(`   ✅ ИСПРАВЛЕНО: Меню отображается правильно!`);
      } else {
        console.log(`   ❌ ПРОБЛЕМА: Меню все еще не отображается`);
      }
      
    } else {
      console.log(`   ❌ Ошибка загрузки страницы: ${pageResponse.status}`);
    }

    // Тестируем менеджера
    console.log('\n👤 Тестируем менеджера...');
    
    const managerLogin = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'shodieva.mukharam@cleaning.com',
        password: 'manager123'
      }),
    });

    if (managerLogin.ok) {
      const managerData = await managerLogin.json();
      console.log(`   ✅ Вход менеджера: ${managerData.user.role}`);
      
      const managerCookies = managerLogin.headers.get('set-cookie');
      
      const managerMeResponse = await fetch('http://localhost:3002/api/auth/me', {
        headers: { 'Cookie': managerCookies || '' }
      });
      
      if (managerMeResponse.ok) {
        const managerMeData = await managerMeResponse.json();
        console.log(`   📊 API менеджера: role = ${managerMeData.user.role}`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testMenuFix();
