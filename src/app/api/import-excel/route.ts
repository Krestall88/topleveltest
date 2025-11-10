import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

// Умная нормализация - пробелы считаются пустыми
function normalize(str: string | null | undefined): string | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (trimmed === '' || trimmed === ' ') return null;
  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const objectName = formData.get('objectName') as string;
    const clearExisting = formData.get('clearExisting') === 'true';
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не загружен' }, { status: 400 });
    }
    
    if (!objectName) {
      return NextResponse.json({ error: 'Название объекта не указано' }, { status: 400 });
    }
    
    // Читаем Excel файл
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Проверяем что объект существует
    const cleaningObject = await prisma.cleaningObject.findFirst({
      where: { name: objectName }
    });
    
    if (!cleaningObject) {
      return NextResponse.json({ error: `Объект "${objectName}" не найден` }, { status: 404 });
    }
    
    const objectId = cleaningObject.id;
    
    // Если нужно очистить существующие данные
    if (clearExisting) {
      await prisma.techCard.deleteMany({ where: { objectId } });
      await prisma.cleaningObjectItem.deleteMany({ where: { room: { objectId } } });
      await prisma.room.deleteMany({ where: { objectId } });
      await prisma.roomGroup.deleteMany({ where: { zone: { site: { objectId } } } });
      await prisma.zone.deleteMany({ where: { site: { objectId } } });
      await prisma.site.deleteMany({ where: { objectId } });
    }
    
    const stats = {
      sitesCreated: 0,
      zonesCreated: 0,
      roomGroupsCreated: 0,
      roomsCreated: 0,
      cleaningItemsCreated: 0,
      techCardsCreated: 0,
      skipped: 0,
    };
    
    // Кэши
    const siteCache = new Map<string, string>();
    const zoneCache = new Map<string, string>();
    const roomGroupCache = new Map<string, string>();
    const roomCache = new Map<string, string>();
    const cleaningItemCache = new Map<string, string>();
    const managerCache = new Map<string, string>();
    
    // Загружаем менеджеров
    const managers = await prisma.user.findMany({ where: { role: 'MANAGER' } });
    managers.forEach(m => { if (m.name) managerCache.set(m.name, m.id); });
    
    // Обрабатываем каждую строку
    for (const row of data as any[]) {
      try {
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
        
        // ЗОНА И ГРУППА - УМНАЯ ЛОГИКА
        let zoneName = normalize(row['зона']);
        let roomGroupName = normalize(row['группа помещений']);
        let zoneId: string | null = null;
        let roomGroupId: string | null = null;
        
        if (siteId) {
          // Если зона пустая, но есть группа - группа становится зоной
          if (!zoneName && roomGroupName) {
            zoneName = roomGroupName;
            roomGroupName = null;
          }
          
          // Создаем зону
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
          
          // Создаем группу
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
        
      } catch (error: any) {
        console.error(`Ошибка обработки строки:`, error.message);
        stats.skipped++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Данные успешно загружены для объекта "${objectName}"`,
      stats
    });
    
  } catch (error: any) {
    console.error('Ошибка импорта:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
