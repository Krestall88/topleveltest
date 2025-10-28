const fetch = require('node-fetch');

async function testManagerObjects() {
  console.log('🧪 ТЕСТИРОВАНИЕ ОБЪЕКТОВ МЕНЕДЖЕРА\n');
  
  try {
    // Входим как менеджер
    console.log('👤 Входим как менеджер...');
    
    const managerLoginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'khalidova.liliya@cleaning.com',
        password: 'manager123'
      }),
    });

    if (!managerLoginResponse.ok) {
      console.log('❌ Ошибка входа менеджера');
      return;
    }

    const managerData = await managerLoginResponse.json();
    console.log(`   ✅ Вход менеджера: ${managerData.user.role}`);
    console.log(`   👤 Имя: ${managerData.user.name}`);
    
    const managerCookies = managerLoginResponse.headers.get('set-cookie');

    // Получаем объекты менеджера
    console.log('\n🏢 Получаем объекты менеджера...');
    const objectsResponse = await fetch('http://localhost:3002/api/objects', {
      headers: { 'Cookie': managerCookies || '' }
    });

    if (!objectsResponse.ok) {
      console.log('❌ Ошибка получения объектов');
      return;
    }

    const objects = await objectsResponse.json();
    console.log(`   📊 Количество объектов менеджера: ${objects.length}`);
    
    objects.forEach((obj, index) => {
      console.log(`   ${index + 1}. ${obj.name}`);
      console.log(`      📍 Адрес: ${obj.address}`);
      console.log(`      👤 Менеджер: ${obj.manager?.name || 'Не назначен'}`);
      console.log(`      🔒 allowManagerEdit: ${obj.allowManagerEdit}`);
      console.log('');
    });

    // Проверим, есть ли объекты с разрешением редактирования
    const editableObjects = objects.filter(obj => obj.allowManagerEdit);
    console.log(`   ✏️ Объектов с разрешением редактирования: ${editableObjects.length}`);
    
    if (editableObjects.length > 0) {
      console.log('   📋 Объекты с разрешением:');
      editableObjects.forEach((obj, index) => {
        console.log(`      ${index + 1}. ${obj.name} - ✅ Можно редактировать`);
      });
    }

    const nonEditableObjects = objects.filter(obj => !obj.allowManagerEdit);
    console.log(`   🔒 Объектов без разрешения редактирования: ${nonEditableObjects.length}`);
    
    if (nonEditableObjects.length > 0) {
      console.log('   📋 Объекты без разрешения:');
      nonEditableObjects.forEach((obj, index) => {
        console.log(`      ${index + 1}. ${obj.name} - ❌ Нельзя редактировать`);
      });
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testManagerObjects();
