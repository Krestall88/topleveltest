const fetch = require('node-fetch');

async function testObjectsPage() {
  console.log('🧪 ТЕСТИРОВАНИЕ СТРАНИЦЫ ОБЪЕКТОВ\n');
  
  try {
    // Вход как менеджер
    console.log('👤 Входим как менеджер...');
    
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'shodieva.mukharam@cleaning.com',
        password: 'manager123'
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
      console.log(`   ✅ API работает: role = ${meData.user.role}`);
    } else {
      console.log(`   ❌ Ошибка API: ${meResponse.status}`);
    }

    // Проверяем страницу объектов
    console.log('\n📄 Загружаем страницу объектов...');
    const pageResponse = await fetch('http://localhost:3002/objects', {
      headers: { 
        'Cookie': cookies || '',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (pageResponse.ok) {
      const html = await pageResponse.text();
      
      // Ищем отладочную информацию
      const debugMatch = html.match(/DEBUG: Роль пользователя: ([^<]*)/);
      if (debugMatch) {
        console.log(`   🐛 DEBUG из HTML: "${debugMatch[1]}"`);
      }
      
      // Проверяем заголовки
      const hasMyObjects = html.includes('Мои объекты');
      const hasManageObjects = html.includes('Управление объектами');
      
      console.log(`   📋 Заголовки:`);
      console.log(`      - "Мои объекты": ${hasMyObjects ? '✅' : '❌'}`);
      console.log(`      - "Управление объектами": ${hasManageObjects ? '❌ (не должно быть)' : '✅'}`);
      
      // Проверяем кнопки
      const hasCreateButton = html.includes('+ Создать объект с техкартами');
      const hasQuickAddButton = html.includes('+ Быстрое добавление');
      
      console.log(`   🔘 Кнопки:`);
      console.log(`      - "Создать объект": ${hasCreateButton ? '❌ (должна быть скрыта)' : '✅'}`);
      console.log(`      - "Быстрое добавление": ${hasQuickAddButton ? '❌ (должна быть скрыта)' : '✅'}`);
      
      // Проверяем, есть ли скрипты React
      const hasReactScripts = html.includes('_next/static') || html.includes('__NEXT_DATA__');
      console.log(`   ⚛️  React загружен: ${hasReactScripts ? '✅' : '❌'}`);
      
    } else {
      console.log(`   ❌ Ошибка загрузки страницы: ${pageResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testObjectsPage();
