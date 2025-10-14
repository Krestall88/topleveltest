const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixInventorySystem() {
  try {
    console.log('🔧 Исправление системы инвентаря...');

    // Проверяем, есть ли старые таблицы
    try {
      const oldInventory = await prisma.$queryRaw`SELECT COUNT(*) FROM "InventoryItem"`;
      console.log('❌ Найдена старая таблица InventoryItem, она будет удалена при следующем prisma db push');
    } catch (error) {
      console.log('✅ Старая таблица InventoryItem уже удалена');
    }

    // Проверяем новые таблицы
    try {
      const limits = await prisma.inventoryLimit.count();
      const expenses = await prisma.inventoryExpense.count();
      
      console.log(`✅ Новая система инвентаря работает:`);
      console.log(`   - Лимитов: ${limits}`);
      console.log(`   - Расходов: ${expenses}`);
    } catch (error) {
      console.log('❌ Ошибка проверки новых таблиц:', error.message);
    }

    // Проверяем пользователя-бухгалтера
    const accountant = await prisma.user.findFirst({
      where: { role: 'ACCOUNTANT' }
    });

    if (accountant) {
      console.log(`✅ Бухгалтер найден: ${accountant.email}`);
    } else {
      console.log('❌ Бухгалтер не найден, создайте его через create-accountant.js');
    }

    console.log('\n🎉 Проверка завершена!');
    console.log('\n📋 Следующие шаги:');
    console.log('1. Убедитесь, что recharts установлен: npm install recharts');
    console.log('2. Перезапустите сервер: npm run dev');
    console.log('3. Войдите как бухгалтер: accountant@cleaning.com / accountant123');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixInventorySystem();
