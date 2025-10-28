const fetch = require('node-fetch');

async function debugManagerObjects() {
  console.log('🔍 ОТЛАДКА ОБЪЕКТОВ МЕНЕДЖЕРА\n');
  
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

    // Получаем все объекты менеджера
    console.log('\n🏢 Получаем ВСЕ объекты менеджера...');
    const objectsResponse = await fetch('http://localhost:3002/api/objects', {
      headers: { 'Cookie': managerCookies || '' }
    });

    if (!objectsResponse.ok) {
      console.log('❌ Ошибка получения объектов');
      return;
    }

    const objects = await objectsResponse.json();
    console.log(`   📊 Всего объектов менеджера: ${objects.length}\n`);
    
    objects.forEach((obj, index) => {
      console.log(`${index + 1}. 📋 ОБЪЕКТ: ${obj.name}`);
      console.log(`   🆔 ID: ${obj.id}`);
      console.log(`   📍 Адрес: ${obj.address}`);
      console.log(`   👤 Менеджер: ${obj.manager?.name || 'Не назначен'}`);
      console.log(`   🔒 allowManagerEdit: ${obj.allowManagerEdit}`);
      console.log(`   ✏️ Может редактировать: ${obj.allowManagerEdit ? 'ДА' : 'НЕТ'}`);
      console.log('');
    });

    // Ищем объект "ООО «Единые Транспортные ЭнергоСистемы»"
    const targetObject = objects.find(obj => 
      obj.name.includes('Единые Транспортные ЭнергоСистемы') || 
      obj.name.includes('ЕТЭС')
    );

    if (targetObject) {
      console.log('🎯 НАЙДЕН ЦЕЛЕВОЙ ОБЪЕКТ:');
      console.log(`   📋 Название: ${targetObject.name}`);
      console.log(`   🆔 ID: ${targetObject.id}`);
      console.log(`   🔒 allowManagerEdit: ${targetObject.allowManagerEdit}`);
      console.log(`   ❗ Это объект, который открывает менеджер в браузере!`);
      
      if (!targetObject.allowManagerEdit) {
        console.log('\n⚠️  ПРОБЛЕМА: Для этого объекта НЕ включено разрешение редактирования!');
        console.log('   💡 Нужно войти как админ и включить разрешение для этого объекта.');
      } else {
        console.log('\n✅ Разрешение включено, но кнопка не работает - проблема в коде.');
      }
    } else {
      console.log('❌ Объект "Единые Транспортные ЭнергоСистемы" не найден');
    }

  } catch (error) {
    console.error('❌ Ошибка отладки:', error.message);
  }
}

debugManagerObjects();
