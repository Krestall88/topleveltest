const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3002';
const OBJECT_ID = 'cmgz3mgg20001vyaw622revyh';

async function testReportingAPI() {
  try {
    console.log('🔍 Тестируем API отчетности...');
    
    // Сначала авторизуемся как администратор
    console.log('🔐 Авторизация...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@cleaning.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Ошибка авторизации: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Авторизация успешна');
    
    // Извлекаем cookie из заголовков
    const cookies = loginResponse.headers.get('set-cookie');
    
    // Тестируем получение задач
    console.log(`\n🔍 Получаем задачи для объекта ${OBJECT_ID}...`);
    const tasksResponse = await fetch(`${BASE_URL}/api/reporting/objects/${OBJECT_ID}/tasks`, {
      headers: {
        'Cookie': cookies || ''
      }
    });
    
    console.log(`📊 Статус ответа: ${tasksResponse.status}`);
    
    if (tasksResponse.ok) {
      const tasksData = await tasksResponse.json();
      console.log('✅ Задачи получены успешно');
      console.log(`📋 Количество задач: ${tasksData.tasks?.length || 0}`);
      
      if (tasksData.tasks && tasksData.tasks.length > 0) {
        console.log('\n📝 Список задач:');
        tasksData.tasks.forEach((task, index) => {
          console.log(`   ${index + 1}. ${task.title} (${task.status})`);
          console.log(`      Приоритет: ${task.priority}`);
          console.log(`      Создана: ${new Date(task.createdAt).toLocaleString()}`);
        });
      }
    } else {
      const errorData = await tasksResponse.json().catch(() => ({}));
      console.log('❌ Ошибка получения задач');
      console.log(`   Статус: ${tasksResponse.status}`);
      console.log(`   Сообщение: ${errorData.message || 'Неизвестная ошибка'}`);
    }
    
    // Тестируем создание новой задачи
    console.log('\n🔧 Тестируем создание новой задачи...');
    
    // Найдем менеджера для назначения
    const managerId = 'cmgal3t5s0004vyyoxkqv2cye'; // ID из предыдущего теста
    
    const createTaskResponse = await fetch(`${BASE_URL}/api/reporting/objects/${OBJECT_ID}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify({
        title: 'Тестовая задача API',
        description: 'Задача создана через тестовый скрипт',
        assignedToId: managerId,
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // завтра
      })
    });
    
    console.log(`📊 Статус создания: ${createTaskResponse.status}`);
    
    if (createTaskResponse.ok) {
      const createData = await createTaskResponse.json();
      console.log('✅ Задача создана успешно');
      console.log(`   ID: ${createData.task.id}`);
      console.log(`   Название: ${createData.task.title}`);
    } else {
      const errorData = await createTaskResponse.json().catch(() => ({}));
      console.log('❌ Ошибка создания задачи');
      console.log(`   Статус: ${createTaskResponse.status}`);
      console.log(`   Сообщение: ${errorData.message || 'Неизвестная ошибка'}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testReportingAPI();
