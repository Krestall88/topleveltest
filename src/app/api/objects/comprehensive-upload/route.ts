import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import * as XLSX from 'xlsx';

async function getUserFromToken(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) return null;
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, role: true, name: true, email: true }
    });
    
    return user;
  } catch (error) {
    return null;
  }
}

// Поиск менеджера по имени
async function findManagerByName(name: string) {
  if (!name || name.trim() === '') return null;
  
  const searchName = name.trim();
  
  let manager = await prisma.user.findFirst({
    where: {
      name: { equals: searchName, mode: 'insensitive' },
      role: 'MANAGER'
    }
  });
  
  if (!manager) {
    manager = await prisma.user.findFirst({
      where: {
        name: { contains: searchName, mode: 'insensitive' },
        role: 'MANAGER'
      }
    });
  }
  
  return manager;
}

// Создание или поиск техкарты
async function findOrCreateTechCard(name: string, description?: string, frequency?: string) {
  // Сначала ищем существующую
  let techCard = await prisma.techCard.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' }
    }
  });
  
  if (!techCard) {
    // Создаем новую техкарту
    techCard = await prisma.techCard.create({
      data: {
        name: name,
        description: description || name,
        frequency: frequency || 'DAILY',
        estimatedTime: 30, // По умолчанию 30 минут
        isActive: true
      }
    });
    console.log(`📋 Создана новая техкарта: ${techCard.name}`);
  }
  
  return techCard;
}

