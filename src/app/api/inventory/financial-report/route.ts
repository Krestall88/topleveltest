import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET - получить финансовый отчет по инвентарю
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;

    const { searchParams } = new URL(request.url);
    const objectId = searchParams.get('objectId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Определяем текущий месяц и год, если не переданы
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : (currentDate.getMonth() + 1);
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    // Фильтры в зависимости от роли
    let objectFilter: any = {};

    if (user.role === 'MANAGER') {
      // Менеджер видит только свои объекты
      const managedObjects = await prisma.cleaningObject.findMany({
        where: { managerId: user.id },
        select: { id: true }
      });
      objectFilter.id = { in: managedObjects.map(obj => obj.id) };
    }

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
        objectFilter.id = { in: allowedObjectIds };
      }
    }

    if (objectId) {
      objectFilter.id = objectId;
    }

    // Получаем объекты с расходами
    const objects = await prisma.cleaningObject.findMany({
      where: objectFilter,
      select: {
        id: true,
        name: true,
        address: true,
        inventoryExpenses: {
          where: {
            month: targetMonth,
            year: targetYear
          },
          select: {
            id: true,
            amount: true,
            description: true,
            createdAt: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Формируем отчет с учетом лимитов по статьям
    const balances = await Promise.all(objects.map(async (object) => {
      // Получаем все лимиты по категориям для этого объекта (только активные категории)
      const categoryLimits = await prisma.expenseCategoryLimit.findMany({
        where: {
          objectId: object.id,
          category: {
            isActive: true
          },
          OR: [
            // MONTHLY лимиты для текущего месяца/года
            {
              periodType: 'MONTHLY',
              month: targetMonth,
              year: targetYear
            },
            // DAILY лимиты (всегда активны)
            {
              periodType: 'DAILY'
            },
            // SEMI_ANNUAL и ANNUAL лимиты (проверяем даты)
            {
              periodType: { in: ['SEMI_ANNUAL', 'ANNUAL'] },
              startDate: { lte: new Date(targetYear, targetMonth - 1, 1) },
              endDate: { gte: new Date(targetYear, targetMonth - 1, 1) }
            }
          ]
        },
        select: {
          amount: true,
          periodType: true
        }
      });

      // Суммируем лимиты по категориям (только MONTHLY для текущего месяца)
      const limitAmount = categoryLimits
        .filter((limit: any) => limit.periodType === 'MONTHLY')
        .reduce((sum: number, limit: any) => sum + parseFloat(limit.amount.toString()), 0);

      const totalSpent = object.inventoryExpenses.reduce((sum, expense) => 
        sum + parseFloat(expense.amount.toString()), 0
      );

      const balance = limitAmount - totalSpent;

      return {
        objectId: object.id,
        objectName: object.name,
        objectAddress: object.address,
        limit: limitAmount,
        spent: totalSpent,
        balance: balance,
        isOverBudget: limitAmount > 0 ? balance < 0 : false, // Только если есть лимит
        month: targetMonth,
        year: targetYear,
        expensesCount: object.inventoryExpenses.length
      };
    }));

    return NextResponse.json(balances);

  } catch (error) {
    console.error('Error fetching financial report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
