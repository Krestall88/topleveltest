import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ExcelRow {
  'наименование объекта': string;
  'адрес': string;
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

function normalize(str: string | null | undefined): string | null {
  if (!str || str.trim() === '' || str.trim() === ' ') return null;
  return str.trim();
}

// Маппинг названий из Excel в БД
const objectNameMapping: Record<string, string> = {
  'ООО "ПК Фарика Качества"': 'ООО «Производственная компания ФАБРИКА КАЧЕСТВА»',
  'ПАО "БыстроБанк"': 'ПАО «БыстроБанк»',
  'ООО "Медицина-АльфаСтрахования" (ООО "МедАС)': 'ООО "Медицина-АльфаСтрахования" (ООО "МедАС")',
};

async function main() {
  console.log('🚀 ПОЛНАЯ ОЧИСТКА И ФИНАЛЬНАЯ МИГРАЦИЯ\n');
  
  // ШАГ 1: ПОЛНАЯ ОЧИСТКА
  console.log('🗑️  ШАГ 1: УДАЛЕНИЕ ВСЕХ ДАННЫХ...\n');
  
  const deletedTechCards = await prisma.techCard.deleteMany({});
  console.log(`  ✅ Удалено техкарт: ${deletedTechCards.count}`);
  
  const deletedCleaningItems = await prisma.cleaningObjectItem.deleteMany({});
  console.log(`  ✅ Удалено объектов уборки: ${deletedCleaningItems.count}`);
  
  const deletedRooms = await prisma.room.deleteMany({});
  console.log(`  ✅ Удалено помещений: ${deletedRooms.count}`);
  
  const deletedRoomGroups = await prisma.roomGroup.deleteMany({});
  console.log(`  ✅ Удалено групп помещений: ${deletedRoomGroups.count}`);
  
  const deletedZones = await prisma.zone.deleteMany({});
  console.log(`  ✅ Удалено зон: ${deletedZones.count}`);
  
  const deletedSites = await prisma.site.deleteMany({});
  console.log(`  ✅ Удалено участков: ${deletedSites.count}\n`);
  
  // ШАГ 2: ЗАГРУЗКА ДАННЫХ
  console.log('📥 ШАГ 2: ЗАГРУЗКА ДАННЫХ ИЗ EXCEL...\n');
  
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
  
  // Кэши для предотвращения дубликатов
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
  
  console.log('✅ Кэши загружены');
  console.log(`   Менеджеров: ${managerCache.size}`);
  console.log(`   Объектов: ${objectCache.size}\n`);
  
  console.log('🔄 ШАГ 3: СОЗДАНИЕ ИЕРАРХИИ...\n');
  
  let processedRows = 0;
  
  for (const row of data) {
    try {
      // ОБЪЕКТ
      let objectName = normalize(row['наименование объекта']);
      if (!objectName) {
        stats.skipped++;
        continue;
      }
      
      // Применяем маппинг названий
      if (objectNameMapping[objectName]) {
        objectName = objectNameMapping[objectName];
      }
      
      const objectId = objectCache.get(objectName);
      if (!objectId) {
        stats.skipped++;
        if (processedRows < 10) {
          console.log(`  ⚠️  Объект не найден: ${objectName}`);
        }
        continue;
      }
      
      // МЕНЕДЖЕРЫ
      const managerName = normalize(row['Менеджер объекта ФИО']);
      const managerId = managerName ? managerCache.get(managerName) : null;
      
      const seniorManagerName = normalize(row['Старший менеджер объекта ФИО']);
      const seniorManagerId = seniorManagerName ? managerCache.get(seniorManagerName) : null;
      
      // УЧАСТОК (Site)
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
      
      // ЗОНА (Zone) - создается ТОЛЬКО если есть участок
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
      
      // ГРУППА ПОМЕЩЕНИЙ (RoomGroup) - создается ТОЛЬКО если есть зона
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
      
      // ПОМЕЩЕНИЕ (Room) - создается с привязкой к группе (если есть) или напрямую к объекту
      const roomName = normalize(row['помещение']);
      let roomId: string | null = null;
      
      if (roomName) {
        // Ключ учитывает всю иерархию
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
      
      // ОБЪЕКТ УБОРКИ (CleaningObjectItem) - создается ТОЛЬКО если есть помещение
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
      
      // ТЕХКАРТА (TechCard) - создается с полной привязкой
      const techTaskName = normalize(row['тех задание']);
      
      if (techTaskName) {
        const frequency = normalize(row['периодичность']) || 'По необходимости';
        const notes = normalize(row['примечания']);
        const period = normalize(row['период']);
        
        // Создаем уникальный ключ для техкарты чтобы избежать дубликатов
        const techCardKey = `${objectId}:${roomId || 'no-room'}:${cleaningItemId || 'no-item'}:${techTaskName}:${frequency}`;
        
        // Проверяем существует ли уже такая техкарта
        const existingTechCard = await prisma.techCard.findFirst({
          where: {
            objectId,
            roomId: roomId || null,
            cleaningObjectItemId: cleaningItemId || null,
            name: techTaskName,
            frequency,
          }
        });
        
        if (!existingTechCard) {
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
      }
      
      processedRows++;
      
      if (processedRows % 500 === 0) {
        console.log(`  📊 Обработано: ${processedRows}/${data.length}`);
      }
      
    } catch (error: any) {
      stats.errors.push(`Строка ${processedRows + 1}: ${error.message}`);
      if (stats.errors.length <= 5) {
        console.error(`  ❌ Ошибка в строке ${processedRows + 1}: ${error.message}`);
      }
    }
  }
  
  console.log(`\n✅ Обработано строк: ${processedRows}/${data.length}\n`);
  
  // ФИНАЛЬНАЯ СТАТИСТИКА
  console.log('='.repeat(70));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
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
  
  if (stats.errors.length > 0) {
    console.log(`\n⚠️  ОШИБКИ (${stats.errors.length}):`);
    stats.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
    if (stats.errors.length > 10) {
      console.log(`  ... и еще ${stats.errors.length - 10} ошибок`);
    }
  }
  
  // ПРОВЕРКА ИЕРАРХИИ
  console.log('\n' + '='.repeat(70));
  console.log('🔍 ПРОВЕРКА ИЕРАРХИИ');
  console.log('='.repeat(70) + '\n');
  
  const hierarchyCheck = await prisma.cleaningObject.findMany({
    include: {
      sites: {
        include: {
          zones: {
            include: {
              roomGroups: {
                include: {
                  rooms: {
                    include: {
                      cleaningItems: true,
                      techCards: true,
                    }
                  }
                }
              }
            }
          }
        }
      },
      rooms: {
        where: {
          roomGroupId: null, // Помещения без группы
        },
        include: {
          cleaningItems: true,
          techCards: true,
        }
      },
      techCards: {
        where: {
          roomId: null, // Техкарты без помещения
        }
      }
    }
  });
  
  console.log('📊 Структура по объектам:\n');
  
  for (const obj of hierarchyCheck.slice(0, 5)) {
    console.log(`🏢 ${obj.name}`);
    console.log(`   Участков: ${obj.sites.length}`);
    
    let totalZones = 0;
    let totalRoomGroups = 0;
    let totalRooms = 0;
    let totalCleaningItems = 0;
    let totalTechCards = 0;
    
    obj.sites.forEach(site => {
      totalZones += site.zones.length;
      site.zones.forEach(zone => {
        totalRoomGroups += zone.roomGroups.length;
        zone.roomGroups.forEach(group => {
          totalRooms += group.rooms.length;
          group.rooms.forEach(room => {
            totalCleaningItems += room.cleaningItems.length;
            totalTechCards += room.techCards.length;
          });
        });
      });
    });
    
    // Добавляем помещения без группы
    totalRooms += obj.rooms.length;
    obj.rooms.forEach(room => {
      totalCleaningItems += room.cleaningItems.length;
      totalTechCards += room.techCards.length;
    });
    
    // Добавляем техкарты без помещения
    totalTechCards += obj.techCards.length;
    
    console.log(`   Зон: ${totalZones}`);
    console.log(`   Групп помещений: ${totalRoomGroups}`);
    console.log(`   Помещений: ${totalRooms}`);
    console.log(`   Объектов уборки: ${totalCleaningItems}`);
    console.log(`   Техкарт: ${totalTechCards}`);
    
    if (obj.rooms.length > 0) {
      console.log(`   ⚠️  Помещений без группы: ${obj.rooms.length}`);
    }
    if (obj.techCards.length > 0) {
      console.log(`   ⚠️  Техкарт без помещения: ${obj.techCards.length}`);
    }
    
    console.log();
  }
  
  if (hierarchyCheck.length > 5) {
    console.log(`... и еще ${hierarchyCheck.length - 5} объектов\n`);
  }
  
  console.log('='.repeat(70));
  console.log('✅ МИГРАЦИЯ ЗАВЕРШЕНА!');
  console.log('='.repeat(70) + '\n');
  
  await prisma.$disconnect();
}

main().catch(console.error);
