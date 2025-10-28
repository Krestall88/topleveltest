const fetch = require('node-fetch');

async function testManagerEditPermission() {
  console.log('🧪 ТЕСТИРОВАНИЕ РАЗРЕШЕНИЯ РЕДАКТИРОВАНИЯ\n');
  
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

    // Получаем список объектов
    console.log('\n🏢 Получаем объекты...');
    const objectsResponse = await fetch('http://localhost:3002/api/objects', {
      headers: { 'Cookie': adminCookies || '' }
    });

    if (!objectsResponse.ok) {
      console.log('❌ Ошибка получения объектов');
      return;
    }

    const objects = await objectsResponse.json();
    console.log(`   📊 Найдено объектов: ${objects.length}`);
    
    // Найдем объект с менеджером
    const objectWithManager = objects.find(obj => obj.manager);
    if (!objectWithManager) {
      console.log('❌ Не найден объект с менеджером');
      return;
    }

    console.log(`   🎯 Тестируем объект: ${objectWithManager.name}`);
    console.log(`   👤 Менеджер: ${objectWithManager.manager.name}`);

    // Получаем детали объекта
    console.log('\n📋 Получаем детали объекта...');
    const objectDetailResponse = await fetch(`http://localhost:3002/api/objects/${objectWithManager.id}`, {
      headers: { 'Cookie': adminCookies || '' }
    });

    if (objectDetailResponse.ok) {
      const objectDetail = await objectDetailResponse.json();
      console.log(`   🔒 allowManagerEdit: ${objectDetail.allowManagerEdit}`);
      
      // Переключаем разрешение
      console.log('\n🔄 Переключаем разрешение редактирования...');
      const toggleResponse = await fetch(`http://localhost:3002/api/objects/${objectWithManager.id}/manager-edit`, {
        method: 'PATCH',
        headers: { 
          'Cookie': adminCookies || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          allowManagerEdit: !objectDetail.allowManagerEdit
        })
      });

      if (toggleResponse.ok) {
        const updatedObject = await toggleResponse.json();
        console.log(`   ✅ Разрешение обновлено: ${updatedObject.allowManagerEdit}`);
        
        // Проверяем, что изменение сохранилось
        console.log('\n🔍 Проверяем сохранение...');
        const checkResponse = await fetch(`http://localhost:3002/api/objects/${objectWithManager.id}`, {
          headers: { 'Cookie': adminCookies || '' }
        });
        
        if (checkResponse.ok) {
          const checkedObject = await checkResponse.json();
          console.log(`   📊 Проверка: allowManagerEdit = ${checkedObject.allowManagerEdit}`);
          
          if (checkedObject.allowManagerEdit === updatedObject.allowManagerEdit) {
            console.log(`   ✅ Изменение сохранено в БД`);
          } else {
            console.log(`   ❌ Изменение НЕ сохранено в БД`);
          }
        }
        
        // Тестируем доступ менеджера
        console.log('\n👤 Тестируем доступ менеджера...');
        const managerLoginResponse = await fetch('http://localhost:3002/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: objectWithManager.manager.email,
            password: 'manager123'
          }),
        });

        if (managerLoginResponse.ok) {
          const managerData = await managerLoginResponse.json();
          console.log(`   ✅ Вход менеджера: ${managerData.user.role}`);
          
          const managerCookies = managerLoginResponse.headers.get('set-cookie');
          
          // Проверяем, видит ли менеджер объект с разрешением
          const managerObjectsResponse = await fetch('http://localhost:3002/api/objects', {
            headers: { 'Cookie': managerCookies || '' }
          });
          
          if (managerObjectsResponse.ok) {
            const managerObjects = await managerObjectsResponse.json();
            const managerObject = managerObjects.find(obj => obj.id === objectWithManager.id);
            
            if (managerObject) {
              console.log(`   📊 Менеджер видит объект: ${managerObject.name}`);
              console.log(`   🔒 allowManagerEdit для менеджера: ${managerObject.allowManagerEdit}`);
              
              if (managerObject.allowManagerEdit === updatedObject.allowManagerEdit) {
                console.log(`   ✅ Разрешение корректно передается менеджеру`);
              } else {
                console.log(`   ❌ Разрешение НЕ передается менеджеру`);
              }
            } else {
              console.log(`   ❌ Менеджер НЕ видит объект`);
            }
          }
        } else {
          console.log(`   ❌ Ошибка входа менеджера`);
        }
        
      } else {
        console.log(`   ❌ Ошибка переключения разрешения: ${toggleResponse.status}`);
        const errorText = await toggleResponse.text();
        console.log(`   📄 Ответ: ${errorText}`);
      }
    } else {
      console.log(`   ❌ Ошибка получения деталей объекта: ${objectDetailResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testManagerEditPermission();
