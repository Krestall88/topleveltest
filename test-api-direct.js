const fetch = require('node-fetch');

async function testApiDirect() {
  console.log('🧪 ТЕСТИРОВАНИЕ API НАПРЯМУЮ\n');
  
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
      console.log('❌ Ошибка входа админа');
      return;
    }

    const adminData = await loginResponse.json();
    console.log(`   ✅ Вход админа: ${adminData.user.role}`);
    
    const adminCookies = loginResponse.headers.get('set-cookie');

    // Получаем объект менеджера
    console.log('\n🏢 Получаем объект менеджера...');
    const objectsResponse = await fetch('http://localhost:3002/api/objects', {
      headers: { 'Cookie': adminCookies || '' }
    });

    if (!objectsResponse.ok) {
      console.log('❌ Ошибка получения объектов');
      return;
    }

    const objects = await objectsResponse.json();
    const objectWithManager = objects.find(obj => obj.manager);
    
    console.log(`   📊 Всего объектов: ${objects.length}`);
    console.log(`   👥 Объектов с менеджерами: ${objects.filter(obj => obj.manager).length}`);
    
    if (!objectWithManager) {
      console.log('❌ Не найден объект менеджера Шодиевой');
      return;
    }

    console.log(`   🎯 Объект: ${objectWithManager.name}`);
    console.log(`   👤 Менеджер: ${objectWithManager.manager.name}`);

    // Получаем детали объекта
    console.log('\n📋 Получаем детали объекта...');
    const objectDetailResponse = await fetch(`http://localhost:3002/api/objects/${objectWithManager.id}`, {
      headers: { 'Cookie': adminCookies || '' }
    });

    if (objectDetailResponse.ok) {
      const objectDetail = await objectDetailResponse.json();
      console.log(`   🔒 allowManagerEdit: ${objectDetail.allowManagerEdit}`);
      
      // Включаем разрешение редактирования
      console.log('\n🔄 Включаем разрешение редактирования...');
      const toggleResponse = await fetch(`http://localhost:3002/api/objects/${objectWithManager.id}/manager-edit`, {
        method: 'PATCH',
        headers: { 
          'Cookie': adminCookies || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          allowManagerEdit: true
        })
      });

      console.log(`   📊 Статус ответа: ${toggleResponse.status}`);
      
      if (toggleResponse.ok) {
        const updatedObject = await toggleResponse.json();
        console.log(`   ✅ Разрешение обновлено: ${updatedObject.allowManagerEdit}`);
        
        // Тестируем вход менеджера
        console.log('\n👤 Тестируем вход менеджера...');
        const managerLoginResponse = await fetch('http://localhost:3002/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'shodieva.mukharam@cleaning.com',
            password: 'manager123'
          }),
        });

        if (managerLoginResponse.ok) {
          const managerData = await managerLoginResponse.json();
          console.log(`   ✅ Вход менеджера: ${managerData.user.role}`);
          
          const managerCookies = managerLoginResponse.headers.get('set-cookie');
          
          // Проверяем объекты менеджера
          const managerObjectsResponse = await fetch('http://localhost:3002/api/objects', {
            headers: { 'Cookie': managerCookies || '' }
          });
          
          if (managerObjectsResponse.ok) {
            const managerObjects = await managerObjectsResponse.json();
            const managerObject = managerObjects.find(obj => obj.id === objectWithManager.id);
            
            if (managerObject) {
              console.log(`   📊 Менеджер видит объект: ${managerObject.name}`);
              console.log(`   🔒 allowManagerEdit для менеджера: ${managerObject.allowManagerEdit}`);
              
              if (managerObject.allowManagerEdit) {
                console.log(`   ✅ УСПЕХ: Менеджер может редактировать объект!`);
              } else {
                console.log(`   ❌ ПРОБЛЕМА: Разрешение не передается менеджеру`);
              }
            } else {
              console.log(`   ❌ Менеджер НЕ видит объект`);
            }
          }
          
          // Проверяем детали объекта для менеджера
          console.log('\n📋 Проверяем детали объекта для менеджера...');
          const managerObjectDetailResponse = await fetch(`http://localhost:3002/api/objects/${objectWithManager.id}`, {
            headers: { 'Cookie': managerCookies || '' }
          });
          
          if (managerObjectDetailResponse.ok) {
            const managerObjectDetail = await managerObjectDetailResponse.json();
            console.log(`   🔒 allowManagerEdit в деталях: ${managerObjectDetail.allowManagerEdit}`);
          }
        }
        
      } else {
        const errorText = await toggleResponse.text();
        console.log(`   ❌ Ошибка API: ${errorText}`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testApiDirect();
