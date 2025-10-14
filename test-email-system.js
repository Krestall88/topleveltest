// Тестирование системы email
const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Функция для HTTP запросов без fetch
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ json: () => Promise.resolve(jsonData), status: res.statusCode });
        } catch (error) {
          resolve({ json: () => Promise.resolve({ error: 'Invalid JSON', data }), status: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testEmailSystem() {
  console.log('🧪 Тестирование системы email...\n');

  // Проверяем доступность сервера
  console.log('🔍 Проверка доступности сервера...');
  try {
    const healthCheck = await makeRequest(`${BASE_URL}/api/health`);
    console.log('✅ Сервер доступен\n');
  } catch (error) {
    console.log('❌ Сервер недоступен. Убедитесь, что запущен npm run dev');
    console.log('📝 Для запуска сервера выполните: npm run dev\n');
    return;
  }

  // Тест 1: Первое письмо от нового клиента (должен получить ссылку для выбора объекта)
  console.log('📧 Тест 1: Первое письмо от нового клиента');
  const testEmail1 = {
    from: 'test.client@example.com',
    subject: 'Тестовое письмо для выбора объекта',
    text: 'Привет! Это мое первое письмо. Нужна помощь с уборкой.',
    messageId: 'test-msg-1-' + Date.now()
  };

  try {
    const startTime = Date.now();
    const response1 = await makeRequest(`${BASE_URL}/api/webhooks/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEmail1)
    });
    
    const result1 = await response1.json();
    const processingTime1 = Date.now() - startTime;
    
    console.log(`⚡ Ответ получен за ${processingTime1}мс`);
    console.log('📊 Результат:', result1);
    console.log('✅ Тест 1 завершен\n');
    
  } catch (error) {
    console.error('❌ Ошибка в тесте 1:', error);
  }

  // Пауза между тестами
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Тест 2: Привязка клиента к объекту (симуляция выбора объекта)
  console.log('🔗 Тест 2: Привязка клиента к объекту');
  
  try {
    // Сначала получаем список объектов
    const objectsResponse = await makeRequest(`${BASE_URL}/api/client-bindings?email=test.client@example.com`);
    const objectsData = await objectsResponse.json();
    
    if (objectsData.objects && objectsData.objects.length > 0) {
      const firstObject = objectsData.objects[0];
      console.log(`📍 Выбираем объект: ${firstObject.name}`);
      
      // Привязываем клиента к объекту
      const bindingResponse = await makeRequest(`${BASE_URL}/api/client-bindings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test.client@example.com',
          objectId: firstObject.id
        })
      });
      
      const bindingResult = await bindingResponse.json();
      console.log('🔗 Результат привязки:', bindingResult);
      console.log('✅ Тест 2 завершен\n');
      
      // Пауза между тестами
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Тест 3: Повторное письмо от привязанного клиента (должно создать задание)
      console.log('📧 Тест 3: Повторное письмо от привязанного клиента');
      const testEmail3 = {
        from: 'test.client@example.com',
        subject: 'Дополнительная заявка на уборку',
        text: 'Здравствуйте! Нужна дополнительная уборка в офисе. Пожалуйста, приедьте завтра утром.',
        messageId: 'test-msg-3-' + Date.now()
      };

      const startTime3 = Date.now();
      const response3 = await makeRequest(`${BASE_URL}/api/webhooks/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testEmail3)
      });
      
      const result3 = await response3.json();
      const processingTime3 = Date.now() - startTime3;
      
      console.log(`⚡ Ответ получен за ${processingTime3}мс`);
      console.log('📊 Результат:', result3);
      console.log('✅ Тест 3 завершен\n');
      
    } else {
      console.log('❌ Нет доступных объектов для привязки');
    }
    
  } catch (error) {
    console.error('❌ Ошибка в тестах 2-3:', error);
  }

  // Тест 4: Проверка созданных заданий
  console.log('📋 Тест 4: Проверка созданных заданий');
  try {
    const tasksResponse = await makeRequest(`${BASE_URL}/api/additional-tasks`);
    const tasksData = await tasksResponse.json();
    
    console.log(`📊 Всего заданий в системе: ${tasksData.tasks ? tasksData.tasks.length : 0}`);
    
    if (tasksData.tasks && tasksData.tasks.length > 0) {
      const emailTasks = tasksData.tasks.filter(task => task.source === 'EMAIL');
      console.log(`📧 Заданий из email: ${emailTasks.length}`);
      
      emailTasks.forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.title} (${task.status})`);
      });
    }
    
    console.log('✅ Тест 4 завершен\n');
    
  } catch (error) {
    console.error('❌ Ошибка в тесте 4:', error);
  }

  console.log('🎉 Тестирование завершено!');
}

// Запуск тестов
testEmailSystem().catch(console.error);
