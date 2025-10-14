import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET - получить данные для графика расходов
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user;
    const { searchParams } = new URL(request.url);
    const objectId = searchParams.get('objectId');
    const monthsCount = parseInt(searchParams.get('months') || '3');

    if (!objectId) {
      return NextResponse.json({ error: 'Object ID is required' }, { status: 400 });
    }

    // Проверяем доступ к объекту
    if (user.role === 'MANAGER') {
      const managerObject = await prisma.cleaningObject.findFirst({
        where: {
          id: objectId,
          managerId: user.id
        }
      });
      
      if (!managerObject) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (user.role === 'DEPUTY_ADMIN') {
      const assignment = await prisma.deputyAdminAssignment.findFirst({
        where: {
          deputyAdminId: user.id,
          objectId: objectId
        }
      });
      
      if (!assignment) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const currentDate = new Date();
    const chartData = [];

    // Получаем данные за последние N месяцев
    for (let i = monthsCount - 1; i >= 0; i--) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const month = targetDate.getMonth() + 1;
      const year = targetDate.getFullYear();

      // Получаем лимит за месяц
      const limit = await prisma.inventoryLimit.findFirst({
        where: {
          objectId,
          month,
          year
        }
      });

      // Получаем общую сумму расходов за месяц
      const expenses = await prisma.inventoryExpense.aggregate({
        where: {
          objectId,
          month,
          year
        },
        _sum: {
          amount: true
        }
      });

      // Получаем детальные расходы за месяц
      const expenseDetails = await prisma.inventoryExpense.findMany({
        where: {
          objectId,
          month,
          year
        },
        select: {
          amount: true,
          description: true,
          createdAt: true,
          recordedBy: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const monthName = targetDate.toLocaleDateString('ru-RU', { 
        month: 'long', 
        year: 'numeric' 
      });

      chartData.push({
        month: monthName,
        monthNumber: month,
        year: year,
        limit: limit?.amount || 0,
        spent: expenses._sum.amount || 0,
        balance: (limit?.amount || 0) - (expenses._sum.amount || 0),
        isOverBudget: (expenses._sum.amount || 0) > (limit?.amount || 0),
        expenseDetails: expenseDetails.map(expense => ({
          amount: expense.amount,
          description: expense.description,
          date: expense.createdAt,
          recordedBy: expense.recordedBy?.name || 'Неизвестно'
        }))
      });
    }

    // Получаем информацию об объекте
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      select: {
        name: true,
        address: true
      }
    });

    return NextResponse.json({
      object,
      chartData,
      summary: {
        totalLimit: chartData.reduce((sum, item) => sum + item.limit, 0),
        totalSpent: chartData.reduce((sum, item) => sum + item.spent, 0),
        totalBalance: chartData.reduce((sum, item) => sum + item.balance, 0),
        overBudgetMonths: chartData.filter(item => item.isOverBudget).length
      }
    });

  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
