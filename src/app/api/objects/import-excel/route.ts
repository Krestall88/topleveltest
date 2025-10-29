import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

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

export async function GET(req: NextRequest) {
  console.log('📊 EXCEL IMPORT: Анализ структуры Excel файла');
  
  try {
    const user = await getUserFromToken(req);
    if (!user || !['ADMIN', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    // Читаем Excel файл
    const filePath = path.join(process.cwd(), 'data', 'objects.xlsx');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        message: 'Файл objects.xlsx не найден в папке data/' 
      }, { status: 404 });
    }

    console.log('📊 EXCEL: Чтение файла:', filePath);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Получаем данные как массив объектов
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rawData.length === 0) {
      return NextResponse.json({ 
        message: 'Файл пустой или не содержит данных' 
      }, { status: 400 });
    }

    // Первая строка - заголовки
    const headers = rawData[0] as string[];
    const dataRows = rawData.slice(1);

    console.log('📊 EXCEL: Найдено заголовков:', headers.length);
    console.log('📊 EXCEL: Найдено строк данных:', dataRows.length);
    console.log('📊 EXCEL: Заголовки:', headers);

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

    console.log('📊 EXCEL: Обработано объектов:', objects.length);
    
    // Находим менеджера Брагину Катерину Юрьевну
    const manager = await prisma.user.findFirst({
      where: {
        name: {
          contains: 'Брагина',
          mode: 'insensitive'
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Файл успешно прочитан. Найдено ${objects.length} объектов.`,
      data: {
        fileName: 'objects.xlsx',
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
            type: 'string', // Можно улучшить определение типов
            required: ['название', 'name'].some(key => 
              header?.toLowerCase().includes(key)
            )
          }))
        }
      }
    });

  } catch (error) {
    console.error('❌ EXCEL IMPORT: Ошибка при чтении файла:', error);
    return NextResponse.json(
      { 
        message: 'Ошибка при чтении Excel файла', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  console.log('📊 EXCEL IMPORT: Импорт объектов из Excel файла');
  
  try {
    const user = await getUserFromToken(req);
    if (!user || !['ADMIN', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const body = await req.json();
    const { dryRun = false } = body;

    // Читаем Excel файл
    const filePath = path.join(process.cwd(), 'data', 'objects.xlsx');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        message: 'Файл objects.xlsx не найден в папке data/' 
      }, { status: 404 });
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = rawData[0] as string[];
    const dataRows = rawData.slice(1);

    // Находим менеджера Брагину Катерину Юрьевну
    const manager = await prisma.user.findFirst({
      where: {
        name: {
          contains: 'Брагина',
          mode: 'insensitive'
        }
      }
    });

    if (!manager) {
      return NextResponse.json({ 
        message: 'Менеджер Брагина Катерина Юрьевна не найдена в базе данных' 
      }, { status: 400 });
    }

    console.log('👤 EXCEL: Найден менеджер:', manager.name);

    const results = {
      success: 0,
      errors: [] as any[],
      created: [] as any[]
    };

    // Обрабатываем каждую строку
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[];
      if (!row || row.length === 0 || !row[0]) continue;

      try {
        // Создаем объект из строки
        const objectData: any = {};
        headers.forEach((header, j) => {
          if (header && row[j] !== undefined && row[j] !== null && row[j] !== '') {
            objectData[header] = row[j];
          }
        });

        // Определяем название объекта (ищем в разных возможных колонках)
        const name = objectData['Название'] || 
                    objectData['название'] || 
                    objectData['Name'] || 
                    objectData['name'] || 
                    objectData['Наименование'] ||
                    row[0]; // Первая колонка как fallback

        if (!name) {
          results.errors.push({
            row: i + 2,
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
            row: i + 2,
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
              description: objectData['Описание'] || objectData['описание'] || null,
              area: objectData['Площадь'] || objectData['площадь'] || null,
              managerId: manager.id
            }
          });

          results.created.push({
            row: i + 2,
            id: newObject.id,
            name: newObject.name,
            manager: manager.name
          });

          console.log(`✅ EXCEL: Создан объект "${newObject.name}"`);
        } else {
          // Режим предварительного просмотра
          results.created.push({
            row: i + 2,
            name: name.toString(),
            manager: manager.name,
            preview: true
          });
        }

        results.success++;

      } catch (error) {
        results.errors.push({
          row: i + 2,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
          data: row
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
        managerAssigned: {
          id: manager.id,
          name: manager.name,
          phone: manager.phone
        }
      }
    });

  } catch (error) {
    console.error('❌ EXCEL IMPORT: Ошибка при импорте:', error);
    return NextResponse.json(
      { 
        message: 'Ошибка при импорте объектов', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
