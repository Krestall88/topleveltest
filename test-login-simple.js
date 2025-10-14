// Простой тест API без fetch
const http = require('http');

function testLogin() {
  const postData = JSON.stringify({
    email: 'admin@cleaning.com',
    password: 'admin123'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🧪 Тестируем API логина...');

  const req = http.request(options, (res) => {
    console.log(`📊 Статус: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('📋 Ответ:', JSON.stringify(response, null, 2));
        
        if (res.statusCode === 200) {
          console.log('✅ API работает корректно');
        } else {
          console.log('❌ Ошибка в API');
        }
      } catch (e) {
        console.log('❌ Ошибка парсинга ответа:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Ошибка запроса:', e.message);
  });

  req.write(postData);
  req.end();
}

testLogin();
