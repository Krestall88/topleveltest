const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTimewebBackup() {
  try {
    console.log('🔍 Проверка возможности восстановления данных...\n');

    // Проверяем все таблицы в базе
    console.log('📊 Проверка существующих таблиц:');
    
    try {
      const users = await prisma.user.count();
      console.log(`   👥 Users: ${users} записей`);
    } catch (e) {
      console.log(`   ❌ Users: таблица недоступна`);
    }

    try {
      const objects = await prisma.cleaningObject.count();
      console.log(`   🏢 CleaningObject: ${objects} записей`);
    } catch (e) {
      console.log(`   ❌ CleaningObject: таблица недоступна`);
    }

    try {
      const rooms = await prisma.room.count();
      console.log(`   🏠 Room: ${rooms} записей`);
    } catch (e) {
      console.log(`   ❌ Room: таблица недоступна`);
    }

    try {
      const techCards = await prisma.techCard.count();
      console.log(`   📋 TechCard: ${techCards} записей`);
    } catch (e) {
      console.log(`   ❌ TechCard: таблица недоступна`);
    }

    try {
      const checklists = await prisma.checklist.count();
      console.log(`   ✅ Checklist: ${checklists} записей`);
    } catch (e) {
      console.log(`   ❌ Checklist: таблица недоступна`);
    }

    try {
      const tasks = await prisma.task.count();
      console.log(`   📝 Task: ${tasks} записей`);
    } catch (e) {
      console.log(`   ❌ Task: таблица недоступна`);
    }

    // Проверяем новые таблицы инвентаря
    try {
      const limits = await prisma.inventoryLimit.count();
      console.log(`   💰 InventoryLimit: ${limits} записей`);
    } catch (e) {
      console.log(`   ❌ InventoryLimit: таблица недоступна`);
    }

    try {
      const expenses = await prisma.inventoryExpense.count();
      console.log(`   💸 InventoryExpense: ${expenses} записей`);
    } catch (e) {
      console.log(`   ❌ InventoryExpense: таблица недоступна`);
    }

    console.log('\n🔍 Проверка завершена');
    console.log('\n⚠️ ВАЖНО: Если данные потеряны, нужно обратиться к Timeweb Cloud');
    console.log('для восстановления из автоматического бэкапа!');

  } catch (error) {
    console.error('❌ Ошибка проверки:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTimewebBackup();
