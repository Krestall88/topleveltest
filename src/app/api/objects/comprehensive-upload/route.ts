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

// Поиск менеджера по имени (обычный или старший)
async function findManagerByName(name: string, isSenior: boolean = false) {
  if (!name || name.trim() === '') return null;
  
  const searchName = name.trim();
  const roles = isSenior ? ['SENIOR_MANAGER' as const, 'MANAGER' as const] : ['MANAGER' as const, 'SENIOR_MANAGER' as const];
  
  // Сначала точное совпадение
  let manager = await prisma.user.findFirst({
    where: {
      name: { equals: searchName, mode: 'insensitive' },
      role: { in: roles }
    }
  });
  
  // Если не найден, ищем по вхождению
  if (!manager) {
    manager = await prisma.user.findFirst({
      where: {
        name: { contains: searchName, mode: 'insensitive' },
        role: { in: roles }
      }
    });
  }
  
  return manager;
}

// Создание или поиск техкарты
async function findOrCreateTechCard(name: string, objectId: string, description?: string, frequency?: string, workType?: string) {
  // Сначала ищем существующую для этого объекта
  let techCard = await prisma.techCard.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      objectId: objectId
    }
  });
  
  if (!techCard) {
    // Создаем новую техкарту
    techCard = await prisma.techCard.create({
      data: {
        name: name,
        workType: workType || 'CLEANING',
        frequency: frequency || 'DAILY',
        description: description || name,
        objectId: objectId,
        isActive: true
      }
    });
    console.log(`📋 Создана новая техкарта: ${techCard.name} для объекта ${objectId}`);
  }
  
  return techCard;
}

// Умная нормализация - пробелы считаются пустыми
function normalize(str: string | null | undefined): string | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (trimmed === '' || trimmed === ' ') return null;
  return trimmed;
}

