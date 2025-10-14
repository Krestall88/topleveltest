/**
 * Миграция данных InventoryExpense
 * Переименовываем spentById в recordedById
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateInventoryExpenses() {
  try {
    console.log('🔄 Миграция данных InventoryExpense...');

    // Получаем все расходы
    const expenses = await prisma.$queryRaw`
      SELECT id, "spentById" FROM "InventoryExpense"
    `;

    console.log(`📊 Найдено расходов для миграции: ${expenses.length}`);

    if (expenses.length > 0) {
      // Добавляем колонку recordedById
      await prisma.$executeRaw`
        ALTER TABLE "InventoryExpense" 
        ADD COLUMN IF NOT EXISTS "recordedById" TEXT
      `;

      // Копируем данные из spentById в recordedById
      await prisma.$executeRaw`
        UPDATE "InventoryExpense" 
        SET "recordedById" = "spentById"
        WHERE "recordedById" IS NULL
      `;

      console.log('✅ Данные скопированы из spentById в recordedById');

      // Удаляем старую колонку spentById
      await prisma.$executeRaw`
        ALTER TABLE "InventoryExpense" 
        DROP COLUMN IF EXISTS "spentById"
      `;

      // Удаляем связь с limitId если есть
      await prisma.$executeRaw`
        ALTER TABLE "InventoryExpense" 
        DROP COLUMN IF EXISTS "limitId"
      `;

      console.log('✅ Старые колонки удалены');

      // Делаем recordedById обязательным
      await prisma.$executeRaw`
        ALTER TABLE "InventoryExpense" 
        ALTER COLUMN "recordedById" SET NOT NULL
      `;

      console.log('✅ Колонка recordedById сделана обязательной');
    }

    console.log('🎉 Миграция завершена успешно!');

  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateInventoryExpenses();
