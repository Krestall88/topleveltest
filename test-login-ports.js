const fetch = require('node-fetch');

async function testLoginPorts() {
  const ports = [3000, 3001, 3002];
  const testData = {
    email: 'admin@cleaning.com',
    password: 'admin123'
  };

  console.log('🔍 Тестируем доступность API на разных портах...\n');

  for (const port of ports) {
    try {
      const url = `http://localhost:${port}/api/auth/login`;
      console.log(`🚀 Тестируем порт ${port}...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
        timeout: 5000
      });

      console.log(`📊 Порт ${port}: Статус ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Порт ${port}: Успешный вход!`);
        console.log(`👤 Пользователь: ${data.user?.name} (${data.user?.role})`);
        return port;
      } else {
        const errorData = await response.text();
        console.log(`❌ Порт ${port}: ${errorData}`);
      }
      
    } catch (error) {
      console.log(`💥 Порт ${port}: Недоступен (${error.message})`);
    }
    
    console.log('');
  }
  
  console.log('❌ Ни один порт не работает!');
  return null;
}

testLoginPorts();
