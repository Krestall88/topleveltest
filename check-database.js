const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Проверка состояния базы данных...\n');

    // Проверяем пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    console.log(`👥 Пользователи (${users.length}):`);
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
    });

    // Проверяем объекты
    const objects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        manager: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    console.log(`\n🏢 Объекты (${objects.length}):`);
    objects.forEach(obj => {
      console.log(`   - ${obj.name} (${obj.address})`);
      if (obj.manager) {
        console.log(`     Менеджер: ${obj.manager.name}`);
      }
    });

    // Проверяем лимиты инвентаря
    const limits = await prisma.inventoryLimit.findMany({
      include: {
        object: {
          select: {
            name: true
          }
        }
      }
    });
    console.log(`\n💰 Лимиты инвентаря (${limits.length}):`);
    limits.forEach(limit => {
      console.log(`   - ${limit.object.name}: ${limit.amount}₽ (${limit.month}/${limit.year})`);
    });

    // Проверяем расходы
    const expenses = await prisma.inventoryExpense.findMany({
      include: {
        object: {
          select: {
            name: true
          }
        }
      }
    });
    console.log(`\n💸 Расходы (${expenses.length}):`);
    expenses.forEach(expense => {
      console.log(`   - ${expense.object.name}: ${expense.amount}₽ (${expense.description})`);
    });

    console.log('\n✅ Проверка завершена');

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
