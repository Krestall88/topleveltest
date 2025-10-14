import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';

const prisma = new PrismaClient();

// POST - массовое создание лимитов
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user;
    
    // Проверяем права (ADMIN, DEPUTY_ADMIN, ACCOUNTANT)
    if (!['ADMIN', 'DEPUTY_ADMIN', 'ACCOUNTANT'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { amount, objectIds, isRecurring, endDate } = await request.json();

    if (!amount || !objectIds || !Array.isArray(objectIds) || objectIds.length === 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    const results = [];

    for (const objectId of objectIds) {
      // Проверяем доступ к объекту для DEPUTY_ADMIN
      if (user.role === 'DEPUTY_ADMIN') {
        const assignment = await prisma.deputyAdminAssignment.findFirst({
          where: {
            deputyAdminId: user.id,
            objectId: objectId
          }
        });
        
        if (!assignment) {
          continue; // Пропускаем объекты без доступа
        }
      }

      // Проверяем существование объекта
      const object = await prisma.cleaningObject.findUnique({
        where: { id: objectId }
      });

      if (!object) {
        continue;
      }

      // Создаем или обновляем лимит
      const existingLimit = await prisma.inventoryLimit.findFirst({
        where: {
          objectId,
          month,
          year
        }
      });

      if (existingLimit) {
        // Обновляем существующий лимит
        const updatedLimit = await prisma.inventoryLimit.update({
          where: { id: existingLimit.id },
          data: {
            amount: amount,
            setById: user.id
          }
        });
        results.push(updatedLimit);
      } else {
        // Создаем новый лимит
        const newLimit = await prisma.inventoryLimit.create({
          data: {
            amount: amount,
            month,
            year,
            objectId,
            setById: user.id
          }
        });
        results.push(newLimit);
      }

      // Если включено повторение, создаем лимиты на будущие месяцы
      if (isRecurring && endDate) {
        const end = new Date(endDate);
        let currentMonth = month + 1;
        let currentYear = year;

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
                amount: amount,
                month: currentMonth,
                year: currentYear,
                objectId,
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
          action: 'BULK_SET_INVENTORY_LIMIT',
          entity: 'InventoryLimit',
          entityId: objectId,
          details: `Массовое установление лимита ${amount} руб. для объекта ${object.name}${isRecurring ? ' с повторением' : ''}`,
          userId: user.id
        }
      });
    }

    return NextResponse.json({
      message: 'Лимиты успешно установлены',
      count: results.length,
      results
    });

  } catch (error) {
    console.error('Error creating bulk limits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
