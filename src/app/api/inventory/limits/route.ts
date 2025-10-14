import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET - получить лимиты
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user;

    // Проверка прав доступа - только ACCOUNTANT, ADMIN, DEPUTY, DEPUTY_ADMIN
    if (!['ACCOUNTANT', 'ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const objectId = searchParams.get('objectId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let whereClause: any = {};
    
    if (objectId) whereClause.objectId = objectId;
    if (month) whereClause.month = parseInt(month);
    if (year) whereClause.year = parseInt(year);

    // Для DEPUTY_ADMIN ограничиваем доступ только к назначенным объектам
    if (user.role === 'DEPUTY_ADMIN') {
      const assignments = await prisma.deputyAdminAssignment.findMany({
        where: { deputyAdminId: user.id },
        select: { objectId: true }
      });
      
      const allowedObjectIds = assignments.map(a => a.objectId);
      
      if (objectId && !allowedObjectIds.includes(objectId)) {
        return NextResponse.json({ error: 'Access denied to this object' }, { status: 403 });
      }
      
      if (!objectId) {
        whereClause.objectId = { in: allowedObjectIds };
      }
    }

    const limits = await prisma.inventoryLimit.findMany({
      where: whereClause,
      include: {
        object: {
          select: { id: true, name: true, address: true }
        },
        setBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { object: { name: 'asc' } }
      ]
    });

    return NextResponse.json(limits);

  } catch (error) {
    console.error('Error fetching inventory limits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST - создать или обновить лимит
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user;

    // Проверка прав доступа - только ACCOUNTANT, ADMIN, DEPUTY, DEPUTY_ADMIN
    if (!['ACCOUNTANT', 'ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      objectId,
      amount, 
      month, 
      year, 
      isRecurring = false, 
      endDate 
    } = body;

    if (!objectId || !amount || !month || !year) {
      return NextResponse.json({ error: 'objectId, amount, month, and year are required' }, { status: 400 });
    }

    // Для DEPUTY_ADMIN проверяем доступ к объекту
    if (user.role === 'DEPUTY_ADMIN') {
      const assignment = await prisma.deputyAdminAssignment.findFirst({
        where: {
          deputyAdminId: user.id,
          objectId: objectId
        }
      });
      
      if (!assignment) {
        return NextResponse.json({ error: 'Access denied to this object' }, { status: 403 });
      }
    }

    // Проверяем, существует ли уже лимит для этого объекта в этом месяце
    const existingLimit = await prisma.inventoryLimit.findFirst({
      where: {
        objectId,
        month: parseInt(month),
        year: parseInt(year)
      }
    });

    let result;

    if (existingLimit) {
      // Обновляем существующий лимит
      result = await prisma.inventoryLimit.update({
        where: { id: existingLimit.id },
        data: {
          amount: parseFloat(amount),
          setById: user.id
        },
        include: {
          object: {
            select: { id: true, name: true, address: true }
          },
          setBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    } else {
      // Создаем новый лимит
      result = await prisma.inventoryLimit.create({
        data: {
          objectId,
          amount: parseFloat(amount),
          month: parseInt(month),
          year: parseInt(year),
          setById: user.id
        },
        include: {
          object: {
            select: { id: true, name: true, address: true }
          },
          setBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    }

    // Если включено повторение, создаем лимиты на будущие месяцы
    if (isRecurring && endDate) {
      const end = new Date(endDate);
      let currentMonth = parseInt(month) + 1;
      let currentYear = parseInt(year);

      while (
        currentYear < end.getFullYear() || 
        (currentYear === end.getFullYear() && currentMonth <= end.getMonth() + 1)
      ) {
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }

        // Проверяем, нет ли уже лимита на этот месяц
        const existingFutureLimit = await prisma.inventoryLimit.findFirst({
          where: {
            objectId,
            month: currentMonth,
            year: currentYear
          }
        });

        if (!existingFutureLimit) {
          await prisma.inventoryLimit.create({
            data: {
              objectId,
              amount: parseFloat(amount),
              month: currentMonth,
              year: currentYear,
              setById: user.id
            }
          });
        }

        currentMonth++;
      }
    }

    // Логируем действие
    await prisma.auditLog.create({
      data: {
        action: existingLimit ? 'UPDATE_INVENTORY_LIMIT' : 'CREATE_INVENTORY_LIMIT',
        entity: 'InventoryLimit',
        entityId: result.id,
        details: `${existingLimit ? 'Обновлен' : 'Создан'} лимит ${amount} руб. для объекта ${result.object.name} на ${month}/${year}${isRecurring ? ' с повторением' : ''}`,
        userId: user.id
      }
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error creating/updating inventory limit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
