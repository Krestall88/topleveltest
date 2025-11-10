import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ExcelRow {
  'наименование объекта': string;
  'участок': string;
  'зона': string;
  'группа помещений': string;
  'помещение': string;
  'Объект уборки': string;
  'тех задание': string;
  'периодичность': string;
  'примечания': string;
  'период': string;
  'Менеджер объекта ФИО': string;
  'Телефон': any;
  'Старший менеджер объекта ФИО': string;
  'Телефон.1': any;
}

// Умная нормализация - пробелы считаются пустыми
function normalize(str: string | null | undefined): string | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (trimmed === '' || trimmed === ' ') return null;
  return trimmed;
}

// Маппинг названий из Excel в БД
const objectNameMapping: Record<string, string> = {
  'ООО "ПК Фарика Качества"': 'ООО «Производственная компания ФАБРИКА КАЧЕСТВА»',
  'ПАО "БыстроБанк"': 'ПАО «БыстроБанк»',
  'ООО "Медицина-АльфаСтрахования" (ООО "МедАС)': 'ООО "Медицина-АльфаСтрахования" (ООО "МедАС")',
};

async function main() {
  console.log('🚀 ПОЛНАЯ ОЧИСТКА И ПРАВИЛЬНАЯ МИГРАЦИЯ\n');
  
  // ШАГ 1: ПРОВЕРЯЕМ ЧТО ЕСТЬ В БД
  console.log('🔍 ШАГ 1: ПРОВЕРКА ТЕКУЩИХ ДАННЫХ...\n');
  
  const currentTechCards = await prisma.techCard.count();
  const currentCleaningItems = await prisma.cleaningObjectItem.count();
  const currentRooms = await prisma.room.count();
  const currentRoomGroups = await prisma.roomGroup.count();
  const currentZones = await prisma.zone.count();
  const currentSites = await prisma.site.count();
  
  console.log(`  📋 Техкарт: ${currentTechCards}`);
  console.log(`  🧹 Объектов уборки: ${currentCleaningItems}`);
  console.log(`  🚪 Помещений: ${currentRooms}`);
  console.log(`  📦 Групп помещений: ${currentRoomGroups}`);
  console.log(`  🏗️  Зон: ${currentZones}`);
  console.log(`  📍 Участков: ${currentSites}\n`);
  
  // ШАГ 2: ПОЛНАЯ ОЧИСТКА В ПРАВИЛЬНОМ ПОРЯДКЕ
  console.log('🗑️  ШАГ 2: ПОЛНАЯ ОЧИСТКА (в правильном порядке)...\n');
  
  // Сначала удаляем техкарты (они зависят от всего)
  const deletedTechCards = await prisma.techCard.deleteMany({});
  console.log(`  ✅ Удалено техкарт: ${deletedTechCards.count}`);
  
  // Затем объекты уборки (зависят от помещений)
  const deletedCleaningItems = await prisma.cleaningObjectItem.deleteMany({});
  console.log(`  ✅ Удалено объектов уборки: ${deletedCleaningItems.count}`);
  
  // Затем помещения (зависят от групп)
  const deletedRooms = await prisma.room.deleteMany({});
  console.log(`  ✅ Удалено помещений: ${deletedRooms.count}`);
  
  // Затем группы помещений (зависят от зон)
  const deletedRoomGroups = await prisma.roomGroup.deleteMany({});
  console.log(`  ✅ Удалено групп помещений: ${deletedRoomGroups.count}`);
  
  // Затем зоны (зависят от участков)
  const deletedZones = await prisma.zone.deleteMany({});
  console.log(`  ✅ Удалено зон: ${deletedZones.count}`);
  
  // И наконец участки
  const deletedSites = await prisma.site.deleteMany({});
  console.log(`  ✅ Удалено участков: ${deletedSites.count}\n`);
  
  // Проверяем что все удалено
  const checkTechCards = await prisma.techCard.count();
  const checkSites = await prisma.site.count();
  
  if (checkTechCards > 0 || checkSites > 0) {
    console.error('❌ ОШИБКА: Данные не удалились полностью!');
    console.error(`   Осталось техкарт: ${checkTechCards}`);
    console.error(`   Осталось участков: ${checkSites}\n`);
    await prisma.$disconnect();
    return;
  }
  
  console.log('✅ Все данные успешно удалены!\n');
  
  // ШАГ 3: ЗАГРУЗКА ДАННЫХ
  console.log('📥 ШАГ 3: ЗАГРУЗКА ДАННЫХ ИЗ EXCEL...\n');
  
  const jsonPath = path.join(__dirname, '..', 'objects-data.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data: ExcelRow[] = JSON.parse(rawData);
  
  console.log(`📊 Загружено строк: ${data.length}\n`);
  
  const stats = {
    sitesCreated: 0,
    zonesCreated: 0,
    roomGroupsCreated: 0,
    roomsCreated: 0,
    cleaningItemsCreated: 0,
    techCardsCreated: 0,
    skipped: 0,
  };
  
  // Кэши для предотвращения дубликатов
  const objectCache = new Map<string, string>();
  const siteCache = new Map<string, string>();
  const zoneCache = new Map<string, string>();
  const roomGroupCache = new Map<string, string>();
  const roomCache = new Map<string, string>();
  const cleaningItemCache = new Map<string, string>();
  const managerCache = new Map<string, string>();
  
  // Загружаем менеджеров
  const managers = await prisma.user.findMany({ where: { role: 'MANAGER' } });
  managers.forEach(m => { if (m.name) managerCache.set(m.name, m.id); });
  
  // Загружаем объекты
  const objects = await prisma.cleaningObject.findMany();
  objects.forEach(o => objectCache.set(o.name, o.id));
  
  console.log(`✅ Кэши загружены (Менеджеров: ${managerCache.size}, Объектов: ${objectCache.size})\n`);
  console.log('🔄 ШАГ 4: СОЗДАНИЕ ИЕРАРХИИ И ТЕХКАРТ...\n');
  
  let processedRows = 0;
  
  for (const row of data) {
    try {
      // ОБЪЕКТ
      let objectName = normalize(row['наименование объекта']);
      if (!objectName) {
        stats.skipped++;
        continue;
      }
      
      if (objectNameMapping[objectName]) {
        objectName = objectNameMapping[objectName];
      }
      
      const objectId = objectCache.get(objectName);
      if (!objectId) {
        stats.skipped++;
        continue;
      }
      
      // МЕНЕДЖЕРЫ
      const managerName = normalize(row['Менеджер объекта ФИО']);
      const managerId = managerName ? managerCache.get(managerName) : null;
      
      const seniorManagerName = normalize(row['Старший менеджер объекта ФИО']);
      const seniorManagerId = seniorManagerName ? managerCache.get(seniorManagerName) : null;
      
      // УЧАСТОК (если есть в Excel)
      const siteName = normalize(row['участок']);
      let siteId: string | null = null;
      
      if (siteName) {
        const siteKey = `${objectId}:${siteName}`;
        siteId = siteCache.get(siteKey);
        
        if (!siteId) {
          const site = await prisma.site.create({
            data: {
              name: siteName,
              objectId,
              managerId: managerId || null,
              seniorManagerId: seniorManagerId || null,
            }
          });
          siteId = site.id;
          siteCache.set(siteKey, siteId);
          stats.sitesCreated++;
        }
      }
      
      // ЗОНА И ГРУППА - УМНАЯ ЛОГИКА
      let zoneName = normalize(row['зона']);
      let roomGroupName = normalize(row['группа помещений']);
      let zoneId: string | null = null;
      let roomGroupId: string | null = null;
      
      // Если есть участок
      if (siteId) {
        // Если зона пустая, но есть группа - группа становится зоной
        if (!zoneName && roomGroupName) {
          zoneName = roomGroupName;
          roomGroupName = null;
        }
        
        // Создаем зону (если есть)
        if (zoneName) {
          const zoneKey = `${siteId}:${zoneName}`;
          zoneId = zoneCache.get(zoneKey);
          
          if (!zoneId) {
            const zone = await prisma.zone.create({
              data: { name: zoneName, siteId }
            });
            zoneId = zone.id;
            zoneCache.set(zoneKey, zoneId);
            stats.zonesCreated++;
          }
        }
        
        // Создаем группу (если есть зона И есть группа)
        if (roomGroupName && zoneId) {
          const groupKey = `${zoneId}:${roomGroupName}`;
          roomGroupId = roomGroupCache.get(groupKey);
          
          if (!roomGroupId) {
            const roomGroup = await prisma.roomGroup.create({
              data: { name: roomGroupName, zoneId }
            });
            roomGroupId = roomGroup.id;
            roomGroupCache.set(groupKey, roomGroupId);
            stats.roomGroupsCreated++;
          }
        }
      }
      
      // ПОМЕЩЕНИЕ (только если есть в Excel)
      const roomName = normalize(row['помещение']);
      let roomId: string | null = null;
      
      if (roomName) {
        // Помещение привязывается к группе (если есть) или напрямую к объекту
        const roomKey = `${objectId}:${roomGroupId || 'no-group'}:${roomName}`;
        roomId = roomCache.get(roomKey);
        
        if (!roomId) {
          const room = await prisma.room.create({
            data: {
              name: roomName,
              objectId,
              roomGroupId: roomGroupId || null,
            }
          });
          roomId = room.id;
          roomCache.set(roomKey, roomId);
          stats.roomsCreated++;
        }
      }
      
      // ОБЪЕКТ УБОРКИ (только если есть помещение И есть объект уборки в Excel)
      const cleaningItemName = normalize(row['Объект уборки']);
      let cleaningItemId: string | null = null;
      
      if (cleaningItemName && roomId) {
        const itemKey = `${roomId}:${cleaningItemName}`;
        cleaningItemId = cleaningItemCache.get(itemKey);
        
        if (!cleaningItemId) {
          const item = await prisma.cleaningObjectItem.create({
            data: { name: cleaningItemName, roomId }
          });
          cleaningItemId = item.id;
          cleaningItemCache.set(itemKey, cleaningItemId);
          stats.cleaningItemsCreated++;
        }
      }
      
      // ТЕХКАРТА (всегда создается)
      const techTaskName = normalize(row['тех задание']);
      
      if (techTaskName) {
        const frequency = normalize(row['периодичность']) || 'По необходимости';
        const notes = normalize(row['примечания']);
        const period = normalize(row['период']);
        
        // Создаем техкарту с привязкой к максимально доступному уровню иерархии
        await prisma.techCard.create({
          data: {
            name: techTaskName,
            workType: 'Уборка',
            frequency,
            notes,
            period,
            seasonality: period,
            objectId,
            roomId: roomId || null,
            cleaningObjectItemId: cleaningItemId || null,
          }
        });
        stats.techCardsCreated++;
      }
      
      processedRows++;
      
      if (processedRows % 500 === 0) {
        console.log(`  📊 Обработано: ${processedRows}/${data.length}`);
      }
      
    } catch (error: any) {
      console.error(`  ❌ Ошибка в строке ${processedRows + 1}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Обработано строк: ${processedRows}/${data.length}\n`);
  
  // ФИНАЛЬНАЯ ПРОВЕРКА
  console.log('='.repeat(70));
  console.log('📊 ФИНАЛЬНАЯ СТАТИСТИКА');
  console.log('='.repeat(70) + '\n');
  
  console.log('✅ СОЗДАНО:');
  console.log(`  📍 Участки: ${stats.sitesCreated}`);
  console.log(`  🏗️  Зоны: ${stats.zonesCreated}`);
  console.log(`  📦 Группы помещений: ${stats.roomGroupsCreated}`);
  console.log(`  🚪 Помещения: ${stats.roomsCreated}`);
  console.log(`  🧹 Объекты уборки: ${stats.cleaningItemsCreated}`);
  console.log(`  📋 Техкарты: ${stats.techCardsCreated}`);
  
  if (stats.skipped > 0) {
    console.log(`\n⏭️  Пропущено строк: ${stats.skipped}`);
  }
  
  // Проверяем что все создалось
  const finalTechCards = await prisma.techCard.count();
  const finalSites = await prisma.site.count();
  const finalZones = await prisma.zone.count();
  const finalRoomGroups = await prisma.roomGroup.count();
  const finalRooms = await prisma.room.count();
  const finalCleaningItems = await prisma.cleaningObjectItem.count();
  
  console.log('\n🔍 ПРОВЕРКА В БД:');
  console.log(`  📍 Участков: ${finalSites}`);
  console.log(`  🏗️  Зон: ${finalZones}`);
  console.log(`  📦 Групп помещений: ${finalRoomGroups}`);
  console.log(`  🚪 Помещений: ${finalRooms}`);
  console.log(`  🧹 Объектов уборки: ${finalCleaningItems}`);
  console.log(`  📋 Техкарт: ${finalTechCards}`);
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ МИГРАЦИЯ ЗАВЕРШЕНА!');
  console.log('='.repeat(70) + '\n');
  
  await prisma.$disconnect();
}

main().catch(console.error);
