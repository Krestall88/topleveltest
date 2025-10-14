const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log(' Тестируем API логина...');
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@cleaning.com',
        password: 'admin123'
      })
    });

    console.log(` Статус ответа: ${response.status}`);
    const data = await response.json();
    console.log('Ответ сервера:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('API работает корректно');
    } else {
      console.log('Ошибка в API');
    }

  } catch (error) {
    console.error('Ошибка запроса:', error.message);
  }
}

testAPI();
