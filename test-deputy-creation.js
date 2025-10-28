const fetch = require('node-fetch');

async function testDeputyCreation() {
  console.log('🎯 ТЕСТИРОВАНИЕ СОЗДАНИЯ ЗАМЕСТИТЕЛЯ АДМИНИСТРАТОРА\n');
  
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

    // 2. Получаем список объектов
    console.log('\n📋 Получаем список объектов...');
    const objectsResponse = await fetch('http://localhost:3002/api/objects', {
      headers: { 'Cookie': cookies || '' }
    });

    let availableObjects = [];
    if (objectsResponse.ok) {
      availableObjects = await objectsResponse.json();
      console.log(`✅ Найдено объектов: ${availableObjects.length}`);
    }

    if (availableObjects.length === 0) {
      console.log('❌ Нет доступных объектов для назначения');
      return;
    }

    // 3. Создаем заместителя администратора
    console.log('\n👤 Создаем заместителя администратора...');
    
    const selectedObjectIds = availableObjects.slice(0, 3).map(obj => obj.id); // Берем первые 3 объекта
    
    const deputyData = {
      email: `deputy${Date.now()}@cleaning.com`,
      name: 'Тестовый Заместитель Новый',
      password: 'deputy123456',
      role: 'DEPUTY_ADMIN',
      phone: '+7 (999) 888-77-66',
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
      console.log(`📧 Логин: ${createData.user?.email}`);
      console.log(`🔑 Пароль: ${deputyData.password}`);
      
      // 4. Тестируем вход заместителя
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
        
        // 5. Проверяем фильтрацию объектов для заместителя
        console.log('\n🔍 Проверяем фильтрацию объектов для заместителя...');
        const deputyObjectsResponse = await fetch('http://localhost:3002/api/objects', {
          headers: { 'Cookie': deputyCookies || '' }
        });

        if (deputyObjectsResponse.ok) {
          const deputyObjects = await deputyObjectsResponse.json();
          console.log(`✅ Заместитель видит объектов: ${deputyObjects.length}`);
          console.log(`📊 Ожидалось: ${selectedObjectIds.length}, получено: ${deputyObjects.length}`);
          
          if (deputyObjects.length === selectedObjectIds.length) {
            console.log('✅ Фильтрация работает правильно!');
            
            // Показываем какие объекты видит заместитель
            console.log('\n📋 Объекты доступные заместителю:');
            deputyObjects.forEach((obj, index) => {
              console.log(`   ${index + 1}. ${obj.name}`);
            });
            
          } else {
            console.log('⚠️ Фильтрация работает неправильно');
          }
        } else {
          console.log(`❌ Ошибка получения объектов заместителем: ${deputyObjectsResponse.status}`);
        }
        
        // 6. Проверяем доступ к странице /admin для заместителя
        console.log('\n🚫 Проверяем доступ к странице /admin для заместителя...');
        const deputyAdminResponse = await fetch('http://localhost:3002/admin', {
          headers: { 'Cookie': deputyCookies || '' },
          redirect: 'manual'
        });
        
        console.log(`📊 Статус доступа к /admin: ${deputyAdminResponse.status}`);
        if (deputyAdminResponse.status === 200) {
          console.log('⚠️ Заместитель имеет доступ к странице администраторов (нужно исправить)');
        } else {
          console.log('✅ Заместитель не имеет доступа к странице администраторов');
        }
        
      } else {
        console.log(`❌ Ошибка входа заместителя: ${deputyLoginResponse.status}`);
      }
      
    } else {
      const errorData = await createResponse.json();
      console.log(`❌ Ошибка создания заместителя: ${errorData.message}`);
    }

    console.log('\n🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testDeputyCreation();
