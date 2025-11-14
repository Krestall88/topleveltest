import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    console.log('🔍 Проверка доступа к отчетности:', { userId: user.id, userName: user.name, userRole: user.role });

    // Админы, заместители и менеджеры могут видеть отчетность
    if (!['ADMIN', 'DEPUTY_ADMIN', 'MANAGER'].includes(user.role)) {
      console.log('❌ Доступ запрещен для роли:', user.role);
      return NextResponse.json({ message: 'Нет доступа' }, { status: 403 });
    }

    console.log('✅ Доступ разрешен для роли:', user.role);

    // Получаем объекты, которые исключены из автоматического создания задач
    let excludedIds: string[] = [];
    
    try {
      const excludedObjectIds = await prisma.$queryRaw<{objectId: string}[]>`
        SELECT "objectId" FROM "ExcludedObject"
      `;
      excludedIds = excludedObjectIds.map(e => e.objectId);
      console.log('🔍 Исключенные объекты для отчетности:', excludedIds);
    } catch (error) {
      console.log('⚠️ Таблица ExcludedObject еще не доступна');
    }

    if (excludedIds.length === 0) {
      return NextResponse.json({
        objects: []
      });
    }

    // Для менеджеров фильтруем только их объекты
    const whereClause: any = {
      id: {
        in: excludedIds
      }
    };

    if (user.role === 'MANAGER') {
      whereClause.managerId = user.id;
    }

    const objects = await prisma.cleaningObject.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        address: true,
        managerId: true,
        manager: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Добавляем поддельный счетчик задач (пока таблица ReportingTask не работает)
    const objectsWithCount = objects.map(obj => ({
      ...obj,
      _count: {
        reportingTasks: 0
      }
    }));

    return NextResponse.json({
      objects: objectsWithCount
    });

  } catch (error) {
    console.error('Ошибка получения объектов отчетности:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'DEPUTY_ADMIN') {
      return NextResponse.json({ message: 'Нет доступа' }, { status: 403 });
    }

    const { objectIds, exclude } = await req.json();

    if (!Array.isArray(objectIds)) {
      return NextResponse.json({ message: 'Неверный формат данных' }, { status: 400 });
    }

    console.log(`Обновление статуса исключения для объектов:`, objectIds, `exclude:`, exclude);

    if (exclude) {
      // Добавляем объекты в исключения через прямой SQL
      for (const objectId of objectIds) {
        try {
          await prisma.$executeRaw`
            INSERT INTO "ExcludedObject" ("id", "objectId", "excludedById", "excludedAt")
            VALUES (${randomUUID()}, ${objectId}, ${user.id}, ${new Date()})
            ON CONFLICT ("objectId") DO NOTHING
          `;
          console.log(`✅ Объект ${objectId} добавлен в исключения`);
        } catch (error) {
          console.log(`⚠️ Ошибка добавления объекта ${objectId}:`, error);
        }
      }
    } else {
      // Убираем объекты из исключений через прямой SQL
      try {
        await prisma.$executeRaw`
          DELETE FROM "ExcludedObject" 
          WHERE "objectId" = ANY(${objectIds})
        `;
        console.log(`✅ Объекты удалены из исключений:`, objectIds);
      } catch (error) {
        console.log(`⚠️ Ошибка удаления объектов:`, error);
      }
    }

    return NextResponse.json({
      message: `Статус исключения обновлен для ${objectIds.length} объектов`
    });

  } catch (error) {
    console.error('Ошибка обновления объектов отчетности:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
