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
  
  // Поиск по точному совпадению
  let manager = await prisma.user.findFirst({
    where: {
      name: {
        equals: searchName,
        mode: 'insensitive'
      },
      role: 'MANAGER'
    }
  });
  
  if (!manager) {
    // Поиск по частичному совпадению
    manager = await prisma.user.findFirst({
      where: {
        name: {
          contains: searchName,
          mode: 'insensitive'
        },
        role: 'MANAGER'
      }
    });
  }
  
  return manager;
}

// Создание базовой структуры объекта
async function createObjectStructure(objectId: string, objectName: string) {
  console.log(`🏗️ Создание структуры для объекта: ${objectName}`);
  
  try {
    // Сначала проверяем, что объект существует
    const cleaningObject = await prisma.cleaningObject.findUnique({
      where: { id: objectId }
    });
    
    if (!cleaningObject) {
      throw new Error(`Объект с ID ${objectId} не найден`);
    }
    
    console.log(`🔍 Объект найден: ${cleaningObject.name}`);
    
    // Создаем базовый участок
    const site = await prisma.site.create({
      data: {
        name: `Участок 1 - ${objectName}`,
        objectId: objectId,
        comment: 'Автоматически созданный участок при импорте'
      }
    });
    
    console.log(`✅ Создан участок: ${site.name} (ID: ${site.id})`);
    
    // Создаем базовую зону
    const zone = await prisma.zone.create({
      data: {
        name: `Основная зона - ${objectName}`,
        siteId: site.id
      }
    });
    
    console.log(`✅ Создана зона: ${zone.name} (ID: ${zone.id})`);
    
    // Создаем базовую группу помещений
    const roomGroup = await prisma.roomGroup.create({
      data: {
        name: `Помещения - ${objectName}`,
        zoneId: zone.id
      }
    });
    
    console.log(`✅ Создана группа помещений: ${roomGroup.name} (ID: ${roomGroup.id})`);
    
    // Создаем базовое помещение
    const room = await prisma.room.create({
      data: {
        name: `Основное помещение`,
        objectId: objectId,
        roomGroupId: roomGroup.id
      }
    });
    
    console.log(`✅ Создано помещение: ${room.name} (ID: ${room.id})`);
    
    // Получаем техкарты для уборки (более точный поиск)
    const techCards = await prisma.techCard.findMany({
      where: {
        OR: [
          { name: { contains: 'уборка', mode: 'insensitive' } },
          { name: { contains: 'мытье', mode: 'insensitive' } },
          { name: { contains: 'протирка', mode: 'insensitive' } },
          { name: { contains: 'очистка', mode: 'insensitive' } },
          { name: { contains: 'cleaning', mode: 'insensitive' } }
        ]
      },
      take: 5,
      orderBy: { name: 'asc' }
    });
    
    console.log(`📋 Найдено техкарт для привязки: ${techCards.length}`);
    
    if (techCards.length === 0) {
      // Если специфичных техкарт нет, берем любые первые 3
      const anyTechCards = await prisma.techCard.findMany({
        take: 3,
        orderBy: { name: 'asc' }
      });
      
      console.log(`📋 Взяты любые техкарты: ${anyTechCards.length}`);
      
      for (const techCard of anyTechCards) {
        await prisma.room.update({
          where: { id: room.id },
          data: {
            techCards: {
              connect: { id: techCard.id }
            }
          }
        });
        
        console.log(`🔗 Привязана техкарта: ${techCard.name}`);
      }
      
      return {
        site,
        zone,
        roomGroup,
        room,
        techCardsCount: anyTechCards.length,
        techCards: anyTechCards.map(tc => tc.name)
      };
    } else {
      // Привязываем найденные техкарты к помещению
      for (const techCard of techCards) {
        await prisma.room.update({
          where: { id: room.id },
          data: {
            techCards: {
              connect: { id: techCard.id }
            }
          }
        });
        
        console.log(`🔗 Привязана техкарта: ${techCard.name}`);
      }
      
      return {
        site,
        zone,
        roomGroup,
        room,
        techCardsCount: techCards.length,
        techCards: techCards.map(tc => tc.name)
      };
    }
    
  } catch (error) {
    console.error('❌ Ошибка при создании структуры объекта:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  console.log('📊 ADVANCED UPLOAD: Расширенная загрузка объектов из Excel');
  
  try {
    const user = await getUserFromToken(req);
    if (!user || !['ADMIN', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ 
        message: 'Файл не выбран' 
      }, { status: 400 });
    }

    // Проверяем тип файла
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json({ 
        message: 'Неподдерживаемый формат файла. Поддерживаются: .xlsx, .xls, .csv' 
      }, { status: 400 });
    }

    console.log('📊 ADVANCED: Обработка файла:', {
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

    console.log('📊 ADVANCED: Найдено заголовков:', headers.length);
    console.log('📊 ADVANCED: Найдено строк данных:', dataRows.length);

    // Преобразуем в объекты
    const objects = dataRows
      .filter(row => Array.isArray(row) && row.length > 0 && row[0])
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

    console.log('📊 ADVANCED: Обработано объектов:', objects.length);

    const results = {
      success: 0,
      errors: [] as any[],
      created: [] as any[],
      managersFound: 0,
      managersNotFound: 0,
      structuresCreated: 0
    };

    // Обрабатываем каждую строку
    for (let i = 0; i < objects.length; i++) {
      const objectData = objects[i];

      try {
        // Определяем название объекта (обязательное поле)
        const name = objectData['Название'] || 
                    objectData['название'] || 
                    objectData['Наименование'] ||
                    objectData['Name'] || 
                    objectData['name'] ||
                    Object.values(objectData)[0];

        if (!name) {
          results.errors.push({
            row: objectData._rowIndex,
            error: 'Не указано название объекта (обязательное поле)',
            data: objectData
          });
          continue;
        }

        // Проверяем, не существует ли уже такой объект
        const existingObject = await prisma.cleaningObject.findFirst({
          where: { name: name.toString() }
        });

        if (existingObject) {
          results.errors.push({
            row: objectData._rowIndex,
            error: `Объект "${name}" уже существует`,
            data: objectData
          });
          continue;
        }

        // Ищем менеджера
        let manager = null;
        const managerName = objectData['Менеджер'] || 
                           objectData['менеджер'] || 
                           objectData['Manager'] ||
                           objectData['Ответственный'];

        if (managerName) {
          manager = await findManagerByName(managerName.toString());
          if (manager) {
            results.managersFound++;
            console.log(`👤 Найден менеджер: ${manager.name} для объекта ${name}`);
          } else {
            results.managersNotFound++;
            console.log(`❌ Менеджер не найден: ${managerName} для объекта ${name}`);
          }
        }

        // Создаем объект
        const newObject = await prisma.cleaningObject.create({
          data: {
            name: name.toString(),
            address: objectData['Адрес'] || objectData['адрес'] || objectData['Address'] || 'Не указан',
            description: objectData['Описание'] || objectData['описание'] || objectData['Description'] || null,
            totalArea: objectData['Площадь'] || objectData['площадь'] || objectData['Area'] || null,
            notes: objectData['Примечания'] || objectData['примечания'] || objectData['Notes'] || null,
            timezone: objectData['Часовой пояс'] || objectData['Timezone'] || null,
            workingHours: objectData['Рабочие часы'] ? 
              JSON.stringify({ 
                start: '08:00', 
                end: '20:00', 
                custom: objectData['Рабочие часы'] 
              }) : null,
            workingDays: objectData['Рабочие дни'] ? 
              objectData['Рабочие дни'].toString().split(',').map((d: string) => d.trim()) : 
              ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
            managerId: manager?.id || null,
            creatorId: user.id,
            autoChecklistEnabled: true,
            requirePhotoForCompletion: false,
            requireCommentForCompletion: false
          }
        });

        console.log(`✅ ADVANCED: Создан объект "${newObject.name}"`);

        // Создаем структуру объекта
        try {
          const structure = await createObjectStructure(newObject.id, newObject.name);
          results.structuresCreated++;
          
          results.created.push({
            row: objectData._rowIndex,
            id: newObject.id,
            name: newObject.name,
            manager: manager?.name || 'Не назначен',
            managerFound: !!manager,
            structure: {
              site: structure.site.name,
              zone: structure.zone.name,
              roomGroup: structure.roomGroup.name,
              room: structure.room.name,
              techCards: structure.techCardsCount
            }
          });
        } catch (structureError) {
          console.error(`❌ Ошибка создания структуры для ${newObject.name}:`, structureError);
          
          results.created.push({
            row: objectData._rowIndex,
            id: newObject.id,
            name: newObject.name,
            manager: manager?.name || 'Не назначен',
            managerFound: !!manager,
            structureError: 'Ошибка создания структуры'
          });
        }

        results.success++;

      } catch (error) {
        results.errors.push({
          row: objectData._rowIndex,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
          data: objectData
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Расширенный импорт завершен: ${results.success} объектов создано`,
      data: {
        ...results,
        fileName: file.name,
        summary: {
          objectsCreated: results.success,
          structuresCreated: results.structuresCreated,
          managersFound: results.managersFound,
          managersNotFound: results.managersNotFound,
          errors: results.errors.length
        }
      }
    });

  } catch (error) {
    console.error('❌ ADVANCED UPLOAD: Ошибка при расширенной загрузке:', error);
    return NextResponse.json(
      { 
        message: 'Ошибка при расширенной загрузке объектов', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
