// Используем встроенный fetch для Node.js 18+
const fetch = globalThis.fetch;

async function testManagersAPI() {
  try {
    console.log('🧪 Тестирование API менеджеров...');
    
    // Тестируем GET /api/managers
    const response = await fetch('http://localhost:3003/api/managers', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`📡 Статус ответа: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API менеджеров работает!');
      console.log(`📊 Найдено менеджеров: ${data.managers ? data.managers.length : 0}`);
      
      if (data.managers && data.managers.length > 0) {
        console.log('👥 Первые 3 менеджера:');
        data.managers.slice(0, 3).forEach((manager, index) => {
          console.log(`  ${index + 1}. ${manager.name} (${manager.email})`);
        });
      }
    } else {
      const errorData = await response.json();
      console.log('❌ Ошибка API:', errorData);
    }
    
  } catch (error) {
    console.error('💥 Ошибка тестирования:', error.message);
  }
}

testManagersAPI();
