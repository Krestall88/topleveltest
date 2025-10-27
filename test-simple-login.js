const fetch = require('node-fetch');

async function testSimpleLogin() {
  console.log('🔍 Простая проверка API входа...\n');
  
  try {
    console.log('🔄 Отправляем запрос на /api/auth/login...');
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@cleaning.com',
        password: 'admin123'
      }),
    });

    console.log(`📊 Статус ответа: ${response.status}`);
    console.log(`📋 Заголовки: ${JSON.stringify(Object.fromEntries(response.headers))}`);
    
    const responseText = await response.text();
    console.log(`📄 Размер ответа: ${responseText.length} символов`);
    
    if (responseText.length > 0) {
      console.log('📄 Ответ:');
      console.log(responseText.substring(0, 1000));
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testSimpleLogin();
