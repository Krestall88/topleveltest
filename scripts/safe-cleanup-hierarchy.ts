import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * БЕЗОПАСНАЯ ОЧИСТКА ИЕРАРХИИ
 * 
 * Удаляет:
 * - Техкарты
 * - Объекты уборки
 * - Помещения
 * - Группы помещений
 * - Зоны
 * - Участки
 * 
 * НЕ удаляет:
 * - Объекты (CleaningObject)
 * - Менеджеров (User)
 * - Настройки и связи
 */
async function safeCleanupHierarchy() {
  console.log('🧹 БЕЗОПАСНАЯ ОЧИСТКА ИЕРАРХИИ\n');
  console.log('⚠️  ВНИМАНИЕ: Будут удалены только данные иерархии');
  console.log('✅ Объекты и менеджеры будут сохранены\n');
  
  try {
    // ШАГ 1: ПРОВЕРКА ТЕКУЩИХ ДАННЫХ
    console.log('📊 ШАГ 1: ПРОВЕРКА ТЕКУЩИХ ДАННЫХ...\n');
    
    const currentObjects = await prisma.cleaningObject.count();
    const currentManagers = await prisma.user.count({ where: { role: 'MANAGER' } });
    const currentTechCards = await prisma.techCard.count();
    const currentCleaningItems = await prisma.cleaningObjectItem.count();
    const currentRooms = await prisma.room.count();
    const currentRoomGroups = await prisma.roomGroup.count();
    const currentZones = await prisma.zone.count();
    const currentSites = await prisma.site.count();
    
    console.log('📋 ТЕКУЩЕЕ СОСТОЯНИЕ:');
    console.log(`  🏢 Объектов: ${currentObjects} (НЕ БУДУТ УДАЛЕНЫ)`);
    console.log(`  👤 Менеджеров: ${currentManagers} (НЕ БУДУТ УДАЛЕНЫ)`);
    console.log(`  📍 Участков: ${currentSites} (БУДУТ УДАЛЕНЫ)`);
    console.log(`  🏗️  Зон: ${currentZones} (БУДУТ УДАЛЕНЫ)`);
    console.log(`  📦 Групп помещений: ${currentRoomGroups} (БУДУТ УДАЛЕНЫ)`);
    console.log(`  🚪 Помещений: ${currentRooms} (БУДУТ УДАЛЕНЫ)`);
    console.log(`  🧹 Объектов уборки: ${currentCleaningItems} (БУДУТ УДАЛЕНЫ)`);
    console.log(`  📋 Техкарт: ${currentTechCards} (БУДУТ УДАЛЕНЫ)\n`);
    
    // ШАГ 2: УДАЛЕНИЕ В ПРАВИЛЬНОМ ПОРЯДКЕ
    console.log('🗑️  ШАГ 2: УДАЛЕНИЕ ИЕРАРХИИ (в правильном порядке)...\n');
    
    // 1. Техкарты (зависят от всего)
    console.log('  🔄 Удаление техкарт...');
    const deletedTechCards = await prisma.techCard.deleteMany({});
    console.log(`  ✅ Удалено техкарт: ${deletedTechCards.count}`);
    
    // 2. Объекты уборки (зависят от помещений)
    console.log('  🔄 Удаление объектов уборки...');
    const deletedCleaningItems = await prisma.cleaningObjectItem.deleteMany({});
    console.log(`  ✅ Удалено объектов уборки: ${deletedCleaningItems.count}`);
    
    // 3. Помещения (зависят от групп)
    console.log('  🔄 Удаление помещений...');
    const deletedRooms = await prisma.room.deleteMany({});
    console.log(`  ✅ Удалено помещений: ${deletedRooms.count}`);
    
    // 4. Группы помещений (зависят от зон)
    console.log('  🔄 Удаление групп помещений...');
    const deletedRoomGroups = await prisma.roomGroup.deleteMany({});
    console.log(`  ✅ Удалено групп помещений: ${deletedRoomGroups.count}`);
    
    // 5. Зоны (зависят от участков)
    console.log('  🔄 Удаление зон...');
    const deletedZones = await prisma.zone.deleteMany({});
    console.log(`  ✅ Удалено зон: ${deletedZones.count}`);
    
    // 6. Участки
    console.log('  🔄 Удаление участков...');
    const deletedSites = await prisma.site.deleteMany({});
    console.log(`  ✅ Удалено участков: ${deletedSites.count}\n`);
    
    // ШАГ 3: ПРОВЕРКА РЕЗУЛЬТАТА
    console.log('🔍 ШАГ 3: ПРОВЕРКА РЕЗУЛЬТАТА...\n');
    
    const finalObjects = await prisma.cleaningObject.count();
    const finalManagers = await prisma.user.count({ where: { role: 'MANAGER' } });
    const finalTechCards = await prisma.techCard.count();
    const finalCleaningItems = await prisma.cleaningObjectItem.count();
    const finalRooms = await prisma.room.count();
    const finalRoomGroups = await prisma.roomGroup.count();
    const finalZones = await prisma.zone.count();
    const finalSites = await prisma.site.count();
    
    console.log('📊 ФИНАЛЬНОЕ СОСТОЯНИЕ:');
    console.log(`  🏢 Объектов: ${finalObjects} (было: ${currentObjects}) ✅`);
    console.log(`  👤 Менеджеров: ${finalManagers} (было: ${currentManagers}) ✅`);
    console.log(`  📍 Участков: ${finalSites} (было: ${currentSites})`);
    console.log(`  🏗️  Зон: ${finalZones} (было: ${currentZones})`);
    console.log(`  📦 Групп помещений: ${finalRoomGroups} (было: ${currentRoomGroups})`);
    console.log(`  🚪 Помещений: ${finalRooms} (было: ${currentRooms})`);
    console.log(`  🧹 Объектов уборки: ${finalCleaningItems} (было: ${currentCleaningItems})`);
    console.log(`  📋 Техкарт: ${finalTechCards} (было: ${currentTechCards})\n`);
    
    // Проверяем что объекты и менеджеры сохранены
    if (finalObjects !== currentObjects) {
      console.error('❌ ОШИБКА: Количество объектов изменилось!');
      throw new Error('Объекты были удалены - это не должно было произойти!');
    }
    
    if (finalManagers !== currentManagers) {
      console.error('❌ ОШИБКА: Количество менеджеров изменилось!');
      throw new Error('Менеджеры были удалены - это не должно было произойти!');
    }
    
    // Проверяем что иерархия удалена
    if (finalTechCards > 0 || finalSites > 0) {
      console.error('❌ ОШИБКА: Данные иерархии не удалились полностью!');
      console.error(`   Осталось техкарт: ${finalTechCards}`);
      console.error(`   Осталось участков: ${finalSites}`);
      throw new Error('Очистка не завершена');
    }
    
    console.log('='.repeat(70));
    console.log('✅ ОЧИСТКА ЗАВЕРШЕНА УСПЕШНО!');
    console.log('='.repeat(70));
    console.log('\n📝 ИТОГ:');
    console.log(`  ✅ Объекты сохранены: ${finalObjects}`);
    console.log(`  ✅ Менеджеры сохранены: ${finalManagers}`);
    console.log(`  🗑️  Удалено участков: ${deletedSites.count}`);
    console.log(`  🗑️  Удалено зон: ${deletedZones.count}`);
    console.log(`  🗑️  Удалено групп: ${deletedRoomGroups.count}`);
    console.log(`  🗑️  Удалено помещений: ${deletedRooms.count}`);
    console.log(`  🗑️  Удалено объектов уборки: ${deletedCleaningItems.count}`);
    console.log(`  🗑️  Удалено техкарт: ${deletedTechCards.count}\n`);
    
    console.log('💡 Теперь можно загружать новые данные через Excel!\n');
    
  } catch (error: any) {
    console.error('\n❌ ОШИБКА ПРИ ОЧИСТКЕ:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск с подтверждением
console.log('⚠️  ВЫ СОБИРАЕТЕСЬ УДАЛИТЬ ВСЮ ИЕРАРХИЮ ДАННЫХ!\n');
console.log('Будут удалены:');
console.log('  - Все техкарты');
console.log('  - Все объекты уборки');
console.log('  - Все помещения');
console.log('  - Все группы помещений');
console.log('  - Все зоны');
console.log('  - Все участки\n');
console.log('НЕ будут удалены:');
console.log('  - Объекты (CleaningObject)');
console.log('  - Менеджеры (User)');
console.log('  - Настройки системы\n');

// Автоматический запуск (для скрипта)
safeCleanupHierarchy().catch(console.error);
