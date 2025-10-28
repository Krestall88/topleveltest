const fetch = require('node-fetch');

async function testManagerAccess() {
  console.log('🧪 ТЕСТИРОВАНИЕ ДОСТУПА МЕНЕДЖЕРА\n');
  
  try {
    // Сначала включаем разрешение как админ
    console.log('👤 Входим как админ для настройки разрешения...');
    
    const adminLoginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@cleaning.com',
        password: 'admin123'
      }),
    });

    if (!adminLoginResponse.ok) {
      console.log('❌ Ошибка входа админа');
      return;
    }

    const adminData = await adminLoginResponse.json();
    console.log(`   ✅ Вход админа: ${adminData.user.role}`);
    
    const adminCookies = adminLoginResponse.headers.get('set-cookie');

    // Получаем объект с менеджером
    const objectsResponse = await fetch('http://localhost:3002/api/objects', {
      headers: { 'Cookie': adminCookies || '' }
    });

    if (!objectsResponse.ok) {
      console.log('❌ Ошибка получения объектов');
      return;
    }

    const objects = await objectsResponse.json();
    const objectWithManager = objects.find(obj => obj.manager);
    
    if (!objectWithManager) {
      console.log('❌ Не найден объект с менеджером');
      return;
    }

    console.log(`   🎯 Объект: ${objectWithManager.name}`);
    console.log(`   👤 Менеджер: ${objectWithManager.manager.name}`);
    console.log(`   🔒 Текущее разрешение: ${objectWithManager.allowManagerEdit}`);

    // Включаем разрешение редактирования
    console.log('\n🔄 Включаем разрешение редактирования...');
    const enableResponse = await fetch(`http://localhost:3002/api/objects/${objectWithManager.id}/manager-edit`, {
      method: 'PATCH',
      headers: { 
        'Cookie': adminCookies || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        allowManagerEdit: true
      })
    });

    if (!enableResponse.ok) {
      console.log('❌ Ошибка включения разрешения');
      return;
    }

    const updatedObject = await enableResponse.json();
    console.log(`   ✅ Разрешение включено: ${updatedObject.allowManagerEdit}`);

    // Теперь тестируем доступ менеджера
    console.log('\n👤 Тестируем доступ менеджера...');
    const managerLoginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: objectWithManager.manager.email || 'shodieva.mukharam@cleaning.com',
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
    } else {
      console.log(`   ❌ Ошибка входа менеджера`);
    }

    // Тестируем отключение разрешения
    console.log('\n🔄 Отключаем разрешение редактирования...');
    const disableResponse = await fetch(`http://localhost:3002/api/objects/${objectWithManager.id}/manager-edit`, {
      method: 'PATCH',
      headers: { 
        'Cookie': adminCookies || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        allowManagerEdit: false
      })
    });

    if (disableResponse.ok) {
      const disabledObject = await disableResponse.json();
      console.log(`   ✅ Разрешение отключено: ${disabledObject.allowManagerEdit}`);
      
      // Проверяем, что менеджер больше не может редактировать
      const managerObjectsResponse2 = await fetch('http://localhost:3002/api/objects', {
        headers: { 'Cookie': managerCookies || '' }
      });
      
      if (managerObjectsResponse2.ok) {
        const managerObjects2 = await managerObjectsResponse2.json();
        const managerObject2 = managerObjects2.find(obj => obj.id === objectWithManager.id);
        
        if (managerObject2) {
          console.log(`   🔒 allowManagerEdit после отключения: ${managerObject2.allowManagerEdit}`);
          
          if (!managerObject2.allowManagerEdit) {
            console.log(`   ✅ УСПЕХ: Разрешение корректно отключено!`);
          } else {
            console.log(`   ❌ ПРОБЛЕМА: Разрешение не отключилось`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testManagerAccess();
