const fetch = require('node-fetch');

async function debugUsersAPI() {
  console.log('🔍 ОТЛАДКА API ПОЛЬЗОВАТЕЛЕЙ\n');
  
  try {
    // Вход как админ
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@cleaning.com',
        password: 'admin123'
      }),
    });

    const loginData = await loginResponse.json();
    const cookies = loginResponse.headers.get('set-cookie');

    // Проверяем API пользователей
    const usersResponse = await fetch('http://localhost:3002/api/admin/users', {
      headers: { 'Cookie': cookies || '' }
    });

    console.log('Статус ответа:', usersResponse.status);
    const responseText = await usersResponse.text();
    console.log('Тело ответа:', responseText);
    
    try {
      const parsedData = JSON.parse(responseText);
      console.log('Тип данных:', typeof parsedData);
      console.log('Является массивом:', Array.isArray(parsedData));
      console.log('Ключи объекта:', Object.keys(parsedData));
    } catch (e) {
      console.log('Не удалось распарсить JSON');
    }
    
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

debugUsersAPI();
