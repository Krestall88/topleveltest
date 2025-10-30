import { NextRequest, NextResponse } from 'next/server';
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
    
    return { id: payload.userId as string, role: payload.role as string };
  } catch (error) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  console.log('📊 EXCEL ANALYZE: Анализ эталонного файла objects.xlsx');
  
  try {
    const user = await getUserFromToken(req);
    if (!user || !['ADMIN', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    // Читаем эталонный файл
    const filePath = path.join(process.cwd(), 'data', 'objects.xlsx');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        message: 'Эталонный файл objects.xlsx не найден в папке data/' 
      }, { status: 404 });
    }

    console.log('📊 ANALYZE: Чтение эталонного файла:', filePath);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Получаем данные как массив объектов
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rawData.length === 0) {
      return NextResponse.json({ 
        message: 'Эталонный файл пустой или не содержит данных' 
      }, { status: 400 });
    }

    // Первая строка - заголовки (эталон)
    const headers = rawData[0] as string[];
    const dataRows = rawData.slice(1);

    console.log('📊 ANALYZE: Найдено заголовков в эталоне:', headers.length);
    console.log('📊 ANALYZE: Заголовки:', headers);
    console.log('📊 ANALYZE: Строк данных:', dataRows.length);

    // Анализируем структуру данных
    const sampleData: any = {};
    if (dataRows.length > 0) {
      const firstRow = dataRows[0] as any[];
      headers.forEach((header, i) => {
        if (header && firstRow[i] !== undefined && firstRow[i] !== null && firstRow[i] !== '') {
          sampleData[header] = firstRow[i];
        }
      });
    }

    // Определяем типы полей и их назначение
    const fieldMapping = {
      // Основные поля объекта
      name: ['название', 'наименование', 'name', 'объект'],
      address: ['адрес', 'address', 'местоположение'],
      description: ['описание', 'description', 'примечание'],
      area: ['площадь', 'area', 'размер'],
      
      // Менеджер
      managerName: ['менеджер', 'manager', 'ответственный', 'руководитель'],
      managerPhone: ['телефон менеджера', 'phone', 'контакт'],
      managerEmail: ['email менеджера', 'email', 'почта'],
      
      // Рабочие параметры
      workingHours: ['рабочие часы', 'время работы', 'график'],
      workingDays: ['рабочие дни', 'дни работы'],
      timezone: ['часовой пояс', 'timezone'],
      
      // Дополнительные поля
      notes: ['заметки', 'notes', 'комментарии'],
      documents: ['документы', 'documents'],
      autoChecklistEnabled: ['автоматические чеклисты', 'auto checklist'],
      requirePhotoForCompletion: ['требуется фото', 'photo required'],
      requireCommentForCompletion: ['требуется комментарий', 'comment required']
    };

    // Сопоставляем заголовки с полями БД
    const detectedFields: any = {};
    headers.forEach(header => {
      if (!header) return;
      
      const lowerHeader = header.toLowerCase();
      
      for (const [dbField, variants] of Object.entries(fieldMapping)) {
        if (variants.some(variant => lowerHeader.includes(variant))) {
          detectedFields[dbField] = header;
          break;
        }
      }
      
      // Если не нашли соответствие, добавляем как есть
      if (!Object.values(detectedFields).includes(header)) {
        detectedFields[`custom_${header.replace(/\s+/g, '_').toLowerCase()}`] = header;
      }
    });

    return NextResponse.json({
      success: true,
      message: `Эталонный файл проанализирован. Найдено ${headers.length} колонок.`,
      data: {
        fileName: 'objects.xlsx',
        sheetName,
        headers,
        totalRows: dataRows.length,
        sampleData,
        detectedFields,
        fieldMapping: {
          required: ['name'], // Только название обязательно
          optional: Object.keys(fieldMapping).filter(f => f !== 'name'),
          custom: Object.keys(detectedFields).filter(f => f.startsWith('custom_'))
        },
        structure: {
          columns: headers.map((header, index) => ({
            index,
            name: header,
            dbField: Object.keys(detectedFields).find(key => detectedFields[key] === header),
            required: ['название', 'наименование', 'name', 'объект'].some(req => 
              header?.toLowerCase().includes(req)
            ),
            sampleValue: sampleData[header] || null
          }))
        }
      }
    });

  } catch (error) {
    console.error('❌ EXCEL ANALYZE: Ошибка при анализе эталонного файла:', error);
    return NextResponse.json(
      { 
        message: 'Ошибка при анализе эталонного файла', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