// Создание полной структуры объекта из Excel данных с умной логикой
async function createComprehensiveStructure(objectId: string, objectName: string, excelData: any[]) {
  console.log(`🏗️ Создание полной структуры для объекта: ${objectName}`);
  console.log(`📊 Обрабатываем ${excelData.length} строк данных`);
  
  const createdStructure = {
    sites: new Map<string, any>(),
    zones: new Map<string, any>(),
    roomGroups: new Map<string, any>(),
    rooms: new Map<string, any>(),
    cleaningItems: new Map<string, any>(),
    techCards: new Map<string, any>()
  };
  
  try {
    for (const row of excelData) {
      // Нормализуем все поля - пробелы = null
      let siteName = normalize((row as any)['участок']);
      let zoneName = normalize((row as any)['зона']);
      let roomGroupName = normalize((row as any)['группа помещений']);
      const roomName = normalize((row as any)['помещение']);
      const cleaningObject = normalize((row as any)['Объект уборки']);
      const techTask = normalize((row as any)['тех задание']);
      const frequency = normalize((row as any)['периодичность']) || 'По необходимости';
      const notes = normalize((row as any)['примечания']);
      const period = normalize((row as any)['период']);
      
      // Читаем менеджеров
      const siteManagerName = normalize((row as any)['менеджер участка'] || (row as any)['ФИО менеджера участка'] || (row as any)['Менеджер']);
      const seniorManager1Name = normalize((row as any)['старший менеджер 1'] || (row as any)['Старший менеджер 1']);
      const seniorManager2Name = normalize((row as any)['старший менеджер 2'] || (row as any)['Старший менеджер 2']);
      
      // Пропускаем строки без техзадания
      if (!techTask) continue;
      
      let siteId: string | null = null;
      let zoneId: string | null = null;
      let roomGroupId: string | null = null;
      let roomId: string | null = null;
      let cleaningItemId: string | null = null;
      
      // ПРАВИЛЬНАЯ ЛОГИКА ИЕРАРХИИ:
      // Создаем минимальную необходимую структуру для БД
      // Помечаем "виртуальные" уровни (которых нет в таблице) через description
      
      // Определяем первый непустой уровень
      const firstLevel = siteName ? 'site' : (zoneName ? 'zone' : (roomGroupName ? 'group' : (roomName ? 'room' : (cleaningObject ? 'item' : 'techcard'))));
      
      // 1. УЧАСТОК
      if (siteName) {
        // Реальный участок из таблицы
        const siteKey = `${siteName}`;
        if (!createdStructure.sites.has(siteKey)) {
          // Ищем менеджера участка
          let siteManager = null;
          if (siteManagerName) {
            siteManager = await findManagerByName(siteManagerName, false);
            if (siteManager) {
              console.log(`👤 Найден менеджер участка: ${siteManager.name} для участка ${siteName}`);
            } else {
              console.log(`⚠️  Менеджер участка не найден: ${siteManagerName}`);
            }
          }
          
          // Ищем старших менеджеров
          let seniorManager1 = null;
          let seniorManager2 = null;
          
          if (seniorManager1Name) {
            seniorManager1 = await findManagerByName(seniorManager1Name, true);
            if (seniorManager1) {
              console.log(`👔 Найден старший менеджер 1: ${seniorManager1.name} для участка ${siteName}`);
            } else {
              console.log(`⚠️  Старший менеджер 1 не найден: ${seniorManager1Name}`);
            }
          }
          
          if (seniorManager2Name) {
            seniorManager2 = await findManagerByName(seniorManager2Name, true);
            if (seniorManager2) {
              console.log(`👔 Найден старший менеджер 2: ${seniorManager2.name} для участка ${siteName}`);
            } else {
              console.log(`⚠️  Старший менеджер 2 не найден: ${seniorManager2Name}`);
            }
          }
          
          // ВАЖНО: В Site может быть только ОДИН seniorManagerId
          // Если указаны оба старших менеджера, берем первого, второго сохраним в комментарии
          const seniorManagerId = seniorManager1?.id || seniorManager2?.id || null;
          const seniorManagerNote = seniorManager1 && seniorManager2 
            ? `Старшие менеджеры: ${seniorManager1.name}, ${seniorManager2.name}` 
            : '';
          
          const site = await prisma.site.create({
            data: {
              name: siteName,
              objectId: objectId,
              managerId: siteManager?.id || null,
              seniorManagerId: seniorManagerId,
              comment: `Участок объекта ${objectName}${seniorManagerNote ? '. ' + seniorManagerNote : ''}`
            }
          });
          createdStructure.sites.set(siteKey, site);
          
          const managerInfo = [
            siteManager ? `менеджер: ${siteManager.name}` : null,
            seniorManager1 ? `ст.менеджер: ${seniorManager1.name}` : null,
            seniorManager2 ? `ст.менеджер 2: ${seniorManager2.name}` : null
          ].filter(Boolean).join(', ');
          
          console.log(`✅ Создан участок: ${site.name}${managerInfo ? ` (${managerInfo})` : ''}`);
        }
        siteId = createdStructure.sites.get(siteKey).id;
      } else {
        // Виртуальный участок (не показывать в UI) - ВСЕГДА создаем если нет реального
        const virtualSiteKey = `__virtual__`;
        if (!createdStructure.sites.has(virtualSiteKey)) {
          const site = await prisma.site.create({
            data: {
              name: '__VIRTUAL__',
              objectId: objectId,
              comment: `Виртуальный участок - не показывать в UI`
            }
          });
          createdStructure.sites.set(virtualSiteKey, site);
          console.log(`🔹 Создан виртуальный участок (скрыт)`);
        }
        siteId = createdStructure.sites.get(virtualSiteKey).id;
      }
      
      // 2. ЗОНА
      if (siteId) {
        if (zoneName) {
          // Реальная зона из таблицы
          const zoneKey = `${siteId}:${zoneName}`;
          if (!createdStructure.zones.has(zoneKey)) {
            const zone = await prisma.zone.create({
              data: {
                name: zoneName,
                siteId: siteId
              }
            });
            createdStructure.zones.set(zoneKey, zone);
            console.log(`✅ Создана зона: ${zone.name}`);
          }
          zoneId = createdStructure.zones.get(zoneKey).id;
        } else {
          // Виртуальная зона (не показывать в UI) - ВСЕГДА создаем если нет реальной
          const virtualZoneKey = `${siteId}:__virtual__`;
          if (!createdStructure.zones.has(virtualZoneKey)) {
            const zone = await prisma.zone.create({
              data: {
                name: '__VIRTUAL__',
                siteId: siteId
              }
            });
            createdStructure.zones.set(virtualZoneKey, zone);
            console.log(`🔹 Создана виртуальная зона (скрыта)`);
          }
          zoneId = createdStructure.zones.get(virtualZoneKey).id;
        }
      }
      
      // 3. ГРУППА ПОМЕЩЕНИЙ
      if (zoneId) {
        if (roomGroupName) {
          // Реальная группа из таблицы
          const roomGroupKey = `${zoneId}:${roomGroupName}`;
          if (!createdStructure.roomGroups.has(roomGroupKey)) {
            const roomGroup = await prisma.roomGroup.create({
              data: {
                name: roomGroupName,
                zoneId: zoneId,
                description: firstLevel === 'group' ? 'TOP_LEVEL' : null
              }
            });
            createdStructure.roomGroups.set(roomGroupKey, roomGroup);
            console.log(`✅ Создана группа: ${roomGroup.name}${firstLevel === 'group' ? ' (верхний уровень)' : ''}`);
          }
          roomGroupId = createdStructure.roomGroups.get(roomGroupKey).id;
        } else {
          // Виртуальная группа (если есть зона, но нет группы) - ВСЕГДА создаем
          const virtualGroupKey = `${zoneId}:__virtual__`;
          if (!createdStructure.roomGroups.has(virtualGroupKey)) {
            const roomGroup = await prisma.roomGroup.create({
              data: {
                name: '__VIRTUAL__',
                zoneId: zoneId,
                description: 'Виртуальная группа - не показывать в UI'
              }
            });
            createdStructure.roomGroups.set(virtualGroupKey, roomGroup);
            console.log(`🔹 Создана виртуальная группа для зоны (скрыта)`);
          }
          roomGroupId = createdStructure.roomGroups.get(virtualGroupKey).id;
        }
      }
      
      // 4. ПОМЕЩЕНИЕ
      if (roomName) {
        // Реальное помещение из таблицы
        const roomKey = `${objectId}:${roomGroupId || 'no-group'}:${roomName}`;
        if (!createdStructure.rooms.has(roomKey)) {
          const room = await prisma.room.create({
            data: {
              name: roomName,
              objectId: objectId,
              roomGroupId: roomGroupId || null,
              description: firstLevel === 'room' ? 'TOP_LEVEL' : null
            }
          });
          createdStructure.rooms.set(roomKey, room);
          console.log(`✅ Создано помещение: ${room.name}${firstLevel === 'room' ? ' (верхний уровень)' : ''}`);
        }
        roomId = createdStructure.rooms.get(roomKey).id;
      } else if (roomGroupId) {
        // Если помещения нет, но есть группа - создаем виртуальное помещение
        // (для объектов уборки или техкарт)
        const virtualRoomKey = `${objectId}:${roomGroupId}:__virtual__`;
        if (!createdStructure.rooms.has(virtualRoomKey)) {
          const room = await prisma.room.create({
            data: {
              name: '__VIRTUAL__',
              objectId: objectId,
              roomGroupId: roomGroupId,
              description: 'Виртуальное помещение - не показывать в UI'
            }
          });
          createdStructure.rooms.set(virtualRoomKey, room);
          console.log(`🔹 Создано виртуальное помещение для группы (скрыто)`);
        }
        roomId = createdStructure.rooms.get(virtualRoomKey).id;
      }
      
      // 5. ОБЪЕКТ УБОРКИ (создается если есть помещение И есть объект уборки в таблице)
      if (cleaningObject && roomId) {
        const itemKey = `${roomId}:${cleaningObject}`;
        if (!createdStructure.cleaningItems.has(itemKey)) {
          const item = await prisma.cleaningObjectItem.create({
            data: {
              name: cleaningObject,
              roomId: roomId
            }
          });
          createdStructure.cleaningItems.set(itemKey, item);
          console.log(`✅ Создан объект уборки: ${item.name}`);
        }
        cleaningItemId = createdStructure.cleaningItems.get(itemKey).id;
      }
      
      // 5. ТЕХКАРТА (всегда создается с привязкой к максимально доступному уровню)
      const techCardKey = `${objectId}:${roomId || 'no-room'}:${cleaningItemId || 'no-item'}:${techTask}`;
      
      if (!createdStructure.techCards.has(techCardKey)) {
        const techCard = await prisma.techCard.create({
          data: {
            name: techTask,
            workType: 'Уборка',
            frequency: frequency,
            notes: notes,
            period: period,
            seasonality: period,
            objectId: objectId,
            roomId: roomId || null,
            cleaningObjectItemId: cleaningItemId || null,
            isActive: true
          }
        });
        
        createdStructure.techCards.set(techCardKey, techCard);
        console.log(`✅ Создана техкарта: ${techCard.name}`);
      }
    }
    
    return {
      sitesCount: createdStructure.sites.size,
      zonesCount: createdStructure.zones.size,
      roomGroupsCount: createdStructure.roomGroups.size,
      roomsCount: createdStructure.rooms.size,
      cleaningItemsCount: createdStructure.cleaningItems.size,
      techCardsCount: createdStructure.techCards.size,
      sites: Array.from(createdStructure.sites.values()),
      zones: Array.from(createdStructure.zones.values()),
      roomGroups: Array.from(createdStructure.roomGroups.values()),
      rooms: Array.from(createdStructure.rooms.values()),
      cleaningItems: Array.from(createdStructure.cleaningItems.values()),
      techCards: Array.from(createdStructure.techCards.values())
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
      .filter((row: unknown) => Array.isArray(row) && row.length > 0 && row[0])
      .map((row: unknown, index: number) => {
        const rowArray = row as any[];
        const obj: any = {};
        headers.forEach((header, i) => {
          if (header && rowArray[i] !== undefined && rowArray[i] !== null && rowArray[i] !== '') {
            obj[header] = rowArray[i];
          }
        });
        obj._rowIndex = index + 2;
        return obj;
      });

    console.log('📊 COMPREHENSIVE: Обработано строк:', objects.length);

    // Группируем по объектам
    const objectsMap = new Map<string, any[]>();
    
    for (const row of objects) {
      const rowData = row as any;
      const objectName = rowData['наименование объекта'] || 
                        rowData['Наименование объекта'] ||
                        rowData['название'] || 
                        rowData['Название'] ||
                        rowData['name'] || 
                        rowData['Name'];
      
      if (objectName) {
        if (!objectsMap.has(objectName)) {
          objectsMap.set(objectName, []);
        }
        objectsMap.get(objectName)!.push(rowData);
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
        cleaningItems: 0,
        techCards: 0
      }
    };

    // Обрабатываем каждый объект
    for (const [objectName, objectRows] of objectsMap) {
      try {
        console.log(`\n🏢 Обработка объекта: ${objectName} (${objectRows.length} строк)`);
        
        // Получаем данные объекта из первой строки
        const firstRow = objectRows[0] as any;
        const address = firstRow['адрес'] || firstRow['Адрес'] || 'Не указан';
        const managerName = firstRow['Менеджер объекта ФИО'] || firstRow['ФИО менеджера'] || firstRow['менеджер'];
        
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

        // Проверяем, не существует ли уже такой объект
        let targetObject = await prisma.cleaningObject.findFirst({
          where: { name: objectName }
        });

        if (targetObject) {
          // Обновляем существующий объект
          console.log(`🔄 Обновление существующего объекта: ${objectName}`);
          
          targetObject = await prisma.cleaningObject.update({
            where: { id: targetObject.id },
            data: {
              address: address,
              managerId: manager?.id || null,
              description: `Объект с ${objectRows.length} задачами`
            }
          });
          
          console.log(`✅ COMPREHENSIVE: Обновлен объект "${targetObject.name}"`);
        } else {
          // Создаем новый объект
          targetObject = await prisma.cleaningObject.create({
            data: {
              name: objectName,
              address: address,
              description: `Объект с ${objectRows.length} задачами`,
              managerId: manager?.id || null,
              creatorId: user.id,
              autoChecklistEnabled: true,
              requirePhotoForCompletion: false,
              requireCommentForCompletion: false
            }
          });
          
          console.log(`✅ COMPREHENSIVE: Создан объект "${targetObject.name}"`);
        }

        // Создаем полную структуру на основе данных Excel
        const structure = await createComprehensiveStructure(targetObject.id, targetObject.name, objectRows);
        
        // Обновляем общую статистику
        results.totalStructures.sites += structure.sitesCount;
        results.totalStructures.zones += structure.zonesCount;
        results.totalStructures.roomGroups += structure.roomGroupsCount;
        results.totalStructures.rooms += structure.roomsCount;
        results.totalStructures.cleaningItems = (results.totalStructures.cleaningItems || 0) + structure.cleaningItemsCount;
        results.totalStructures.techCards += structure.techCardsCount;
        
        results.created.push({
          id: targetObject.id,
          name: targetObject.name,
          manager: manager?.name || 'Не назначен',
          managerFound: !!manager,
          rowsProcessed: objectRows.length,
          structure: {
            sites: structure.sitesCount,
            zones: structure.zonesCount,
            roomGroups: structure.roomGroupsCount,
            rooms: structure.roomsCount,
            cleaningItems: structure.cleaningItemsCount,
            techCards: structure.techCardsCount
          },
          details: {
            sites: structure.sites.map((s: any) => s.name),
            zones: structure.zones.map((z: any) => z.name),
            rooms: structure.rooms.map((r: any) => r.name),
            cleaningItems: structure.cleaningItems.map((ci: any) => ci.name),
            techCards: structure.techCards.map((tc: any) => tc.name)
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
