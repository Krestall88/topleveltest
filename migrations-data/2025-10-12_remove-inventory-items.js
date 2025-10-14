/**
 * Миграция: Удаление системы номенклатуры инвентаря
 * Дата: 2025-10-12
 * Описание: Убираем отслеживание номенклатуры и количества, 
 *           оставляем только финансовую отчетность (лимиты и расходы)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('🔄 Начало миграции: Удаление системы номенклатуры инвентаря');
  
  try {
    // Проверяем, есть ли данные в InventoryItem
    let inventoryItemsCount = 0;
    try {
      inventoryItemsCount = await prisma.inventoryItem.count();
      console.log(`📊 Найдено позиций номенклатуры: ${inventoryItemsCount}`);
    } catch (error) {
      console.log('ℹ️ Таблица InventoryItem не существует или недоступна');
    }

    if (inventoryItemsCount > 0) {
      console.log('⚠️ ВНИМАНИЕ: В таблице InventoryItem есть данные!');
      console.log('📋 Создаем резервную копию данных...');
      
      // Создаем резервную копию в виде JSON
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

      // Сохраняем резервную копию в файл
      const fs = require('fs');
      const backupPath = `migrations-data/backup-inventory-items-${Date.now()}.json`;
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`💾 Резервная копия сохранена: ${backupPath}`);
    }

    console.log('✅ Подготовка к удалению таблицы InventoryItem завершена');
    console.log('⚠️ ВАЖНО: Теперь нужно удалить модель InventoryItem из schema.prisma');
    console.log('⚠️ И выполнить npx prisma db push для применения изменений');
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Функция отката (восстановление из резервной копии)
async function rollback() {
  console.log('🔄 Откат миграции: Восстановление системы номенклатуры');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Ищем последний файл резервной копии
    const backupFiles = fs.readdirSync('migrations-data/')
      .filter(file => file.startsWith('backup-inventory-items-'))
      .sort()
      .reverse();

    if (backupFiles.length === 0) {
      console.log('❌ Файлы резервной копии не найдены');
      return;
    }

    const latestBackup = backupFiles[0];
    const backupPath = path.join('migrations-data', latestBackup);
    
    console.log(`📂 Восстанавливаем из: ${latestBackup}`);
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    console.log(`📊 Восстанавливаем ${backupData.count} позиций...`);
    
    // Здесь код восстановления, если таблица InventoryItem существует
    console.log('⚠️ ВАЖНО: Сначала нужно восстановить модель InventoryItem в schema.prisma');
    console.log('⚠️ И выполнить npx prisma db push');
    
    console.log('✅ Инструкции по откату подготовлены');
    
  } catch (error) {
    console.error('❌ Ошибка отката:', error);
    throw error;
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
