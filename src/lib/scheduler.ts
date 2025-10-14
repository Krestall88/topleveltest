// Система планировщика для автоматического создания чек-листов
import cron from 'node-cron';

let schedulerInitialized = false;

export function initializeScheduler() {
  if (schedulerInitialized) {
    console.log('📅 Планировщик уже инициализирован');
    return;
  }

  console.log('🚀 Инициализация планировщика задач...');

  // Запуск каждый будний день в 9:00 по московскому времени (UTC+3)
  // Cron выражение: "0 6 * * 1-5" (6:00 UTC = 9:00 MSK)
  cron.schedule('0 6 * * 1-5', async () => {
    console.log('⏰ Запуск автоматического создания чек-листов в 9:00 МСК');
    
    try {
      // Вызываем API автогенерации
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/checklists/auto-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Автогенерация чек-листов успешна:', result);
      } else {
        console.error('❌ Ошибка автогенерации чек-листов:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Критическая ошибка планировщика:', error);
    }
  }, {
    timezone: 'Europe/Moscow'
  });

  // Дополнительная задача для очистки старых чек-листов (каждое воскресенье в 2:00)
  cron.schedule('0 23 * * 0', async () => {
    console.log('🧹 Запуск очистки старых чек-листов...');
    
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/checklists/cleanup`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Очистка завершена:', result);
      }
    } catch (error) {
      console.error('❌ Ошибка очистки:', error);
    }
  }, {
    timezone: 'Europe/Moscow'
  });

  schedulerInitialized = true;
  console.log('✅ Планировщик успешно инициализирован');
  console.log('📋 Активные задачи:');
  console.log('  - Автогенерация чек-листов: каждый будний день в 9:00 МСК');
  console.log('  - Очистка старых данных: каждое воскресенье в 2:00 МСК');
}

export function getSchedulerStatus() {
  return {
    initialized: schedulerInitialized,
    tasks: [
      {
        name: 'Автогенерация чек-листов',
        schedule: '0 6 * * 1-5',
        timezone: 'Europe/Moscow',
        description: 'Создание чек-листов каждый будний день в 9:00 МСК'
      },
      {
        name: 'Очистка старых данных',
        schedule: '0 23 * * 0',
        timezone: 'Europe/Moscow',
        description: 'Архивация старых чек-листов каждое воскресенье в 2:00 МСК'
      }
    ]
  };
}
