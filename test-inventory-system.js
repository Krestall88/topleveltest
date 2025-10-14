/**
 * Скрипт для тестирования финансовой системы инвентаря
 * Добавляет тестовые лимиты и расходы для проверки работы
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testInventorySystem() {
  try {
    console.log('🧪 Тестирование финансовой системы инвентаря...');

    // Получаем первого админа
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.log('❌ Не найден пользователь с ролью ADMIN');
      return;
    }

    console.log(`✅ Найден админ: ${admin.name}`);

    // Получаем первые 5 объектов
    const objects = await prisma.cleaningObject.findMany({
      take: 5,
      select: { id: true, name: true, address: true }
    });

    if (objects.length === 0) {
      console.log('❌ Не найдено ни одного объекта');
      return;
    }

    console.log(`✅ Найдено объектов: ${objects.length}`);

    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    // Создаем лимиты для объектов
    for (const object of objects) {
      // Проверяем, есть ли уже лимит
      const existingLimit = await prisma.inventoryLimit.findFirst({
        where: {
          objectId: object.id,
          month: month,
          year: year
        }
      });

      if (!existingLimit) {
        const limitAmount = 30000 + Math.random() * 20000; // От 30k до 50k
        
        await prisma.inventoryLimit.create({
          data: {
            objectId: object.id,
            amount: Math.round(limitAmount),
            month: month,
            year: year,
            setById: admin.id
          }
        });

        console.log(`✅ Создан лимит ${Math.round(limitAmount)} руб. для ${object.name}`);
      } else {
        console.log(`⚠️ Лимит уже существует для ${object.name}`);
      }

      // Создаем несколько расходов
      const expenseCount = Math.floor(Math.random() * 5) + 1; // 1-5 расходов
      
      for (let i = 0; i < expenseCount; i++) {
        const expenseAmount = 1000 + Math.random() * 10000; // От 1k до 11k
        const descriptions = [
          'Закупка моющих средств',
          'Покупка инвентаря',
          'Расходные материалы',
          'Химические средства',
          'Уборочный инвентарь'
        ];
        
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];

        await prisma.inventoryExpense.create({
          data: {
            objectId: object.id,
            amount: Math.round(expenseAmount),
            description: description,
            month: month,
            year: year,
            recordedById: admin.id
          }
        });

        console.log(`✅ Добавлен расход ${Math.round(expenseAmount)} руб. для ${object.name}: ${description}`);
      }
    }

    // Получаем статистику
    const totalLimits = await prisma.inventoryLimit.aggregate({
      where: { month: month, year: year },
      _sum: { amount: true },
      _count: true
    });

    const totalExpenses = await prisma.inventoryExpense.aggregate({
      where: { month: month, year: year },
      _sum: { amount: true },
      _count: true
    });

    console.log('\n📊 СТАТИСТИКА:');
    console.log(`Лимитов создано: ${totalLimits._count}`);
    console.log(`Общая сумма лимитов: ${totalLimits._sum.amount || 0} руб.`);
    console.log(`Расходов создано: ${totalExpenses._count}`);
    console.log(`Общая сумма расходов: ${totalExpenses._sum.amount || 0} руб.`);
    console.log(`Остаток: ${(totalLimits._sum.amount || 0) - (totalExpenses._sum.amount || 0)} руб.`);

    console.log('\n🎉 Тестирование завершено! Система готова к использованию.');
    console.log('🌐 Откройте http://localhost:3000/inventory для проверки');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testInventorySystem();
