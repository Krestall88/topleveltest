import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ hasReportingObjects: false });
    }

    // Только для менеджеров проверяем наличие объектов в отчетности
    if (user.role !== 'MANAGER') {
      return NextResponse.json({ hasReportingObjects: false });
    }

    // Получаем объекты, которые исключены из автоматического создания задач
    let excludedIds: string[] = [];
    
    try {
      const excludedObjectIds = await prisma.$queryRaw<{objectId: string}[]>`
        SELECT "objectId" FROM "ExcludedObject"
      `;
      excludedIds = excludedObjectIds.map(e => e.objectId);
    } catch (error) {
      return NextResponse.json({ hasReportingObjects: false });
    }

    if (excludedIds.length === 0) {
      return NextResponse.json({ hasReportingObjects: false });
    }

    // Проверяем, есть ли у менеджера объекты в отчетности
    const managerReportingObjects = await prisma.cleaningObject.count({
      where: {
        id: {
          in: excludedIds
        },
        managerId: user.id
      }
    });

    return NextResponse.json({ 
      hasReportingObjects: managerReportingObjects > 0 
    });

  } catch (error) {
    console.error('Ошибка проверки объектов отчетности:', error);
    return NextResponse.json({ hasReportingObjects: false });
  }
}
