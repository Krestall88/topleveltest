const fetch = require('node-fetch');

async function testSimple() {
  console.log('🧪 ПРОСТОЙ ТЕСТ API\n');
  
  try {
    // Проверяем, работает ли сервер
    console.log('🔍 Проверяем сервер...');
    const healthResponse = await fetch('http://localhost:3002/api/auth/me');
    console.log(`   📊 Статус: ${healthResponse.status}`);
    
    if (healthResponse.status === 401) {
      console.log('   ✅ Сервер работает (требует авторизации)');
    } else {
      console.log('   ❌ Неожиданный статус сервера');
    }

    // Тестируем вход
    console.log('\n👤 Тестируем вход...');
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@cleaning.com',
        password: 'admin123'
      }),
    });

    console.log(`   📊 Статус входа: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log(`   ✅ Успешный вход: ${loginData.user?.role || 'роль не определена'}`);
      
      const cookies = loginResponse.headers.get('set-cookie');
      console.log(`   🍪 Cookies: ${cookies ? 'получены' : 'не получены'}`);
      
      // Тестируем получение объектов
      console.log('\n🏢 Тестируем получение объектов...');
      const objectsResponse = await fetch('http://localhost:3002/api/objects', {
        headers: { 'Cookie': cookies || '' }
      });
      
      console.log(`   📊 Статус объектов: ${objectsResponse.status}`);
      
      if (objectsResponse.ok) {
        const objects = await objectsResponse.json();
        console.log(`   📋 Количество объектов: ${objects.length}`);
        
        const objectWithManager = objects.find(obj => obj.manager);
        if (objectWithManager) {
          console.log(`   🎯 Объект с менеджером: ${objectWithManager.name}`);
          console.log(`   👤 Менеджер: ${objectWithManager.manager.name}`);
          console.log(`   🔒 allowManagerEdit: ${objectWithManager.allowManagerEdit}`);
          
          // Тестируем получение деталей объекта
          console.log('\n📋 Тестируем детали объекта...');
          const detailResponse = await fetch(`http://localhost:3002/api/objects/${objectWithManager.id}`, {
            headers: { 'Cookie': cookies || '' }
          });
          
          console.log(`   📊 Статус деталей: ${detailResponse.status}`);
          
          if (detailResponse.ok) {
            const detail = await detailResponse.json();
            console.log(`   🔒 allowManagerEdit в деталях: ${detail.allowManagerEdit}`);
            
            // Тестируем переключение разрешения
            console.log('\n🔄 Тестируем переключение разрешения...');
            const toggleResponse = await fetch(`http://localhost:3002/api/objects/${objectWithManager.id}/manager-edit`, {
              method: 'PATCH',
              headers: { 
                'Cookie': cookies || '',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                allowManagerEdit: !detail.allowManagerEdit
              })
            });
            
            console.log(`   📊 Статус переключения: ${toggleResponse.status}`);
            
            if (toggleResponse.ok) {
              const updatedObject = await toggleResponse.json();
              console.log(`   ✅ Разрешение обновлено: ${updatedObject.allowManagerEdit}`);
            } else {
              const errorText = await toggleResponse.text();
              console.log(`   ❌ Ошибка переключения: ${errorText}`);
            }
          }
        }
      }
    } else {
      const errorText = await loginResponse.text();
      console.log(`   ❌ Ошибка входа: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testSimple();