// Создание полной структуры объекта из Excel данных
async function createComprehensiveStructure(objectId: string, objectName: string, excelData: any[]) {
  console.log(`🏗️ Создание полной структуры для объекта: ${objectName}`);
  console.log(`📊 Обрабатываем ${excelData.length} строк данных`);
  
  const createdStructure = {
    sites: new Map<string, any>(),
    zones: new Map<string, any>(),
    roomGroups: new Map<string, any>(),
    rooms: new Map<string, any>(),
    techCards: new Map<string, any>(),
    roomTechCards: [] as any[]
  };
  
  try {
    for (const row of excelData) {
      const siteName = row['участок'] || 'Основной участок';
      const zoneName = row['зона'] || 'Основная зона';
      const roomGroupName = row['группа помещений'] || 'Основная группа';
      const roomName = row['помещение'] || 'Основное помещение';
      const cleaningObject = row['Объект уборки'] || '';
      const techTask = row['тех задание'] || '';
      const frequency = row['периодичность'] || 'Ежедневно';
      const notes = row['примечания'] || '';
      
      // 1. Создаем/находим участок
      const siteKey = `${siteName}`;
      if (!createdStructure.sites.has(siteKey)) {
        const site = await prisma.site.create({
          data: {
            name: siteName,
            objectId: objectId,
            comment: `Участок объекта ${objectName}`
          }
        });
        createdStructure.sites.set(siteKey, site);
        console.log(`✅ Создан участок: ${site.name} (ID: ${site.id})`);
      }
      
      const site = createdStructure.sites.get(siteKey);
      
      // 2. Создаем/находим зону
      const zoneKey = `${siteName}-${zoneName}`;
      if (!createdStructure.zones.has(zoneKey)) {
        const zone = await prisma.zone.create({
          data: {
            name: zoneName,
            siteId: site.id
          }
        });
        createdStructure.zones.set(zoneKey, zone);
        console.log(`✅ Создана зона: ${zone.name} (ID: ${zone.id})`);
      }
      
      const zone = createdStructure.zones.get(zoneKey);
      
      // 3. Создаем/находим группу помещений
      const roomGroupKey = `${siteName}-${zoneName}-${roomGroupName}`;
      if (!createdStructure.roomGroups.has(roomGroupKey)) {
        const roomGroup = await prisma.roomGroup.create({
          data: {
            name: roomGroupName,
            zoneId: zone.id
          }
        });
        createdStructure.roomGroups.set(roomGroupKey, roomGroup);
        console.log(`✅ Создана группа помещений: ${roomGroup.name} (ID: ${roomGroup.id})`);
      }
      
      const roomGroup = createdStructure.roomGroups.get(roomGroupKey);
      
      // 4. Создаем/находим помещение
      const roomKey = `${siteName}-${zoneName}-${roomGroupName}-${roomName}`;
      if (!createdStructure.rooms.has(roomKey)) {
        const room = await prisma.room.create({
          data: {
            name: roomName,
            objectId: objectId,
            roomGroupId: roomGroup.id
          }
        });
        createdStructure.rooms.set(roomKey, room);
        console.log(`✅ Создано помещение: ${room.name} (ID: ${room.id})`);
      }
      
      const room = createdStructure.rooms.get(roomKey);
      
      // 5. Создаем техкарту если есть техническое задание
      if (techTask && techTask.trim() !== '') {
        const techCardName = `${cleaningObject} - ${techTask}`.trim();
        const techCardKey = techCardName;
        
        if (!createdStructure.techCards.has(techCardKey)) {
          // Определяем частоту на основе периодичности
          let techFrequency = 'DAILY';
          const freqLower = frequency.toLowerCase();
          if (freqLower.includes('неделю') || freqLower.includes('week')) {
            techFrequency = 'WEEKLY';
          } else if (freqLower.includes('месяц') || freqLower.includes('month')) {
            techFrequency = 'MONTHLY';
          } else if (freqLower.includes('год') || freqLower.includes('year')) {
            techFrequency = 'YEARLY';
          }
          
          const techCard = await findOrCreateTechCard(
            techCardName,
            `${cleaningObject}: ${techTask}. ${notes}`.trim(),
            techFrequency
          );
          
          createdStructure.techCards.set(techCardKey, techCard);
        }
        
        const techCard = createdStructure.techCards.get(techCardKey);
        
        // 6. Привязываем техкарту к помещению
        const roomTechCardKey = `${room.id}-${techCard.id}`;
        if (!createdStructure.roomTechCards.some(rtc => rtc.key === roomTechCardKey)) {
          await prisma.room.update({
            where: { id: room.id },
            data: {
              techCards: {
                connect: { id: techCard.id }
              }
            }
          });
          
          createdStructure.roomTechCards.push({
            key: roomTechCardKey,
            roomId: room.id,
            roomName: room.name,
            techCardId: techCard.id,
            techCardName: techCard.name,
            frequency: frequency
          });
          
          console.log(`🔗 Привязана техкарта "${techCard.name}" к помещению "${room.name}"`);
        }
      }
    }
    
    return {
      sitesCount: createdStructure.sites.size,
      zonesCount: createdStructure.zones.size,
      roomGroupsCount: createdStructure.roomGroups.size,
      roomsCount: createdStructure.rooms.size,
      techCardsCount: createdStructure.techCards.size,
      roomTechCardsCount: createdStructure.roomTechCards.length,
      sites: Array.from(createdStructure.sites.values()),
      zones: Array.from(createdStructure.zones.values()),
      roomGroups: Array.from(createdStructure.roomGroups.values()),
      rooms: Array.from(createdStructure.rooms.values()),
      techCards: Array.from(createdStructure.techCards.values()),
      roomTechCards: createdStructure.roomTechCards
    };
    
  } catch (error) {
    console.error('❌ Ошибка при создании полной структуры объекта:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  console.log('📊 COMPREHENSIVE UPLOAD: Полноценная загрузка объектов из Excel');
  
  try {
    const user = await getUserFromToken(req);
    if (!user || !['ADMIN', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'Файл не выбран' }, { status: 400 });
    }

    console.log('📊 COMPREHENSIVE: Обработка файла:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Читаем файл
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let workbook: XLSX.WorkBook;
    
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (error) {
      return NextResponse.json({ 
        message: 'Ошибка при чтении файла. Убедитесь, что файл не поврежден.' 
      }, { status: 400 });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rawData.length === 0) {
      return NextResponse.json({ 
        message: 'Файл пустой или не содержит данных' 
      }, { status: 400 });
    }

    const headers = rawData[0] as string[];
    const dataRows = rawData.slice(1);

    console.log('📊 COMPREHENSIVE: Найдено заголовков:', headers.length);
    console.log('📊 COMPREHENSIVE: Заголовки:', headers);
    console.log('📊 COMPREHENSIVE: Найдено строк данных:', dataRows.length);

    // Преобразуем в объекты с правильными ключами
    const objects = dataRows
      .filter((row: any) => Array.isArray(row) && row.length > 0 && row[0])
      .map((row: any[], index) => {
        const obj: any = {};
        headers.forEach((header, i) => {
          if (header && row[i] !== undefined && row[i] !== null && row[i] !== '') {
            obj[header] = row[i];
          }
        });
        obj._rowIndex = index + 2;
        return obj;
      });

    console.log('📊 COMPREHENSIVE: Обработано строк:', objects.length);

    // Группируем по объектам
    const objectsMap = new Map<string, any[]>();
    
    for (const row of objects) {
      const objectName = row['наименование объекта'] || 
                        row['Наименование объекта'] ||
                        row['название'] || 
                        row['Название'] ||
                        row['name'] || 
                        row['Name'];
      
      if (objectName) {
        if (!objectsMap.has(objectName)) {
          objectsMap.set(objectName, []);
        }
        objectsMap.get(objectName)!.push(row);
      }
    }

    console.log('📊 COMPREHENSIVE: Найдено уникальных объектов:', objectsMap.size);

    const results = {
      success: 0,
      errors: [] as any[],
      created: [] as any[],
      managersFound: 0,
      managersNotFound: 0,
      totalStructures: {
        sites: 0,
        zones: 0,
        roomGroups: 0,
        rooms: 0,
        techCards: 0,
        roomTechCards: 0
      }
    };

    // Обрабатываем каждый объект
    for (const [objectName, objectRows] of objectsMap) {
      try {
        console.log(`\n🏢 Обработка объекта: ${objectName} (${objectRows.length} строк)`);
        
        // Получаем данные объекта из первой строки
        const firstRow = objectRows[0];
        const address = firstRow['адрес'] || firstRow['Адрес'] || 'Не указан';
        const managerName = firstRow['ФИО менеджера'] || firstRow['менеджер'];
        
        // Проверяем, не существует ли уже такой объект
        const existingObject = await prisma.cleaningObject.findFirst({
          where: { name: objectName }
        });

        if (existingObject) {
          // Очищаем существующий объект
          console.log(`🧹 Очистка существующего объекта: ${objectName}`);
          
          try {
            await fetch(`${req.url.split('/api')[0]}/api/objects/cleanup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ objectName })
            });
          } catch (cleanupError) {
            console.warn(`⚠️ Ошибка очистки объекта ${objectName}:`, cleanupError);
          }
        }

        // Ищем менеджера
        let manager = null;
        if (managerName) {
          manager = await findManagerByName(managerName);
          if (manager) {
            results.managersFound++;
            console.log(`👤 Найден менеджер: ${manager.name}`);
          } else {
            results.managersNotFound++;
            console.log(`❌ Менеджер не найден: ${managerName}`);
          }
        }

        // Создаем объект
        const newObject = await prisma.cleaningObject.create({
          data: {
            name: objectName,
            address: address,
            description: `Объект с ${objectRows.length} помещениями и задачами`,
            managerId: manager?.id || null,
            creatorId: user.id,
            autoChecklistEnabled: true,
            requirePhotoForCompletion: false,
            requireCommentForCompletion: false
          }
        });

        console.log(`✅ COMPREHENSIVE: Создан объект "${newObject.name}"`);

        // Создаем полную структуру на основе данных Excel
        const structure = await createComprehensiveStructure(newObject.id, newObject.name, objectRows);
        
        // Обновляем общую статистику
        results.totalStructures.sites += structure.sitesCount;
        results.totalStructures.zones += structure.zonesCount;
        results.totalStructures.roomGroups += structure.roomGroupsCount;
        results.totalStructures.rooms += structure.roomsCount;
        results.totalStructures.techCards += structure.techCardsCount;
        results.totalStructures.roomTechCards += structure.roomTechCardsCount;
        
        results.created.push({
          id: newObject.id,
          name: newObject.name,
          manager: manager?.name || 'Не назначен',
          managerFound: !!manager,
          rowsProcessed: objectRows.length,
          structure: {
            sites: structure.sitesCount,
            zones: structure.zonesCount,
            roomGroups: structure.roomGroupsCount,
            rooms: structure.roomsCount,
            techCards: structure.techCardsCount,
            roomTechCards: structure.roomTechCardsCount
          },
          details: {
            sites: structure.sites.map(s => s.name),
            zones: structure.zones.map(z => z.name),
            rooms: structure.rooms.map(r => r.name),
            techCards: structure.techCards.map(tc => tc.name)
          }
        });

        results.success++;

      } catch (error) {
        console.error(`❌ Ошибка при обработке объекта ${objectName}:`, error);
        results.errors.push({
          objectName,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Полноценный импорт завершен: ${results.success} объектов создано`,
      data: {
        ...results,
        fileName: file.name,
        summary: {
          objectsCreated: results.success,
          totalRows: objects.length,
          uniqueObjects: objectsMap.size,
          managersFound: results.managersFound,
          managersNotFound: results.managersNotFound,
          errors: results.errors.length,
          totalStructures: results.totalStructures
        }
      }
    });

  } catch (error) {
    console.error('❌ COMPREHENSIVE UPLOAD: Ошибка при полноценной загрузке:', error);
    return NextResponse.json(
      { 
        message: 'Ошибка при полноценной загрузке объектов', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
