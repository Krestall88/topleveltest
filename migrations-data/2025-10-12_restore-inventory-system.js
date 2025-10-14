/**
 * Миграция: Восстановление системы инвентаря после восстановления из бэкапа
 * Дата: 2025-10-12
 * Описание: Добавляет новую систему инвентаря с привязкой к объектам
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('🔄 Начало миграции: Восстановление системы инвентаря');
  
  try {
    // Проверяем, есть ли уже таблица InventoryItem
    const inventoryCount = await prisma.inventoryItem.count().catch(() => 0);
    console.log(`📊 Текущее количество позиций инвентаря: ${inventoryCount}`);

    if (inventoryCount === 0) {
      console.log('📦 Добавляем базовые позиции инвентаря...');
      
      // Получаем объекты для привязки инвентаря
      const objects = await prisma.cleaningObject.findMany({
        select: { id: true, name: true }
      });
      
      console.log(`🏢 Найдено объектов: ${objects.length}`);

      // Добавляем базовый инвентарь для первых 3 объектов
      const baseInventory = [
        {
          name: 'Моющие средства',
          description: 'Универсальные моющие средства для уборки',
          quantity: 50,
          unit: 'л',
          pricePerUnit: 150.00,
          minQuantity: 10
        },
        {
          name: 'Дезинфицирующие средства',
          description: 'Средства для дезинфекции поверхностей',
          quantity: 30,
          unit: 'л',
          pricePerUnit: 200.00,
          minQuantity: 5
        },
        {
          name: 'Салфетки микрофибра',
          description: 'Салфетки из микрофибры для уборки',
          quantity: 100,
          unit: 'шт',
          pricePerUnit: 25.00,
          minQuantity: 20
        }
      ];

      let totalAdded = 0;
      for (let i = 0; i < Math.min(3, objects.length); i++) {
        const object = objects[i];
        
        for (const item of baseInventory) {
          await prisma.inventoryItem.create({
            data: {
              ...item,
              totalValue: item.quantity * item.pricePerUnit,
              objectId: object.id
            }
          });
          totalAdded++;
        }
        
        console.log(`✅ Добавлен инвентарь для объекта: ${object.name}`);
      }
      
      console.log(`📦 Всего добавлено позиций инвентаря: ${totalAdded}`);
    } else {
      console.log('ℹ️ Инвентарь уже существует, пропускаем добавление');
    }

    // Проверяем систему лимитов и расходов
    const limitsCount = await prisma.inventoryLimit.count().catch(() => 0);
    const expensesCount = await prisma.inventoryExpense.count().catch(() => 0);
    
    console.log(`💰 Лимитов инвентаря: ${limitsCount}`);
    console.log(`💸 Расходов инвентаря: ${expensesCount}`);

    console.log('✅ Миграция системы инвентаря завершена успешно');
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Функция отката (если нужно)
async function rollback() {
  console.log('🔄 Откат миграции: Удаление добавленного инвентаря');
  
  try {
    // Удаляем только базовый инвентарь, добавленный этой миграцией
    const deleted = await prisma.inventoryItem.deleteMany({
      where: {
        name: {
          in: ['Моющие средства', 'Дезинфицирующие средства', 'Салфетки микрофибра']
        }
      }
    });
    
    console.log(`🗑️ Удалено позиций инвентаря: ${deleted.count}`);
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
