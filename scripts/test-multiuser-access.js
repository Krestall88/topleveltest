const fetch = require('node-fetch');

// Базовый URL для API
const BASE_URL = 'http://localhost:3002';

// Тестовые пользователи
const testUsers = [
  {
    email: 'admin@cleaning.com',
    password: 'admin123',
    role: 'ADMIN',
    name: 'Администратор'
  },
  {
    email: 'bobrovskaya.elena@cleaning.com',
    password: 'manager123',
    role: 'MANAGER',
    name: 'Менеджер 1'
  },
  {
    email: 'kobzeva.anna@cleaning.com',
    password: 'manager123',
    role: 'MANAGER',
    name: 'Менеджер 2'
  }
];

async function testLogin(user) {
  try {
    console.log(`🔐 Тестируем вход: ${user.name} (${user.email})`);
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${user.name}: Успешный вход`);
      console.log(`   Роль: ${data.user.role}`);
      console.log(`   Токен получен: ${data.token ? 'Да' : 'Нет'}`);
      
      // Извлекаем cookie из заголовков
      const cookies = response.headers.get('set-cookie');
      console.log(`   Cookie установлен: ${cookies ? 'Да' : 'Нет'}`);
      
      return {
        success: true,
        token: data.token,
        user: data.user,
        cookies: cookies
      };
    } else {
      console.log(`❌ ${user.name}: Ошибка входа - ${data.message}`);
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.log(`❌ ${user.name}: Ошибка соединения - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testConcurrentAccess() {
  console.log('🚀 Тестирование многопользовательского доступа...\n');
  
  // Проверяем, что сервер запущен
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (!healthCheck) {
      throw new Error('Сервер не отвечает');
    }
  } catch (error) {
    console.log('❌ Сервер не запущен или недоступен');
    console.log('   Запустите сервер командой: npm run dev');
    return;
  }
  
  // Тестируем одновременный вход всех пользователей
  console.log('📊 Тестирование одновременного входа...\n');
  
  const loginPromises = testUsers.map(user => testLogin(user));
  const results = await Promise.all(loginPromises);
  
  console.log('\n📈 Результаты тестирования:');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Успешных входов: ${successful.length}`);
  console.log(`❌ Неудачных входов: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Ошибки:');
    failed.forEach((result, index) => {
      const user = testUsers.find((u, i) => results[i] === result);
      console.log(`   ${user?.name}: ${result.error}`);
    });
  }
  
  // Проверяем уникальность токенов
  if (successful.length > 1) {
    const tokens = successful.map(r => r.token);
    const uniqueTokens = new Set(tokens);
    
    console.log(`\n🔑 Токены:`);
    console.log(`   Всего токенов: ${tokens.length}`);
    console.log(`   Уникальных токенов: ${uniqueTokens.size}`);
    console.log(`   Токены уникальны: ${tokens.length === uniqueTokens.size ? '✅' : '❌'}`);
  }
  
  console.log('\n🎉 Тестирование завершено!');
  
  if (successful.length === testUsers.length) {
    console.log('✅ Система поддерживает многопользовательский доступ');
  } else {
    console.log('⚠️ Обнаружены проблемы с многопользовательским доступом');
  }
}

testConcurrentAccess();
