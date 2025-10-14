/**
 * Миграция: Добавление данных по расходам за октябрь 2025
 * Дата: 2025-10-12
 * Описание: Добавляет лимиты 40000 руб и расходы за октябрь для 20 объектов
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Данные по расходам за октябрь 2025
const octoberExpenses = [
  { name: 'ЭЛЕКТРОЩИТ', amount: 379768.71 },
  { name: 'ИНКАТЕХ', amount: 51319.00 },
  { name: 'ЖилЭнерго, ЖЭУ-66 Волгарь', amount: 38145.00 },
  { name: 'ТяжМаш', amount: 37857.00 },
  { name: 'Фабрика качества', amount: 35621.50 },
  { name: 'Преображенка СамГМУ', amount: 32872.07 },
  { name: 'ЮГ-СЕРВИС', amount: 32635.00 },
  { name: 'ПЕПСИ', amount: 28359.00 },
  { name: 'РЖДП', amount: 27634.00 },
  { name: 'БКК', amount: 18086.16 },
  { name: 'ЯНДЕКС', amount: 14340.00 },
  { name: 'ХЛЕБЗАВОД №5', amount: 10842.30 },
  { name: 'Амонд УК', amount: 8043.00 },
  { name: 'Санаторий Красная Глинка', amount: 5946.00 },
  { name: 'Молодогвардейская ул.', amount: 5737.00 },
  { name: 'ООО "Альфа"', amount: 4488.00 },
  { name: 'ПАО "Самараэнерго"', amount: 3747.00 },
  { name: 'МЕЖКВАРТАЛКА, БЦ Сфера', amount: 3023.50 },
  { name: 'УК Юг-сервис Желябово', amount: 2832.00 },
  { name: 'Спартак ТСЖ', amount: 480.00 }
];

async function migrate() {
  console.log('🔄 Начало миграции: Добавление данных по расходам за октябрь 2025');
  
  try {
    // Получаем всех админов для создания записей
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      throw new Error('Не найден администратор для создания записей');
    }

    let processedObjects = 0;
    let createdLimits = 0;
    let createdExpenses = 0;

    for (const expenseData of octoberExpenses) {
      // Ищем объект по части названия (гибкий поиск)
      const objects = await prisma.cleaningObject.findMany({
        where: {
          OR: [
            { name: { contains: expenseData.name, mode: 'insensitive' } },
            { name: { contains: expenseData.name.split(' ')[0], mode: 'insensitive' } }
          ]
        }
      });

      if (objects.length === 0) {
        console.log(`⚠️ Объект не найден для: ${expenseData.name}`);
        continue;
      }

      // Берем первый найденный объект
      const object = objects[0];
      console.log(`📋 Обрабатываем объект: ${object.name} (${expenseData.name})`);

      // Создаем лимит на октябрь 2025 (40000 руб)
      try {
        const existingLimit = await prisma.inventoryLimit.findFirst({
          where: {
            objectId: object.id,
            month: 10,
            year: 2025
          }
        });

        if (!existingLimit) {
          await prisma.inventoryLimit.create({
            data: {
              amount: 40000.00,
              month: 10,
              year: 2025,
              objectId: object.id,
              setById: admin.id
            }
          });
          createdLimits++;
          console.log(`  ✅ Создан лимит: 40000 руб`);
        } else {
          console.log(`  ℹ️ Лимит уже существует: ${existingLimit.amount} руб`);
        }
      } catch (error) {
        console.log(`  ❌ Ошибка создания лимита: ${error.message}`);
      }

      // Создаем расход за октябрь 2025
      try {
        const existingExpense = await prisma.inventoryExpense.findFirst({
          where: {
            objectId: object.id,
            month: 10,
            year: 2025,
            amount: expenseData.amount
          }
        });

        if (!existingExpense) {
          await prisma.inventoryExpense.create({
            data: {
              amount: expenseData.amount,
              description: `Расходы за октябрь 2025 - ${expenseData.name}`,
              month: 10,
              year: 2025,
              objectId: object.id,
              spentById: admin.id
            }
          });
          createdExpenses++;
          console.log(`  ✅ Создан расход: ${expenseData.amount} руб`);
        } else {
          console.log(`  ℹ️ Расход уже существует: ${existingExpense.amount} руб`);
        }
      } catch (error) {
        console.log(`  ❌ Ошибка создания расхода: ${error.message}`);
      }

      processedObjects++;
    }

    console.log('\n📊 Статистика миграции:');
    console.log(`  - Обработано объектов: ${processedObjects}/${octoberExpenses.length}`);
    console.log(`  - Создано лимитов: ${createdLimits}`);
    console.log(`  - Создано расходов: ${createdExpenses}`);

    console.log('✅ Миграция данных по расходам за октябрь завершена успешно');
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Функция отката
async function rollback() {
  console.log('🔄 Откат миграции: Удаление данных за октябрь 2025');
  
  try {
    // Удаляем расходы за октябрь 2025
    const deletedExpenses = await prisma.inventoryExpense.deleteMany({
      where: {
        month: 10,
        year: 2025
      }
    });

    // Удаляем лимиты за октябрь 2025
    const deletedLimits = await prisma.inventoryLimit.deleteMany({
      where: {
        month: 10,
        year: 2025
      }
    });

    console.log(`🗑️ Удалено расходов: ${deletedExpenses.count}`);
    console.log(`🗑️ Удалено лимитов: ${deletedLimits.count}`);
    console.log('✅ Откат миграции завершен');
    
  } catch (error) {
    console.error('❌ Ошибка отката:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск миграции
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'rollback') {
    rollback();
  } else {
    migrate();
  }
}

module.exports = { migrate, rollback };
