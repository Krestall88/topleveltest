const fetch = require('node-fetch');

async function testManagerRestrictions() {
  console.log('🧪 ТЕСТИРОВАНИЕ ОГРАНИЧЕНИЙ МЕНЕДЖЕРА\n');
  
  try {
    // Вход как менеджер
    console.log('👤 Входим как менеджер Шодиева...');
    
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'shodieva.mukharam@cleaning.com',
        password: 'manager123'
      }),
    });

    if (!loginResponse.ok) {
      console.log('❌ Ошибка входа менеджера');
      return;
    }

    const userData = await loginResponse.json();
    console.log(`   ✅ Вход успешен: ${userData.user.role}`);
    
    const cookies = loginResponse.headers.get('set-cookie');

    // 1. Проверяем календарь
    console.log('\n📅 ТЕСТИРУЕМ КАЛЕНДАРЬ:');
    const calendarResponse = await fetch('http://localhost:3002/api/tasks/calendar-unified', {
      headers: { 'Cookie': cookies || '' }
    });

    if (calendarResponse.ok) {
      const calendarData = await calendarResponse.json();
      
      console.log(`   📊 API календаря:`);
      console.log(`      - userRole: ${calendarData.userRole}`);
      console.log(`      - total: ${calendarData.total}`);
      console.log(`      - byManager: ${calendarData.byManager?.length || 0}`);
      console.log(`      - byObject: ${calendarData.byObject?.length || 0}`);
      
      if (calendarData.byManager && calendarData.byManager.length > 0) {
        console.log(`   ✅ ИСПРАВЛЕНО: Менеджер видит группировки (${calendarData.byManager.length} менеджеров)`);
      } else {
        console.log(`   ❌ ПРОБЛЕМА: Менеджер не видит группировки`);
      }
    } else {
      console.log(`   ❌ Ошибка API календаря: ${calendarResponse.status}`);
    }

    // 2. Проверяем страницу объектов
    console.log('\n🏢 ТЕСТИРУЕМ СТРАНИЦУ ОБЪЕКТОВ:');
    const objectsPageResponse = await fetch('http://localhost:3002/objects', {
      headers: { 'Cookie': cookies || '' }
    });

    if (objectsPageResponse.ok) {
      const html = await objectsPageResponse.text();
      
      // Проверяем наличие кнопок, которые должны быть скрыты
      const hasCreateButton = html.includes('+ Создать объект с техкартами');
      const hasQuickAddButton = html.includes('+ Быстрое добавление');
      const hasEditButton = html.includes('Редактировать');
      const hasDeleteButton = html.includes('Удалить');
      const hasMyObjectsTitle = html.includes('Мои объекты');
      const hasManageObjectsTitle = html.includes('Управление объектами');
      
      console.log(`   📄 HTML страницы объектов:`);
      console.log(`      - "Мои объекты": ${hasMyObjectsTitle ? '✅' : '❌'}`);
      console.log(`      - "Управление объектами": ${hasManageObjectsTitle ? '❌ (должно быть скрыто)' : '✅'}`);
      console.log(`      - Кнопка "Создать объект": ${hasCreateButton ? '❌ (должна быть скрыта)' : '✅'}`);
      console.log(`      - Кнопка "Быстрое добавление": ${hasQuickAddButton ? '❌ (должна быть скрыта)' : '✅'}`);
      console.log(`      - Кнопки "Редактировать": ${hasEditButton ? '❌ (должны быть скрыты)' : '✅'}`);
      console.log(`      - Кнопки "Удалить": ${hasDeleteButton ? '❌ (должны быть скрыты)' : '✅'}`);
      
      if (hasCreateButton || hasQuickAddButton || hasEditButton || hasDeleteButton) {
        console.log(`   ❌ ПРОБЛЕМА: Менеджер видит кнопки, которые должны быть скрыты!`);
      } else {
        console.log(`   ✅ ХОРОШО: Кнопки управления скрыты для менеджера`);
      }
    } else {
      console.log(`   ❌ Ошибка загрузки страницы объектов: ${objectsPageResponse.status}`);
    }

    // 3. Проверяем API /api/auth/me
    console.log('\n👤 ПРОВЕРЯЕМ API ПОЛЬЗОВАТЕЛЯ:');
    const meResponse = await fetch('http://localhost:3002/api/auth/me', {
      headers: { 'Cookie': cookies || '' }
    });

    if (meResponse.ok) {
      const meData = await meResponse.json();
      console.log(`   📊 API /api/auth/me:`);
      console.log(`      - role: ${meData.user.role}`);
      console.log(`      - name: ${meData.user.name}`);
      console.log(`      - email: ${meData.user.email}`);
    } else {
      console.log(`   ❌ Ошибка API /api/auth/me: ${meResponse.status}`);
    }

    // 4. Проверяем объекты менеджера
    console.log('\n🏢 ПРОВЕРЯЕМ ОБЪЕКТЫ МЕНЕДЖЕРА:');
    const objectsApiResponse = await fetch('http://localhost:3002/api/objects', {
      headers: { 'Cookie': cookies || '' }
    });

    if (objectsApiResponse.ok) {
      const objects = await objectsApiResponse.json();
      console.log(`   📊 API /api/objects:`);
      console.log(`      - Количество объектов: ${objects.length}`);
      
      if (objects.length > 0) {
        console.log(`   📋 Объекты менеджера:`);
        objects.forEach((obj, index) => {
          console.log(`      ${index + 1}. ${obj.name}`);
        });
      }
    } else {
      console.log(`   ❌ Ошибка API объектов: ${objectsApiResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testManagerRestrictions();
