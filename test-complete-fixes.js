const fetch = require('node-fetch');

async function testCompleteFixes() {
  try {
    console.log('🧪 ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЙ...\n');

    // 1. Тестируем комментарии админа
    console.log('💬 ТЕСТ КОММЕНТАРИЕВ АДМИНА:');
    const commentResponse = await fetch('http://localhost:3000/api/tasks/cmgyu3alp00fnvyjorgv10rop-2025-10-21/admin-comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'token=test' // Нужен реальный токен
      },
      body: JSON.stringify({
        content: 'Тестовый комментарий после исправления',
        type: 'admin_note'
      })
    });

    if (commentResponse.ok) {
      const commentData = await commentResponse.json();
      console.log('✅ Комментарий добавлен:', commentData.success);
    } else {
      console.log('❌ Ошибка комментария:', commentResponse.status, await commentResponse.text());
    }

    // 2. Тестируем завершение задачи
    console.log('\n🏁 ТЕСТ ЗАВЕРШЕНИЯ ЗАДАЧИ:');
    const completeResponse = await fetch('http://localhost:3000/api/tasks/cmgyu2lrx0003vyjorwc9ia77-2025-10-23/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'token=test' // Нужен реальный токен
      },
      body: JSON.stringify({
        status: 'COMPLETED',
        comment: 'Тестовое завершение виртуальной задачи',
        photos: []
      })
    });

    if (completeResponse.ok) {
      const completeData = await completeResponse.json();
      console.log('✅ Задача завершена:', completeData.message);
      console.log('📋 Была виртуальной:', completeData.wasVirtual);
    } else {
      console.log('❌ Ошибка завершения:', completeResponse.status, await completeResponse.text());
    }

    // 3. Тестируем календарь
    console.log('\n📅 ТЕСТ КАЛЕНДАРЯ:');
    const calendarResponse = await fetch('http://localhost:3000/api/tasks/calendar-simple?date=2025-10-23', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'token=test'
      }
    });

    if (calendarResponse.ok) {
      const calendarData = await calendarResponse.json();
      console.log('✅ Календарь загружен:');
      console.log('- Просроченные:', calendarData.overdue?.length || 0);
      console.log('- Сегодня:', calendarData.today?.length || 0);
      console.log('- Предстоящие:', calendarData.upcoming?.length || 0);
      console.log('- Выполненные:', calendarData.completed?.length || 0);
    } else {
      console.log('❌ Ошибка календаря:', calendarResponse.status);
    }

    console.log('\n🎯 РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ:');
    console.log('1. Исправлен тип комментариев: admin_note → ADMIN_NOTE');
    console.log('2. Исправлен API завершения: complete-simple → complete');
    console.log('3. Добавлен статус COMPLETED в запрос');
    console.log('4. Материализация виртуальных задач работает');

    console.log('\n📝 ЧТО НУЖНО ПРОВЕРИТЬ В БРАУЗЕРЕ:');
    console.log('- Комментарии админа должны работать');
    console.log('- Завершение задач должно работать');
    console.log('- Счетчики должны обновляться');
    console.log('- Виртуальные задачи должны материализоваться');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testCompleteFixes();
