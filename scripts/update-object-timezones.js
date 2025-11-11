/**
 * Скрипт для обновления часовых поясов и рабочих часов существующих объектов
 * 
 * Запуск: node scripts/update-object-timezones.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Обновление часовых поясов и рабочих часов объектов...\n');

  // Получаем все объекты
  const objects = await prisma.cleaningObject.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      timezone: true,
      workStartTime: true,
      workEndTime: true,
      city: true,
    }
  });

  console.log(`📊 Найдено объектов: ${objects.length}\n`);

  let updated = 0;

  for (const object of objects) {
    const updates = {};

    // Обновляем timezone если NULL
    if (!object.timezone) {
      updates.timezone = 'Europe/Moscow';
    }

    // Обновляем workStartTime если NULL
    if (!object.workStartTime) {
      updates.workStartTime = '09:00';
    }

    // Обновляем workEndTime если NULL
    if (!object.workEndTime) {
      updates.workEndTime = '18:00';
    }

    // Если есть что обновлять
    if (Object.keys(updates).length > 0) {
      await prisma.cleaningObject.update({
        where: { id: object.id },
        data: updates
      });

      updated++;
      console.log(`✅ Обновлен объект: ${object.name}`);
      console.log(`   - timezone: ${updates.timezone || object.timezone}`);
      console.log(`   - workStartTime: ${updates.workStartTime || object.workStartTime}`);
      console.log(`   - workEndTime: ${updates.workEndTime || object.workEndTime}\n`);
    }
  }

  console.log(`\n✅ Обновление завершено!`);
  console.log(`📊 Обновлено объектов: ${updated} из ${objects.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
