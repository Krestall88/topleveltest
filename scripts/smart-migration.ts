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
  console.log('🚀 УМНАЯ МИГРАЦИЯ С УЧЕТОМ ОСОБЕННОСТЕЙ ДАННЫХ\n');
  
  // ШАГ 1: ПОЛНАЯ ОЧИСТКА
  console.log('🗑️  ШАГ 1: УДАЛЕНИЕ ВСЕХ ДАННЫХ...\n');
  
  await prisma.techCard.deleteMany({});
  console.log(`  ✅ Удалены техкарты`);
  
  await prisma.cleaningObjectItem.deleteMany({});
  console.log(`  ✅ Удалены объекты уборки`);
  
  await prisma.room.deleteMany({});
  console.log(`  ✅ Удалены помещения`);
  
  await prisma.roomGroup.deleteMany({});
  console.log(`  ✅ Удалены группы помещений`);
  
  await prisma.zone.deleteMany({});
  console.log(`  ✅ Удалены зоны`);
  
  await prisma.site.deleteMany({});
  console.log(`  ✅ Удалены участки\n`);
  
  // ШАГ 2: ЗАГРУЗКА ДАННЫХ
  console.log('📥 ШАГ 2: ЗАГРУЗКА ДАННЫХ...\n');
  
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
    patterns: {
      fullHierarchy: 0,
      noRoom: 0,
      noGroup: 0,
      noZone: 0,
      noSite: 0,
    }
  };
  
  // Кэши
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
              managerId: managerId || null,
              seniorManagerId: seniorManagerId || null,
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
            data: { name: zoneName, siteId }
          });
          zoneId = zone.id;
          zoneCache.set(zoneKey, zoneId);
          stats.zonesCreated++;
        }
      }
      
      // ГРУППА ПОМЕЩЕНИЙ
      let roomGroupName = normalize(row['группа помещений']);
      let roomGroupId: string | null = null;
      
      // СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ ПЕПСИКО: если группа начинается с "Зона:", это на самом деле зона
      if (roomGroupName && roomGroupName.startsWith('Зона:') && siteId && !zoneId) {
        // Создаем зону из группы
        const zoneKey = `${siteId}:${roomGroupName}`;
        zoneId = zoneCache.get(zoneKey);
        
        if (!zoneId) {
          const zone = await prisma.zone.create({
            data: { name: roomGroupName, siteId }
          });
          zoneId = zone.id;
          zoneCache.set(zoneKey, zoneId);
          stats.zonesCreated++;
        }
        roomGroupName = null; // Сбрасываем группу
      }
      
      if (roomGroupName) {
        // Группа может быть привязана к зоне (если есть) или напрямую к участку
        const parentId = zoneId || siteId;
        
        if (parentId) {
          const groupKey = `${parentId}:${roomGroupName}`;
          roomGroupId = roomGroupCache.get(groupKey);
          
          if (!roomGroupId) {
            // Если есть зона - привязываем к зоне, иначе создаем зону с именем группы
            if (zoneId) {
              const roomGroup = await prisma.roomGroup.create({
                data: { name: roomGroupName, zoneId }
              });
              roomGroupId = roomGroup.id;
              roomGroupCache.set(groupKey, roomGroupId);
              stats.roomGroupsCreated++;
            } else if (siteId) {
              // Создаем зону с именем группы
              const zone = await prisma.zone.create({
                data: { name: roomGroupName, siteId }
              });
              zoneId = zone.id;
              zoneCache.set(`${siteId}:${roomGroupName}`, zoneId);
              stats.zonesCreated++;
              
              // И группу внутри этой зоны
              const roomGroup = await prisma.roomGroup.create({
                data: { name: roomGroupName, zoneId: zone.id }
              });
              roomGroupId = roomGroup.id;
              roomGroupCache.set(groupKey, roomGroupId);
              stats.roomGroupsCreated++;
            }
          }
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
              roomGroupId: roomGroupId || null,
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
            data: { name: cleaningItemName, roomId }
          });
          cleaningItemId = item.id;
          cleaningItemCache.set(itemKey, cleaningItemId);
          stats.cleaningItemsCreated++;
        }
      }
      
      // ТЕХКАРТА
      const techTaskName = normalize(row['тех задание']);
      
      if (techTaskName) {
        const frequency = normalize(row['периодичность']) || 'По необходимости';
        const notes = normalize(row['примечания']);
        const period = normalize(row['период']);
        
        // Определяем паттерн данных
        if (siteId && zoneId && roomGroupId && roomId && cleaningItemId) {
          stats.patterns.fullHierarchy++;
        } else if (!roomId) {
          stats.patterns.noRoom++;
        } else if (!roomGroupId) {
          stats.patterns.noGroup++;
        } else if (!zoneId) {
          stats.patterns.noZone++;
        } else if (!siteId) {
          stats.patterns.noSite++;
        }
        
        // Проверяем существование техкарты
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
      console.error(`  ❌ Ошибка в строке ${processedRows + 1}: ${error.message}`);
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
  
  console.log('\n📈 ПАТТЕРНЫ ДАННЫХ:');
  console.log(`  ✅ Полная иерархия: ${stats.patterns.fullHierarchy}`);
  console.log(`  ⚠️  Без помещения: ${stats.patterns.noRoom}`);
  console.log(`  ⚠️  Без группы: ${stats.patterns.noGroup}`);
  console.log(`  ⚠️  Без зоны: ${stats.patterns.noZone}`);
  console.log(`  ⚠️  Без участка: ${stats.patterns.noSite}`);
  
  if (stats.skipped > 0) {
    console.log(`\n⏭️  Пропущено строк: ${stats.skipped}`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ МИГРАЦИЯ ЗАВЕРШЕНА!');
  console.log('='.repeat(70) + '\n');
  
  await prisma.$disconnect();
}

main().catch(console.error);
