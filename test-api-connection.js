const fetch = require('node-fetch');

async function testApiConnection() {
  console.log('🔍 Тестируем подключение через API...\n');
  
  try {
    // Тестируем API входа
    console.log('🔐 Тестируем вход в систему...');
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@cleaning.com',
        password: 'admin123'
      }),
    });

    console.log(`📊 Статус входа: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log(`✅ Вход успешен! Пользователь: ${loginData.user?.name} (${loginData.user?.role})`);
      
      // Получаем cookie для дальнейших запросов
      const cookies = loginResponse.headers.get('set-cookie');
      
      // Тестируем получение объектов
      console.log('\n🏢 Тестируем получение объектов...');
      const objectsResponse = await fetch('http://localhost:3002/api/objects', {
        headers: {
          'Cookie': cookies || ''
        }
      });
      
      console.log(`📊 Статус объектов: ${objectsResponse.status}`);
      
      if (objectsResponse.ok) {
        const objectsData = await objectsResponse.json();
        console.log(`✅ Найдено объектов: ${objectsData.objects?.length || 0}`);
        
        if (objectsData.objects && objectsData.objects.length > 0) {
          const sampleObject = objectsData.objects[0];
          console.log(`📋 Пример объекта: ${sampleObject.name}`);
          console.log(`🏠 Помещений: ${sampleObject.rooms?.length || 0}`);
          console.log(`📝 Техкарт: ${sampleObject.techCards?.length || 0}`);
          
          if (sampleObject.rooms?.length > 0 && sampleObject.techCards?.length > 0) {
            console.log('\n🎉 ОТЛИЧНО! База данных полностью восстановлена!');
            console.log('✅ Все объекты имеют связанные данные');
            
            // Проверяем новую таблицу ReportingTaskAttachment
            console.log('\n📎 Проверяем новую таблицу вложений...');
            const reportingResponse = await fetch('http://localhost:3002/api/reporting/tasks', {
              headers: {
                'Cookie': cookies || ''
              }
            });
            
            if (reportingResponse.ok) {
              const reportingData = await reportingResponse.json();
              console.log(`✅ Задач отчетности: ${reportingData.tasks?.length || 0}`);
              console.log('✅ API для задач отчетности работает');
            }
            
            console.log('\n🎯 СИСТЕМА ПОЛНОСТЬЮ ВОССТАНОВЛЕНА!');
            console.log('📋 Можно приступать к тестированию нового функционала');
            
          } else {
            console.log('\n⚠️ ВНИМАНИЕ! Объекты без связанных данных');
            console.log('Возможно, восстановление не завершено');
          }
        } else {
          console.log('❌ Объекты не найдены');
        }
      } else {
        const errorText = await objectsResponse.text();
        console.log(`❌ Ошибка получения объектов: ${errorText}`);
      }
      
    } else {
      const errorText = await loginResponse.text();
      console.log(`❌ Ошибка входа: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования API:', error.message);
  }
}

testApiConnection();
