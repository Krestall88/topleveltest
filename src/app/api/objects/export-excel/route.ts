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
      // Создаем шаблон с полной иерархией (как во втором изображении)
      const templateData = [
        {
          'наименование объекта': 'Торговый центр "Галерея"',
          'адрес': 'ул. Ленина, 45, г. Москва',
          'участок': 'Участок №1',
          'зона': 'Торговая зона 1 этаж',
          'группа помещений': 'Магазины',
          'помещение': 'Магазин №101',
          'Объект уборки': 'Напольное покрытие',
          'тех задание': 'Влажная уборка пола',
          'периодичность': 'Ежедневно',
          'примечания': 'Использовать специальное средство',
          'период': 'Круглогодично',
          'Менеджер объекта ФИО': 'Иванов Петр Сергеевич',
          'Телефон': '+7 (999) 123-45-67',
          'Старший менеджер объекта ФИО': 'Смирнова Анна Владимировна',
          'Телефон.1': '+7 (495) 987-65-43'
        },
        {
          'наименование объекта': 'Торговый центр "Галерея"',
          'адрес': 'ул. Ленина, 45, г. Москва',
          'участок': 'Участок №1',
          'зона': 'Торговая зона 1 этаж',
          'группа помещений': 'Магазины',
          'помещение': 'Магазин №101',
          'Объект уборки': 'Витрины',
          'тех задание': 'Мытье витрин',
          'периодичность': '2 раза в неделю',
          'примечания': '',
          'период': 'Круглогодично',
          'Менеджер объекта ФИО': 'Иванов Петр Сергеевич',
          'Телефон': '+7 (999) 123-45-67',
          'Старший менеджер объекта ФИО': 'Смирнова Анна Владимировна',
          'Телефон.1': '+7 (495) 987-65-43'
        },
        {
          'наименование объекта': 'Торговый центр "Галерея"',
          'адрес': 'ул. Ленина, 45, г. Москва',
          'участок': 'Участок №2',
          'зона': 'Служебные помещения',
          'группа помещений': 'Офисы',
          'помещение': 'Офис администрации',
          'Объект уборки': 'Рабочие столы',
          'тех задание': 'Протирка поверхностей',
          'периодичность': 'Ежедневно',
          'примечания': 'После 18:00',
          'период': 'Круглогодично',
          'Менеджер объекта ФИО': 'Иванов Петр Сергеевич',
          'Телефон': '+7 (999) 123-45-67',
          'Старший менеджер объекта ФИО': 'Смирнова Анна Владимировна',
          'Телефон.1': '+7 (495) 987-65-43'
        }
      ];
      
      const columnWidths = [
        { wch: 35 }, // наименование объекта
        { wch: 40 }, // адрес
        { wch: 20 }, // участок
        { wch: 25 }, // зона
        { wch: 25 }, // группа помещений
        { wch: 25 }, // помещение
        { wch: 25 }, // Объект уборки
        { wch: 40 }, // тех задание
        { wch: 20 }, // периодичность
        { wch: 35 }, // примечания
        { wch: 20 }, // период
        { wch: 30 }, // Менеджер объекта ФИО
        { wch: 18 }, // Телефон
        { wch: 35 }, // Старший менеджер объекта ФИО
        { wch: 18 }  // Телефон.1
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Шаблон объектов');

      // Устанавливаем ширину колонок
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
