import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ExcelRow {
  'наименование объекта': string;
  [key: string]: any;
}

function normalize(str: string | null | undefined): string | null {
  if (!str || str.trim() === '' || str.trim() === ' ') return null;
  return str.trim();
}

function formatPhone(phone: number | null | undefined): string | null {
  if (!phone) return null;
  return phone.toString();
}

// Маппинг названий из Excel в БД
const objectNameMapping: Record<string, string> = {
  'ООО "ПК Фарика Качества"': 'ООО «Производственная компания ФАБРИКА КАЧЕСТВА»',
  'ПАО "БыстроБанк"': 'ПАО «БыстроБанк»',
  'ООО "Медицина-АльфаСтрахования" (ООО "МедАС)': 'ООО "Медицина-АльфаСтрахования" (ООО "МедАС")',
};

async function main() {
  console.log('🚀 ФИНАЛЬНАЯ МИГРАЦИЯ ОСТАВШИХСЯ ДАННЫХ\n');
  
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
    errors: [] as string[],
  };
  
  try {
    const objectCache = new Map<string, string>();
    const siteCache = new Map<string, string>();
    const zoneCache = new Map<string, string>();
    const roomGroupCache = new Map<string, string>();
    const roomCache = new Map<string, string>();
    const cleaningItemCache = new Map<string, string>();
    const managerCache = new Map<string, string>();
    
    // Загружаем менеджеров
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' }
    });
    managers.forEach(m => {
      if (m.name) managerCache.set(m.name, m.id);
    });
    
    // Загружаем объекты
    const objects = await prisma.cleaningObject.findMany();
    objects.forEach(o => objectCache.set(o.name, o.id));
    
    // Загружаем существующие участки
    const existingSites = await prisma.site.findMany();
    existingSites.forEach(s => {
      const key = `${s.objectId}:${s.name}`;
      siteCache.set(key, s.id);
    });
    
    // Загружаем существующие зоны
    const existingZones = await prisma.zone.findMany();
    existingZones.forEach(z => {
      const key = `${z.siteId}:${z.name}`;
      zoneCache.set(key, z.id);
    });
    
    // Загружаем существующие группы помещений
    const existingRoomGroups = await prisma.roomGroup.findMany();
    existingRoomGroups.forEach(rg => {
      const key = `${rg.zoneId}:${rg.name}`;
      roomGroupCache.set(key, rg.id);
    });
    
    // Загружаем существующие помещения
    const existingRooms = await prisma.room.findMany();
    existingRooms.forEach(r => {
      const key = `${r.objectId}:${r.roomGroupId || 'no-group'}:${r.name}`;
      roomCache.set(key, r.id);
    });
    
    // Загружаем существующие объекты уборки
    const existingCleaningItems = await prisma.cleaningObjectItem.findMany();
    existingCleaningItems.forEach(ci => {
      const key = `${ci.roomId}:${ci.name}`;
      cleaningItemCache.set(key, ci.id);
    });
    
    console.log('✅ Кэши загружены\n');
    console.log('🔄 Обработка данных...\n');
    
    let processedRows = 0;
    
    for (const row of data) {
      try {
        let objectName = normalize(row['наименование объекта']);
        if (!objectName) continue;
        
        // Применяем маппинг названий
        if (objectNameMapping[objectName]) {
          objectName = objectNameMapping[objectName];
        }
        
        // Получаем ID объекта
        let objectId = objectCache.get(objectName);
        if (!objectId) {
          stats.skipped++;
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
                roomGroupId: roomGroupId || undefined,
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
              roomId: roomId || undefined,
              cleaningObjectItemId: cleaningItemId || undefined,
            }
          });
          stats.techCardsCreated++;
        }
        
        processedRows++;
        
        if (processedRows % 500 === 0) {
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
    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
    console.log('='.repeat(60) + '\n');
    
    console.log('✅ СОЗДАНО:');
    console.log(`  Участки: ${stats.sitesCreated}`);
    console.log(`  Зоны: ${stats.zonesCreated}`);
    console.log(`  Группы помещений: ${stats.roomGroupsCreated}`);
    console.log(`  Помещения: ${stats.roomsCreated}`);
    console.log(`  Объекты уборки: ${stats.cleaningItemsCreated}`);
    console.log(`  Техкарты: ${stats.techCardsCreated}`);
    console.log(`\n⏭️  Пропущено: ${stats.skipped}`);
    
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
