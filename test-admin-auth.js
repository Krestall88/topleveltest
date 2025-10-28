const fetch = require('node-fetch');

async function testAdminAuth() {
  console.log('🔍 ТЕСТИРОВАНИЕ АВТОРИЗАЦИИ НА СТРАНИЦЕ /admin\n');
  
  try {
    // 1. Вход как администратор
    console.log('🔐 Вход как администратор...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@cleaning.com',
        password: 'admin123'
      }),
    });

    if (!loginResponse.ok) {
      console.log('❌ Ошибка входа:', loginResponse.status);
      return;
    }

    const loginData = await loginResponse.json();
    console.log(`✅ Вход успешен! ${loginData.user?.name || loginData.name} (${loginData.user?.role || loginData.role})`);
    
    const cookies = loginResponse.headers.get('set-cookie');

    // 2. Проверяем API /api/auth/me
    console.log('\n👤 Проверяем API /api/auth/me...');
    const meResponse = await fetch('http://localhost:3000/api/auth/me', {
      headers: { 'Cookie': cookies || '' }
    });

    if (meResponse.ok) {
      const meData = await meResponse.json();
      console.log('✅ API /api/auth/me работает');
      console.log('📋 Структура ответа:', JSON.stringify(meData, null, 2));
      
      if (meData.role === 'ADMIN') {
        console.log('✅ Роль ADMIN подтверждена');
      } else {
        console.log(`❌ Неожиданная роль: ${meData.role}`);
      }
    } else {
      console.log(`❌ Ошибка API /api/auth/me: ${meResponse.status}`);
      const errorText = await meResponse.text();
      console.log('Ошибка:', errorText);
    }

    // 3. Проверяем доступ к странице /admin через API
    console.log('\n🏠 Проверяем доступ к странице /admin...');
    const adminPageResponse = await fetch('http://localhost:3000/admin', {
      headers: { 'Cookie': cookies || '' },
      redirect: 'manual' // Не следуем редиректам автоматически
    });

    console.log(`📊 Статус ответа страницы /admin: ${adminPageResponse.status}`);
    
    if (adminPageResponse.status === 200) {
      console.log('✅ Страница /admin доступна');
    } else if (adminPageResponse.status >= 300 && adminPageResponse.status < 400) {
      const location = adminPageResponse.headers.get('location');
      console.log(`🔄 Редирект на: ${location}`);
    } else {
      console.log(`❌ Ошибка доступа к странице: ${adminPageResponse.status}`);
    }

    console.log('\n🎯 РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ:');
    console.log('- Если API /api/auth/me возвращает пользователя напрямую (без обертки user), то проблема исправлена');
    console.log('- Если роль ADMIN подтверждена, то доступ к странице должен работать');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testAdminAuth();
