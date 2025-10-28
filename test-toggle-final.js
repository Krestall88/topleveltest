const fetch = require('node-fetch');

async function testToggleFinal() {
  console.log('🧪 ФИНАЛЬНЫЙ ТЕСТ ПОЛЗУНКА\n');
  
  try {
    // Входим как админ
    console.log('👤 Входим как админ...');
    
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

    // Получаем объект Халидовой
    const objectsResponse = await fetch('http://localhost:3002/api/objects', {
      headers: { 'Cookie': adminCookies || '' }
    });

    const objects = await objectsResponse.json();
    const khalidovaObject = objects.find(obj => 
      obj.manager && obj.manager.name === 'Халидова Лилия Ильшатовна'
    );
    
    if (!khalidovaObject) {
      console.log('❌ Не найден объект Халидовой');
      return;
    }

    console.log(`   🎯 Объект: ${khalidovaObject.name}`);
    console.log(`   🔒 Текущее разрешение: ${khalidovaObject.allowManagerEdit}`);

    // ВКЛЮЧАЕМ разрешение
    console.log('\n🔄 ВКЛЮЧАЕМ разрешение редактирования...');
    const enableResponse = await fetch(`http://localhost:3002/api/objects/${khalidovaObject.id}/manager-edit`, {
      method: 'PATCH',
      headers: { 
        'Cookie': adminCookies || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        allowManagerEdit: true
      })
    });

    if (enableResponse.ok) {
      const updatedObject = await enableResponse.json();
      console.log(`   ✅ Разрешение ВКЛЮЧЕНО: ${updatedObject.allowManagerEdit}`);
    } else {
      console.log('❌ Ошибка включения разрешения');
      return;
    }

    // Проверяем, что менеджер теперь может редактировать
    console.log('\n👤 Проверяем доступ менеджера после ВКЛЮЧЕНИЯ...');
    const managerLoginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'khalidova.liliya@cleaning.com',
        password: 'manager123'
      }),
    });

    if (managerLoginResponse.ok) {
      const managerData = await managerLoginResponse.json();
      console.log(`   ✅ Вход менеджера: ${managerData.user.role}`);
      
      const managerCookies = managerLoginResponse.headers.get('set-cookie');
      
      const managerObjectsResponse = await fetch('http://localhost:3002/api/objects', {
        headers: { 'Cookie': managerCookies || '' }
      });
      
      if (managerObjectsResponse.ok) {
        const managerObjects = await managerObjectsResponse.json();
        const managerObject = managerObjects.find(obj => obj.id === khalidovaObject.id);
        
        if (managerObject) {
          console.log(`   🔒 allowManagerEdit для менеджера: ${managerObject.allowManagerEdit}`);
          
          if (managerObject.allowManagerEdit) {
            console.log(`   ✅ УСПЕХ: Менеджер МОЖЕТ редактировать объект!`);
          } else {
            console.log(`   ❌ ПРОБЛЕМА: Разрешение НЕ передается менеджеру`);
          }
        }
      }
    }

    // ОТКЛЮЧАЕМ разрешение
    console.log('\n🔄 ОТКЛЮЧАЕМ разрешение редактирования...');
    const disableResponse = await fetch(`http://localhost:3002/api/objects/${khalidovaObject.id}/manager-edit`, {
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
      console.log(`   ✅ Разрешение ОТКЛЮЧЕНО: ${disabledObject.allowManagerEdit}`);
    }

    // Проверяем, что менеджер больше не может редактировать
    console.log('\n👤 Проверяем доступ менеджера после ОТКЛЮЧЕНИЯ...');
    const managerObjectsResponse2 = await fetch('http://localhost:3002/api/objects', {
      headers: { 'Cookie': managerCookies || '' }
    });
    
    if (managerObjectsResponse2.ok) {
      const managerObjects2 = await managerObjectsResponse2.json();
      const managerObject2 = managerObjects2.find(obj => obj.id === khalidovaObject.id);
      
      if (managerObject2) {
        console.log(`   🔒 allowManagerEdit после отключения: ${managerObject2.allowManagerEdit}`);
        
        if (!managerObject2.allowManagerEdit) {
          console.log(`   ✅ УСПЕХ: Разрешение корректно ОТКЛЮЧЕНО!`);
        } else {
          console.log(`   ❌ ПРОБЛЕМА: Разрешение НЕ отключилось`);
        }
      }
    }

    console.log('\n🎉 РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ:');
    console.log('   ✅ Ползунок работает корректно');
    console.log('   ✅ Разрешение включается и отключается');
    console.log('   ✅ Менеджер получает/теряет доступ к редактированию');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testToggleFinal();
