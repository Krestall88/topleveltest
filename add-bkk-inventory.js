const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Функция для расчета параметров инвентаря на основе названия и стоимости
function calculateInventoryParams(totalValue, itemName) {
  if (itemName.includes('кг') || itemName.includes('л')) {
    // Для жидкостей и порошков
    const quantity = Math.ceil(totalValue / 200) || 1;
    const pricePerUnit = Math.round((totalValue / quantity) * 100) / 100;
    const unit = itemName.includes('кг') ? 'кг' : 'л';
    return { quantity, pricePerUnit, unit };
  } else if (itemName.includes('шт') || itemName.includes('уп')) {
    // Для штучных товаров
    const quantity = Math.ceil(totalValue / 50) || 1;
    const pricePerUnit = Math.round((totalValue / quantity) * 100) / 100;
    return { quantity, pricePerUnit, unit: 'шт' };
  } else if (itemName.includes('м') || itemName.includes('рулон')) {
    // Для тканей и рулонных материалов
    const quantity = Math.ceil(totalValue / 100) || 1;
    const pricePerUnit = Math.round((totalValue / quantity) * 100) / 100;
    return { quantity, pricePerUnit, unit: 'м' };
  } else {
    // По умолчанию - штуки
    const quantity = Math.ceil(totalValue / 100) || 1;
    const pricePerUnit = Math.round((totalValue / quantity) * 100) / 100;
    return { quantity, pricePerUnit, unit: 'шт' };
  }
}

async function addBKKInventory() {
  try {
    console.log('🔍 Поиск объекта БКК...');
    
    // Найти объект БКК (ЗАО «СБКК»)
    const bkkObject = await prisma.cleaningObject.findFirst({
      where: {
        OR: [
          { name: { contains: 'БКК', mode: 'insensitive' } },
          { name: { contains: 'СБКК', mode: 'insensitive' } }
        ]
      }
    });

    if (!bkkObject) {
      console.error('❌ Объект БКК не найден в базе данных');
      return;
    }

    console.log(`✅ Найден объект: ${bkkObject.name} (ID: ${bkkObject.id})`);

    // Данные инвентаря БКК
    const bkkInventoryData = [
      {
        name: 'Химия и хоз. инвентарь (общая позиция)',
        description: 'ФИЛИАЛ "НИЖЕГОРОДСКИЙ" АО "АЛЬФА-БАНК" - Химия и хоз. инвентарь',
        totalValue: 1405.00
      },
      {
        name: 'Ткань для пола нетканая (холстопрошивное полотно белое)',
        description: 'Ширина 160см, 50 м в рулоне. Поступление (акт, накладная, УПД) 00БП-000302 от 18.08.2025 17:15:46',
        totalValue: 2886.16
      },
      {
        name: 'Дезинфицирующее средство Ника 2 с моющим эффектом 5 кг *4',
        description: 'Поступление (акт, накладная, УПД) 00БП-000301 от 05.08.2025 23:00:00',
        totalValue: 3200.00
      },
      {
        name: 'Дезинфицирующее средство Ника 2 с моющим эффектом 5 кг *4 (дополнительная партия)',
        description: 'Поступление (акт, накладная, УПД) 00БП-000300 от 18.08.2025 17:04:15',
        totalValue: 12000.00
      }
    ];

    console.log(`📦 Добавление ${bkkInventoryData.length} позиций инвентаря для БКК...`);

    let addedCount = 0;
    let totalValue = 0;

    for (const item of bkkInventoryData) {
      try {
        // Рассчитать параметры инвентаря
        const params = calculateInventoryParams(item.totalValue, item.name);
        
        // Создать позицию инвентаря
        const inventoryItem = await prisma.inventoryItem.create({
          data: {
            name: item.name,
            description: item.description,
            quantity: params.quantity,
            unit: params.unit,
            pricePerUnit: params.pricePerUnit,
            totalValue: item.totalValue,
            minQuantity: Math.max(1, Math.ceil(params.quantity * 0.2)), // 20% от текущего количества
            objectId: bkkObject.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        console.log(`  ✅ ${item.name}: ${params.quantity} ${params.unit} по ${params.pricePerUnit} руб. = ${item.totalValue} руб.`);
        addedCount++;
        totalValue += item.totalValue;
      } catch (error) {
        console.error(`  ❌ Ошибка при добавлении "${item.name}":`, error.message);
      }
    }

    console.log('\n📊 РЕЗУЛЬТАТ:');
    console.log(`✅ Добавлено позиций: ${addedCount}`);
    console.log(`💰 Общая стоимость: ${totalValue.toLocaleString('ru-RU')} руб.`);
    console.log(`🏢 Объект: ${bkkObject.name}`);

    // Показать статистику по объекту
    const objectStats = await prisma.inventoryItem.aggregate({
      where: { objectId: bkkObject.id },
      _count: { id: true },
      _sum: { totalValue: true }
    });

    console.log('\n📈 ОБЩАЯ СТАТИСТИКА ПО БКК:');
    console.log(`📦 Всего позиций: ${objectStats._count.id}`);
    console.log(`💰 Общая стоимость инвентаря: ${(objectStats._sum.totalValue || 0).toLocaleString('ru-RU')} руб.`);

  } catch (error) {
    console.error('❌ Ошибка при добавлении инвентаря БКК:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск скрипта
addBKKInventory();
