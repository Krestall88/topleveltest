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

export async function GET(req: NextRequest) {
  console.log('📊 EXCEL EXPORT: Экспорт объектов в Excel');
  
  try {
    const user = await getUserFromToken(req);
    if (!user || !['ADMIN', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all'; // 'all' или 'template'

    if (type === 'template') {
      // Создаем шаблон для заполнения
      const templateData = [
        {
          'Название': 'Пример: Торговый центр "Галерея"',
          'Описание': 'Торговый центр с магазинами и кафе',
          'Площадь': 2500,
          'Адрес': 'ул. Ленина, 45, г. Москва',
          'Примечания': 'Дополнительная информация об объекте'
        },
        {
          'Название': 'Пример: Офисный центр "Бизнес Плаза"',
          'Описание': 'Современный офисный центр',
          'Площадь': 15000,
          'Адрес': 'пр. Мира, 120, г. Москва',
          'Примечания': 'Класс A, 25 этажей'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Шаблон объектов');

      // Устанавливаем ширину колонок
      const columnWidths = [
        { wch: 30 }, // Название
        { wch: 40 }, // Описание
        { wch: 10 }, // Площадь
        { wch: 40 }, // Адрес
        { wch: 30 }  // Примечания
      ];
      worksheet['!cols'] = columnWidths;

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="template-objects.xlsx"'
        }
      });
    }

    // Экспорт всех существующих объектов
    const objects = await prisma.cleaningObject.findMany({
      include: {
        manager: {
          select: {
            name: true,
            phone: true,
            email: true
          }
        },
        _count: {
          select: {
            sites: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log('📊 EXPORT: Найдено объектов для экспорта:', objects.length);

    const exportData = objects.map(obj => ({
      'ID': obj.id,
      'Название': obj.name,
      'Описание': obj.description || '',
      'Площадь': obj.area || '',
      'Менеджер': obj.manager?.name || 'Не назначен',
      'Телефон менеджера': obj.manager?.phone || '',
      'Email менеджера': obj.manager?.email || '',
      'Количество участков': obj._count.sites,
      'Дата создания': obj.createdAt.toLocaleDateString('ru-RU'),
      'Примечания': ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Объекты');

    // Устанавливаем ширину колонок
    const columnWidths = [
      { wch: 10 }, // ID
      { wch: 30 }, // Название
      { wch: 40 }, // Описание
      { wch: 10 }, // Площадь
      { wch: 25 }, // Менеджер
      { wch: 18 }, // Телефон
      { wch: 25 }, // Email
      { wch: 15 }, // Участки
      { wch: 12 }, // Дата
      { wch: 30 }  // Примечания
    ];
    worksheet['!cols'] = columnWidths;

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `objects-export-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });

  } catch (error) {
    console.error('❌ EXCEL EXPORT: Ошибка при экспорте:', error);
    return NextResponse.json(
      { 
        message: 'Ошибка при экспорте объектов', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
