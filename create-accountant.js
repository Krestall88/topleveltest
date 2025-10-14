const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAccountant() {
  try {
    console.log('🔐 Создание пользователя-бухгалтера...');

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash('accountant123', 10);

    // Создаем пользователя-бухгалтера
    const accountant = await prisma.user.create({
      data: {
        email: 'accountant@cleaning.com',
        name: 'Главный бухгалтер',
        phone: '+7 927 123 4567',
        password: hashedPassword,
        role: 'ACCOUNTANT'
      }
    });

    console.log('✅ Пользователь-бухгалтер создан:');
    console.log(`   Email: ${accountant.email}`);
    console.log(`   Пароль: accountant123`);
    console.log(`   Роль: ${accountant.role}`);
    console.log(`   ID: ${accountant.id}`);

    // Создаем тестовые лимиты для нескольких объектов
    console.log('\n📊 Создание тестовых лимитов...');

    // Получаем несколько объектов для установки лимитов
    const objects = await prisma.cleaningObject.findMany({
      take: 5,
      select: { id: true, name: true }
    });

    if (objects.length > 0) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      for (const object of objects) {
        // Устанавливаем лимит на текущий месяц
        await prisma.inventoryLimit.create({
          data: {
            objectId: object.id,
            amount: 50000, // 50,000 рублей
            month: currentMonth,
            year: currentYear,
            isRecurring: true,
            setById: accountant.id
          }
        });

        // Добавляем тестовые расходы
        const expenses = [
          { amount: 15000, description: 'Моющие средства' },
          { amount: 8500, description: 'Инвентарь для уборки' },
          { amount: 12000, description: 'Дезинфицирующие средства' }
        ];

        for (const expense of expenses) {
          await prisma.inventoryExpense.create({
            data: {
              objectId: object.id,
              amount: expense.amount,
              description: expense.description,
              month: currentMonth,
              year: currentYear,
              spentById: accountant.id // Временно используем бухгалтера как тратившего
            }
          });
        }

        console.log(`   ✅ Лимит 50,000₽ установлен для: ${object.name}`);
      }

      console.log(`\n📈 Создано лимитов: ${objects.length}`);
      console.log(`💰 Общая сумма лимитов: ${objects.length * 50000}₽`);
    }

    console.log('\n🎉 Система лимитов инвентаря готова к использованию!');
    console.log('\n📋 Инструкции:');
    console.log('1. Войдите как бухгалтер: accountant@cleaning.com / accountant123');
    console.log('2. Перейдите в раздел "Инвентарь"');
    console.log('3. Устанавливайте лимиты и отслеживайте расходы');

  } catch (error) {
    console.error('❌ Ошибка создания бухгалтера:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAccountant();
