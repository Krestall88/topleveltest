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

export async function POST(req: NextRequest) {
  console.log('📊 EXCEL UPLOAD: Загрузка и анализ Excel файла');
  
  try {
    const user = await getUserFromToken(req);
    if (!user || !['ADMIN', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const action = formData.get('action') as string; // 'analyze' или 'import'
    const dryRun = formData.get('dryRun') === 'true';

    if (!file) {
      return NextResponse.json({ 
        message: 'Файл не выбран' 
      }, { status: 400 });
    }

    // Проверяем тип файла
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json({ 
        message: 'Неподдерживаемый формат файла. Поддерживаются: .xlsx, .xls, .csv' 
      }, { status: 400 });
    }

    console.log('📊 UPLOAD: Обработка файла:', {
      name: file.name,
      size: file.size,
      type: file.type,
      action
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
    if (!sheetName) {
      return NextResponse.json({ 
        message: 'Файл не содержит листов с данными' 
      }, { status: 400 });
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rawData.length === 0) {
      return NextResponse.json({ 
        message: 'Файл пустой или не содержит данных' 
      }, { status: 400 });
    }

    // Первая строка - заголовки
    const headers = rawData[0] as string[];
    const dataRows = rawData.slice(1);

    console.log('📊 UPLOAD: Найдено заголовков:', headers.length);
    console.log('📊 UPLOAD: Найдено строк данных:', dataRows.length);

    // Преобразуем в объекты
    const objects = dataRows
      .filter(row => Array.isArray(row) && row.length > 0 && row[0]) // Фильтруем пустые строки
      .map((row: any[], index) => {
        const obj: any = {};
        headers.forEach((header, i) => {
          if (header && row[i] !== undefined && row[i] !== null && row[i] !== '') {
            obj[header] = row[i];
          }
        });
        obj._rowIndex = index + 2; // +2 потому что индекс с 0 + заголовок
        return obj;
      });

    console.log('📊 UPLOAD: Обработано объектов:', objects.length);
    
    // Находим менеджера Брагину Катерину Юрьевну
    const manager = await prisma.user.findFirst({
      where: {
        name: {
          contains: 'Брагина',
          mode: 'insensitive'
        }
      }
    });

    if (action === 'analyze') {
      // Только анализ файла
      return NextResponse.json({
        success: true,
        message: `Файл успешно прочитан. Найдено ${objects.length} объектов.`,
        data: {
          fileName: file.name,
          fileSize: file.size,
          sheetName,
          headers,
          totalRows: dataRows.length,
          validObjects: objects.length,
          defaultManager: manager ? {
            id: manager.id,
            name: manager.name,
            phone: manager.phone
          } : null,
          preview: objects.slice(0, 5), // Показываем первые 5 для предварительного просмотра
          structure: {
            detectedColumns: headers.map(header => ({
              name: header,
              type: 'string',
              required: ['название', 'name'].some(key => 
                header?.toLowerCase().includes(key)
              )
            }))
          }
        }
      });
    }

    // Импорт данных
    if (!manager) {
      return NextResponse.json({ 
        message: 'Менеджер Брагина Катерина Юрьевна не найдена в базе данных' 
      }, { status: 400 });
    }

    console.log('👤 UPLOAD: Найден менеджер:', manager.name);

    const results = {
      success: 0,
      errors: [] as any[],
      created: [] as any[]
    };

    // Обрабатываем каждую строку
    for (let i = 0; i < objects.length; i++) {
      const objectData = objects[i];

      try {
        // Определяем название объекта (ищем в разных возможных колонках)
        const name = objectData['Название'] || 
                    objectData['название'] || 
                    objectData['Name'] || 
                    objectData['name'] || 
                    objectData['Наименование'] ||
                    Object.values(objectData)[0]; // Первое значение как fallback

        if (!name) {
          results.errors.push({
            row: objectData._rowIndex,
            error: 'Не указано название объекта',
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

        if (!dryRun) {
          // Создаем объект
          const newObject = await prisma.cleaningObject.create({
            data: {
              name: name.toString(),
              address: objectData['Адрес'] || objectData['адрес'] || objectData['Address'] || 'Не указан',
              description: objectData['Описание'] || objectData['описание'] || objectData['Description'] || null,
              totalArea: objectData['Площадь'] || objectData['площадь'] || objectData['Area'] || null,
              managerId: manager.id,
              creatorId: manager.id
            }
          });

          results.created.push({
            row: objectData._rowIndex,
            id: newObject.id,
            name: newObject.name,
            manager: manager.name
          });

          console.log(`✅ UPLOAD: Создан объект "${newObject.name}"`);
        } else {
          // Режим предварительного просмотра
          results.created.push({
            row: objectData._rowIndex,
            name: name.toString(),
            manager: manager.name,
            preview: true
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
      message: dryRun 
        ? `Предварительный просмотр: ${results.success} объектов готовы к импорту`
        : `Импорт завершен: ${results.success} объектов создано`,
      data: {
        ...results,
        dryRun,
        fileName: file.name,
        managerAssigned: {
          id: manager.id,
          name: manager.name,
          phone: manager.phone
        }
      }
    });

  } catch (error) {
    console.error('❌ EXCEL UPLOAD: Ошибка при обработке файла:', error);
    return NextResponse.json(
      { 
        message: 'Ошибка при обработке файла', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
