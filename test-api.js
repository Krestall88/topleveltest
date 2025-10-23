async function testCalendarAPI() {
  try {
    console.log('🔍 Тестируем API календаря задач...');
    
    // Тестируем API календаря
    const response = await fetch('http://localhost:3002/api/tasks/calendar-simple');
    
    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ API Calendar Response:');
    console.log(`   User Role: ${data.userRole}`);
    console.log(`   Managers: ${Object.keys(data.byManager || {}).length}`);
    console.log(`   Objects: ${Object.keys(data.byObject || {}).length}`);
    
    if (data.byManager) {
      console.log('\n👥 Менеджеры:');
      Object.values(data.byManager).slice(0, 3).forEach((manager, i) => {
        console.log(`   ${i+1}. ${manager.manager?.name} - задач: ${manager.tasks?.length || 0}`);
        if (manager.tasks?.length > 0) {
          console.log(`      Первая задача: ${manager.tasks[0].description}`);
          console.log(`      Объект: ${manager.tasks[0].objectName}`);
          console.log(`      Помещение: ${manager.tasks[0].roomName}`);
          console.log(`      Статус: ${manager.tasks[0].status}`);
        }
      });
    }
    
    // Проверим, есть ли данные в базе без авторизации
    console.log('\n🔍 Проверяем доступность страницы...');
    const pageResponse = await fetch('http://localhost:3002/manager-calendar');
    console.log(`Страница календаря статус: ${pageResponse.status}`);
    
    // Попробуем получить данные через публичный API
    console.log('\n🔍 Проверяем публичные данные...');
    const publicResponse = await fetch('http://localhost:3002/api/test-sql');
    if (publicResponse.ok) {
      const publicData = await publicResponse.json();
      console.log('📋 Публичные данные:', JSON.stringify(publicData, null, 2));
    } else {
      console.log(`❌ Публичный API недоступен: ${publicResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCalendarAPI();
