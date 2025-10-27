const fetch = require('node-fetch');

async function debugObjectsAPI() {
  console.log('🔍 Отладка API объектов...\n');
  
  try {
    // Вход
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@cleaning.com',
        password: 'admin123'
      }),
    });

    const loginData = await loginResponse.json();
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Вход выполнен');

    // Проверяем API объектов
    console.log('🔍 Запрашиваем объекты...');
    const objectsResponse = await fetch('http://localhost:3000/api/objects', {
      headers: { 'Cookie': cookies || '' }
    });

    console.log(`📊 Статус ответа: ${objectsResponse.status}`);
    
    const responseText = await objectsResponse.text();
    console.log(`📄 Размер ответа: ${responseText.length} символов`);
    
    try {
      const objectsData = JSON.parse(responseText);
      
      if (Array.isArray(objectsData)) {
        console.log(`✅ Получен массив объектов: ${objectsData.length} элементов`);
        
        if (objectsData.length > 0) {
          const sample = objectsData[0];
          console.log(`📋 Пример объекта: ${sample.name}`);
          console.log(`🆔 ID: ${sample.id}`);
          console.log(`📅 Создан: ${sample.createdAt}`);
        }
      } else {
        console.log('📊 Структура ответа:', Object.keys(objectsData));
      }
      
    } catch (parseError) {
      console.log('❌ Ошибка парсинга JSON');
      console.log('📄 Первые 500 символов ответа:');
      console.log(responseText.substring(0, 500));
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

debugObjectsAPI();
