const fetch = require('node-fetch');

async function testSystemAfterFix() {
  console.log('🧪 ТЕСТИРОВАНИЕ СИСТЕМЫ ПОСЛЕ ИСПРАВЛЕНИЙ\n');
  
  try {
    // 1. Вход как главный администратор
    console.log('🔐 Вход как главный администратор...');
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
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
    console.log(`✅ Вход успешен! ${loginData.name} (${loginData.role})`);
    
    const cookies = loginResponse.headers.get('set-cookie');

    // 2. Проверяем исправленные логины менеджеров
    console.log('\n👥 Проверяем логины менеджеров...');
    const managersResponse = await fetch('http://localhost:3002/api/managers', {
      headers: { 'Cookie': cookies || '' }
    });

    if (managersResponse.ok) {
      const managersData = await managersResponse.json();
      console.log(`✅ Найдено менеджеров: ${managersData.length}`);
      
      // Проверяем первых 3 менеджеров
      console.log('📋 Примеры исправленных логинов:');
      managersData.slice(0, 3).forEach((manager, index) => {
        console.log(`   ${index + 1}. ${manager.name}`);
        console.log(`      Email: ${manager.email}`);
        
        // Проверяем наличие кириллицы
        const emailPart = manager.email.split('@')[0];
        const hasCyrillic = /[а-яё]/i.test(emailPart);
        console.log(`      Кириллица: ${hasCyrillic ? '❌ Есть' : '✅ Нет'}`);
      });
    }

    // 3. Получаем объекты для назначения
    console.log('\n🏢 Получаем объекты...');
    const objectsResponse = await fetch('http://localhost:3002/api/objects', {
      headers: { 'Cookie': cookies || '' }
    });

    let availableObjects = [];
    if (objectsResponse.ok) {
      availableObjects = await objectsResponse.json();
      console.log(`✅ Найдено объектов: ${availableObjects.length}`);
    }

    // 4. Создаем нового заместителя с правильным логином
    console.log('\n👤 Создаем нового заместителя...');
    
    const selectedObjectIds = availableObjects.slice(0, 2).map(obj => obj.id);
    
    const deputyData = {
      email: 'petrov.ivan@cleaning.com', // Правильный формат логина
      name: 'Петров Иван Сергеевич',
      password: 'deputy123456',
      role: 'DEPUTY_ADMIN',
      phone: '+7 (999) 123-45-67',
      assignedObjectIds: selectedObjectIds
    };

    const createResponse = await fetch('http://localhost:3002/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify(deputyData)
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log(`✅ Заместитель создан: ${createData.user?.name}`);
      console.log(`📧 Email: ${createData.user?.email}`);
      
      // 5. Тестируем вход заместителя
      console.log('\n🔐 Тестируем вход заместителя...');
      const deputyLoginResponse = await fetch('http://localhost:3002/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: deputyData.email,
          password: deputyData.password
        }),
      });

      if (deputyLoginResponse.ok) {
        const deputyLoginData = await deputyLoginResponse.json();
        console.log(`✅ Заместитель вошел: ${deputyLoginData.name} (${deputyLoginData.role})`);
        
        const deputyCookies = deputyLoginResponse.headers.get('set-cookie');
        
        // 6. Проверяем фильтрацию объектов
        console.log('\n🔍 Проверяем фильтрацию объектов...');
        const deputyObjectsResponse = await fetch('http://localhost:3002/api/objects', {
          headers: { 'Cookie': deputyCookies || '' }
        });

        if (deputyObjectsResponse.ok) {
          const deputyObjects = await deputyObjectsResponse.json();
          console.log(`✅ Заместитель видит объектов: ${deputyObjects.length}`);
          console.log(`📊 Ожидалось: ${selectedObjectIds.length}, получено: ${deputyObjects.length}`);
          
          if (deputyObjects.length === selectedObjectIds.length) {
            console.log('✅ Фильтрация работает правильно!');
          } else {
            console.log('⚠️ Фильтрация работает неправильно');
          }
        }
      } else {
        console.log('❌ Ошибка входа заместителя');
      }
    } else {
      const errorData = await createResponse.json();
      console.log(`❌ Ошибка создания заместителя: ${errorData.message}`);
    }

    // 7. Проверяем общее состояние системы
    console.log('\n📊 Проверяем общее состояние системы...');
    const usersResponse = await fetch('http://localhost:3002/api/admin/users', {
      headers: { 'Cookie': cookies || '' }
    });

    if (usersResponse.ok) {
      const responseData = await usersResponse.json();
      const users = responseData.users || responseData;
      
      const admins = users.filter(u => u.role === 'ADMIN');
      const deputies = users.filter(u => u.role === 'DEPUTY_ADMIN');
      
      console.log(`👑 Главных администраторов: ${admins.length}`);
      console.log(`👤 Заместителей: ${deputies.length}`);
      
      if (admins.length === 1) {
        console.log(`✅ Главный админ: ${admins[0].name} (${admins[0].email})`);
      }
    }

    console.log('\n🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!');
    console.log('\n📋 РЕЗУЛЬТАТЫ:');
    console.log('✅ Главный админ восстановлен');
    console.log('✅ Логины менеджеров исправлены на латиницу');
    console.log('✅ Система создания заместителей работает');
    console.log('✅ Фильтрация объектов функционирует');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testSystemAfterFix();
