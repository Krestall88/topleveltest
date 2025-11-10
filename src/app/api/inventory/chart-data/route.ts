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

      // Получаем лимиты по категориям за месяц (только активные категории)
      const categoryLimits = await prisma.expenseCategoryLimit.findMany({
        where: {
          objectId,
          category: {
            isActive: true
          },
          OR: [
            {
              periodType: 'MONTHLY',
              month,
              year
            },
            {
              periodType: 'DAILY'
            },
            // SEMI_ANNUAL и ANNUAL лимиты (проверяем пересечение с месяцем)
            {
              periodType: { in: ['SEMI_ANNUAL', 'ANNUAL'] },
              startDate: { lte: new Date(year, month, 0, 23, 59, 59) }, // конец месяца
              endDate: { gte: new Date(year, month - 1, 1) } // начало месяца
            }
          ]
        },
        select: {
          amount: true,
          periodType: true
        }
      });

      // Суммируем лимиты по категориям, приводя к месячному эквиваленту
      const daysInMonth = new Date(year, month, 0).getDate();
      const limitAmount = categoryLimits.reduce((sum: number, limit: any) => {
        const amount = parseFloat(limit.amount.toString());
        
        if (limit.periodType === 'MONTHLY') {
          return sum + amount;
        } else if (limit.periodType === 'DAILY') {
          return sum + (amount * daysInMonth);
        } else if (limit.periodType === 'SEMI_ANNUAL') {
          return sum + (amount / 6);
        } else if (limit.periodType === 'ANNUAL') {
          return sum + (amount / 12);
        }
        
        return sum;
      }, 0);

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

      const spentAmount = Number(expenses._sum.amount || 0);

      chartData.push({
        month: monthName,
        monthNumber: month,
        year: year,
        limit: limitAmount,
        spent: spentAmount,
        balance: limitAmount - spentAmount,
        isOverBudget: limitAmount > 0 ? spentAmount > limitAmount : false,
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
