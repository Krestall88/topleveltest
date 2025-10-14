const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function backupInventoryData() {
  try {
    console.log('📦 Создание резервной копии данных InventoryItem...');
    
    const inventoryItems = await prisma.inventoryItem.findMany({
      include: {
        object: {
          select: {
            name: true,
            address: true
          }
        }
      }
    });

    const backupData = {
      timestamp: new Date().toISOString(),
      count: inventoryItems.length,
      items: inventoryItems
    };

    const backupPath = `backup-inventory-items-${Date.now()}.json`;
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Резервная копия создана: ${backupPath}`);
    console.log(`📊 Сохранено позиций: ${inventoryItems.length}`);
    
    // Показываем содержимое для проверки
    console.log('\n📋 Содержимое резервной копии:');
    inventoryItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} - ${item.quantity} ${item.unit} (${item.object.name})`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка создания резервной копии:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backupInventoryData();
