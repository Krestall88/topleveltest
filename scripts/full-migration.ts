import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ExcelRow {
  'наименование объекта': string;
  'адрес': string;
  'участок': string | null;
  'зона': string | null;
  'группа помещений': string | null;
  'помещение': string | null;
  'Объект уборки': string;
  'тех задание': string;
  'периодичность': string;
  'примечания': string | null;
  'период': string | null;
  'Менеджер объекта ФИО': string;
  'Телефон': number;
  'Старший менеджер объекта ФИО': string | null;
  'Телефон.1': number | null;
}

function normalize(str: string | null | undefined): string | null {
  if (!str || str.trim() === '' || str.trim() === ' ') return null;
  return str.trim();
}

function formatPhone(phone: number | null | undefined): string | null {
  if (!phone) return null;
  return phone.toString();
}

async function main() {
  console.log('🚀 ПОЛНАЯ МИГРАЦИЯ ДАННЫХ ИЗ EXCEL\n');
  
  const jsonPath = path.join(__dirname, '..', 'objects-data.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data: ExcelRow[] = JSON.parse(rawData);
  
  console.log(`📊 Загружено строк: ${data.length}\n`);
  
  const stats = {
    objectsCreated: 0,
    sitesCreated: 0,
    zonesCreated: 0,
    roomGroupsCreated: 0,
    roomsCreated: 0,
    cleaningItemsCreated: 0,
    techCardsCreated: 0,
    managersCreated: 0,
    oldDataDeleted: {
      techCards: 0,
      cleaningItems: 0,
      rooms: 0,
      roomGroups: 0,
      zones: 0,
      sites: 0,
    },
    errors: [] as string[],
  };
  
  try {
    // ШАГ 1: УДАЛЕНИЕ СТАРЫХ ДАННЫХ
    console.log('🗑️  ШАГ 1: УДАЛЕНИЕ СТАРЫХ ДАННЫХ\n');
    
    console.log('Удаляем техкарты...');
    const deletedTechCards = await prisma.techCard.deleteMany({});
    stats.oldDataDeleted.techCards = deletedTechCards.count;
    console.log(`✅ Удалено техкарт: ${deletedTechCards.count}`);
    
    console.log('Удаляем объекты уборки...');
    const deletedCleaningItems = await prisma.cleaningObjectItem.deleteMany({});
    stats.oldDataDeleted.cleaningItems = deletedCleaningItems.count;
    console.log(`✅ Удалено объектов уборки: ${deletedCleaningItems.count}`);
    
    console.log('Удаляем помещения...');
    const deletedRooms = await prisma.room.deleteMany({});
    stats.oldDataDeleted.rooms = deletedRooms.count;
    console.log(`✅ Удалено помещений: ${deletedRooms.count}`);
    
    console.log('Удаляем группы помещений...');
    const deletedRoomGroups = await prisma.roomGroup.deleteMany({});
    stats.oldDataDeleted.roomGroups = deletedRoomGroups.count;
    console.log(`✅ Удалено групп помещений: ${deletedRoomGroups.count}`);
    
    console.log('Удаляем зоны...');
    const deletedZones = await prisma.zone.deleteMany({});
    stats.oldDataDeleted.zones = deletedZones.count;
    console.log(`✅ Удалено зон: ${deletedZones.count}`);
    
    console.log('Удаляем участки...');
    const deletedSites = await prisma.site.deleteMany({});
    stats.oldDataDeleted.sites = deletedSites.count;
    console.log(`✅ Удалено участков: ${deletedSites.count}\n`);
    
    // ШАГ 2: СОЗДАНИЕ КЭШЕЙ
    console.log('📦 ШАГ 2: ПОДГОТОВКА ДАННЫХ\n');
    
    const objectCache = new Map<string, string>();
    const siteCache = new Map<string, string>();
    const zoneCache = new Map<string, string>();
    const roomGroupCache = new Map<string, string>();
    const roomCache = new Map<string, string>();
    const cleaningItemCache = new Map<string, string>();
    const managerCache = new Map<string, string>();
    
    // Загружаем существующих менеджеров
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' }
    });
    managers.forEach(m => {
      if (m.name) managerCache.set(m.name, m.id);
    });
    console.log(`✅ Загружено менеджеров: ${managers.length}`);
    
    // Загружаем существующие объекты
    const objects = await prisma.cleaningObject.findMany();
    objects.forEach(o => objectCache.set(o.name, o.id));
    console.log(`✅ Загружено объектов: ${objects.length}\n`);
    
    // Получаем админа
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) throw new Error('Администратор не найден!');
    
    // ШАГ 3: ОБРАБОТКА ДАННЫХ
    console.log('🔄 ШАГ 3: ЗАГРУЗКА НОВЫХ ДАННЫХ\n');
    console.log('Это может занять несколько минут...\n');
    
    let processedRows = 0;
    
    for (const row of data) {
      try {
        const objectName = normalize(row['наименование объекта']);
        if (!objectName) continue;
        
        // Получаем ID объекта
        let objectId = objectCache.get(objectName);
        if (!objectId) {
          console.log(`⚠️  Объект не найден: ${objectName}`);
          continue;
        }
        
        // Получаем менеджеров
        const managerName = normalize(row['Менеджер объекта ФИО']);
        const managerId = managerName ? managerCache.get(managerName) : null;
        
        const seniorManagerName = normalize(row['Старший менеджер объекта ФИО']);
        const seniorManagerId = seniorManagerName ? managerCache.get(seniorManagerName) : null;
        
        // УЧАСТОК
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
                managerId: managerId || undefined,
                seniorManagerId: seniorManagerId || undefined,
              }
            });
            siteId = site.id;
            siteCache.set(siteKey, siteId);
            stats.sitesCreated++;
          }
        }
        
        // ЗОНА
        const zoneName = normalize(row['зона']);
        let zoneId: string | null = null;
        
        if (zoneName && siteId) {
          const zoneKey = `${siteId}:${zoneName}`;
          zoneId = zoneCache.get(zoneKey);
          
          if (!zoneId) {
            const zone = await prisma.zone.create({
              data: {
                name: zoneName,
                siteId,
              }
            });
            zoneId = zone.id;
            zoneCache.set(zoneKey, zoneId);
            stats.zonesCreated++;
          }
        }
        
        // ГРУППА ПОМЕЩЕНИЙ
        const roomGroupName = normalize(row['группа помещений']);
        let roomGroupId: string | null = null;
        
        if (roomGroupName && zoneId) {
          const groupKey = `${zoneId}:${roomGroupName}`;
          roomGroupId = roomGroupCache.get(groupKey);
          
          if (!roomGroupId) {
            const roomGroup = await prisma.roomGroup.create({
              data: {
                name: roomGroupName,
                zoneId,
              }
            });
            roomGroupId = roomGroup.id;
            roomGroupCache.set(groupKey, roomGroupId);
            stats.roomGroupsCreated++;
          }
        }
        
        // ПОМЕЩЕНИЕ
        const roomName = normalize(row['помещение']);
        let roomId: string | null = null;
        
        if (roomName) {
          const roomKey = `${objectId}:${roomGroupId || 'no-group'}:${roomName}`;
          roomId = roomCache.get(roomKey);
          
          if (!roomId) {
            const room = await prisma.room.create({
              data: {
                name: roomName,
                objectId,
                roomGroupId,
              }
            });
            roomId = room.id;
            roomCache.set(roomKey, roomId);
            stats.roomsCreated++;
          }
        }
        
        // ОБЪЕКТ УБОРКИ
        const cleaningItemName = normalize(row['Объект уборки']);
        let cleaningItemId: string | null = null;
        
        if (cleaningItemName && roomId) {
          const itemKey = `${roomId}:${cleaningItemName}`;
          cleaningItemId = cleaningItemCache.get(itemKey);
          
          if (!cleaningItemId) {
            const item = await prisma.cleaningObjectItem.create({
              data: {
                name: cleaningItemName,
                roomId,
              }
            });
            cleaningItemId = item.id;
            cleaningItemCache.set(itemKey, cleaningItemId);
            stats.cleaningItemsCreated++;
          }
        }
        
        // ТЕХКАРТА
        const techTaskName = normalize(row['тех задание']);
        const frequency = normalize(row['периодичность']) || 'По необходимости';
        const notes = normalize(row['примечания']);
        const period = normalize(row['период']);
        
        if (techTaskName) {
          await prisma.techCard.create({
            data: {
              name: techTaskName,
              workType: 'Уборка',
              frequency,
              notes,
              period,
              seasonality: period,
              objectId,
              roomId,
              cleaningObjectItemId: cleaningItemId,
            }
          });
          stats.techCardsCreated++;
        }
        
        processedRows++;
        
        // Прогресс каждые 100 строк
        if (processedRows % 100 === 0) {
          console.log(`📊 Обработано строк: ${processedRows}/${data.length}`);
        }
        
      } catch (error: any) {
        stats.errors.push(`Строка ${processedRows}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Обработано строк: ${processedRows}/${data.length}\n`);
    
  } catch (error: any) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.error(error.stack);
  } finally {
    // ИТОГОВАЯ СТАТИСТИКА
    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
    console.log('='.repeat(60) + '\n');
    
    console.log('🗑️  УДАЛЕНО:');
    console.log(`  Техкарты: ${stats.oldDataDeleted.techCards}`);
    console.log(`  Объекты уборки: ${stats.oldDataDeleted.cleaningItems}`);
    console.log(`  Помещения: ${stats.oldDataDeleted.rooms}`);
    console.log(`  Группы помещений: ${stats.oldDataDeleted.roomGroups}`);
    console.log(`  Зоны: ${stats.oldDataDeleted.zones}`);
    console.log(`  Участки: ${stats.oldDataDeleted.sites}`);
    
    console.log('\n✅ СОЗДАНО:');
    console.log(`  Участки: ${stats.sitesCreated}`);
    console.log(`  Зоны: ${stats.zonesCreated}`);
    console.log(`  Группы помещений: ${stats.roomGroupsCreated}`);
    console.log(`  Помещения: ${stats.roomsCreated}`);
    console.log(`  Объекты уборки: ${stats.cleaningItemsCreated}`);
    console.log(`  Техкарты: ${stats.techCardsCreated}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  ОШИБКИ (${stats.errors.length}):`);
      stats.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
      if (stats.errors.length > 10) {
        console.log(`  ... и еще ${stats.errors.length - 10} ошибок`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ МИГРАЦИЯ ЗАВЕРШЕНА!');
    console.log('='.repeat(60) + '\n');
    
    await prisma.$disconnect();
  }
}

main().catch(console.error);
