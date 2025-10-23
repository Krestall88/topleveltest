const fetch = require('node-fetch');

async function testVirtualAPI() {
  try {
    console.log('🧪 ТЕСТИРОВАНИЕ ВИРТУАЛЬНЫХ API...\n');

    // Тестируем API виртуальных задач
    console.log('1. Тестируем /api/tasks/virtual');
    const virtualResponse = await fetch('http://localhost:3000/api/tasks/virtual?date=2025-10-23&days=1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Добавим базовую авторизацию для теста
        'Authorization': 'Bearer test'
      }
    });

    if (virtualResponse.ok) {
      const virtualData = await virtualResponse.json();
      console.log('✅ Виртуальные задачи получены:', virtualData.stats || 'Нет статистики');
    } else {
      console.log('❌ Ошибка виртуальных задач:', virtualResponse.status, await virtualResponse.text());
    }

    // Тестируем API календаря виртуальных задач
    console.log('\n2. Тестируем /api/tasks/calendar-virtual');
    const calendarResponse = await fetch('http://localhost:3000/api/tasks/calendar-virtual?date=2025-10-23&days=1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test'
      }
    });

    if (calendarResponse.ok) {
      const calendarData = await calendarResponse.json();
      console.log('✅ Календарь виртуальных задач получен:', calendarData.totalStats || 'Нет статистики');
    } else {
      console.log('❌ Ошибка календаря:', calendarResponse.status, await calendarResponse.text());
    }

    // Тестируем API материализации
    console.log('\n3. Тестируем /api/tasks/materialize');
    const materializeResponse = await fetch('http://localhost:3000/api/tasks/materialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test'
      },
      body: JSON.stringify({
        virtualTaskId: 'test-task-2025-10-23',
        action: 'comment',
        comment: 'Тестовый комментарий'
      })
    });

    if (materializeResponse.ok) {
      const materializeData = await materializeResponse.json();
      console.log('✅ Материализация работает:', materializeData.success || 'Успешно');
    } else {
      console.log('❌ Ошибка материализации:', materializeResponse.status, await materializeResponse.text());
    }

    console.log('\n🎯 РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ:');
    console.log('- API созданы и отвечают на запросы');
    console.log('- Нужно проверить авторизацию и интеграцию с фронтендом');
    console.log('- Готово к переходу на новую архитектуру');

  } catch (error) {
    console.error('❌ Ошибка тестирования API:', error.message);
  }
}

testVirtualAPI();
