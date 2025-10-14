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

    if (objectId) {
      objectFilter.id = objectId;
    }

    // Получаем объекты с лимитами и расходами
    const objects = await prisma.cleaningObject.findMany({
      where: objectFilter,
      select: {
        id: true,
        name: true,
        address: true,
        inventoryLimits: {
          where: {
            month: targetMonth,
            year: targetYear
          },
          select: {
            id: true,
            amount: true,
            month: true,
            year: true
          }
        },
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

    // Формируем отчет
    const balances = objects.map(object => {
      const limit = object.inventoryLimits[0]; // Берем первый лимит (должен быть один на месяц)
      const limitAmount = limit ? parseFloat(limit.amount.toString()) : 40000; // Дефолтный лимит 40000

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
        isOverBudget: balance < 0,
        month: targetMonth,
        year: targetYear,
        expensesCount: object.inventoryExpenses.length
      };
    });

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
