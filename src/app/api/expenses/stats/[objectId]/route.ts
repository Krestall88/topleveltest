import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

async function getUserFromToken(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, role: true, name: true }
    });

    return user;
  } catch (error) {
    return null;
  }
}

// GET /api/expenses/stats/[objectId] - Статистика по категориям
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ objectId: string }> }
) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { objectId } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Проверяем доступ к объекту
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      select: { id: true, managerId: true, name: true }
    });

    if (!object) {
      return NextResponse.json(
        { message: 'Object not found' },
        { status: 404 }
      );
    }

    // Менеджер может видеть только свои объекты
    if (user.role === 'MANAGER' && object.managerId !== user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    // Получаем все категории
    const categories = await prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    // Получаем лимиты для объекта
    const limits = await prisma.expenseCategoryLimit.findMany({
      where: { objectId },
      include: { category: true }
    });

    // Получаем расходы за месяц по категориям
    const expenses = await prisma.inventoryExpense.groupBy({
      by: ['categoryId'],
      where: {
        objectId,
        month: currentMonth,
        year: currentYear
      },
      _sum: {
        amount: true
      }
    });

    // Расходы без категории
    const uncategorizedExpenses = await prisma.inventoryExpense.aggregate({
      where: {
        objectId,
        month: currentMonth,
        year: currentYear,
        categoryId: null
      },
      _sum: {
        amount: true
      }
    });

    // Формируем статистику по категориям
    const stats = categories.map(category => {
      // Находим расходы по этой категории
      const categoryExpense = expenses.find(e => e.categoryId === category.id);
      const spent = new Decimal(categoryExpense?._sum.amount || 0);

      // Находим лимиты по этой категории
      const categoryLimits = limits.filter(l => l.categoryId === category.id);

      // Считаем общий лимит (ВСЕ типы лимитов, приведенные к месячному эквиваленту)
      let totalLimit = new Decimal(0);
      let hasLimit = false;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      
      // Для проверки периодов используем первый и последний день месяца
      const monthStart = new Date(currentYear, currentMonth - 1, 1);
      const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

      for (const limit of categoryLimits) {
        if (limit.periodType === 'MONTHLY') {
          if (limit.month === currentMonth && limit.year === currentYear) {
            totalLimit = totalLimit.add(limit.amount);
            hasLimit = true;
          }
        } else if (limit.periodType === 'DAILY') {
          // Ежедневный лимит * количество дней в месяце
          totalLimit = totalLimit.add(new Decimal(limit.amount).times(daysInMonth));
          hasLimit = true;
        } else if (limit.periodType === 'SEMI_ANNUAL') {
          // Полугодовой лимит / 6 месяцев (если период пересекается с текущим месяцем)
          if (limit.startDate && limit.endDate) {
            const limitStart = new Date(limit.startDate);
            const limitEnd = new Date(limit.endDate);
            // Проверяем пересечение периодов
            if (limitStart <= monthEnd && limitEnd >= monthStart) {
              totalLimit = totalLimit.add(new Decimal(limit.amount).dividedBy(6));
              hasLimit = true;
            }
          }
        } else if (limit.periodType === 'ANNUAL') {
          // Годовой лимит / 12 месяцев (если период пересекается с текущим месяцем)
          if (limit.startDate && limit.endDate) {
            const limitStart = new Date(limit.startDate);
            const limitEnd = new Date(limit.endDate);
            // Проверяем пересечение периодов
            if (limitStart <= monthEnd && limitEnd >= monthStart) {
              totalLimit = totalLimit.add(new Decimal(limit.amount).dividedBy(12));
              hasLimit = true;
            }
          }
        }
      }

      const remaining = hasLimit ? totalLimit.minus(spent) : null;
      const percentage = hasLimit && totalLimit.greaterThan(0)
        ? spent.dividedBy(totalLimit).times(100).toNumber()
        : 0;

      return {
        category: {
          id: category.id,
          name: category.name,
          description: category.description
        },
        spent: spent.toNumber(),
        limit: hasLimit ? totalLimit.toNumber() : null,
        remaining: remaining ? remaining.toNumber() : null,
        percentage: hasLimit ? Math.min(percentage, 100) : 0,
        hasLimit,
        limitsCount: categoryLimits.length,
        limits: categoryLimits.map(l => ({
          id: l.id,
          amount: l.amount.toNumber(),
          periodType: l.periodType,
          month: l.month,
          year: l.year,
          startDate: l.startDate,
          endDate: l.endDate,
          isRecurring: l.isRecurring
        }))
      };
    });

    // Добавляем расходы без категории
    const uncategorizedAmount = new Decimal(uncategorizedExpenses._sum.amount || 0);
    if (uncategorizedAmount.greaterThan(0)) {
      stats.push({
        category: {
          id: 'uncategorized',
          name: 'Без категории',
          description: 'Расходы без указания категории'
        },
        spent: uncategorizedAmount.toNumber(),
        limit: null,
        remaining: null,
        percentage: 0,
        hasLimit: false,
        limitsCount: 0,
        limits: []
      });
    }

    // Общая статистика
    const totalSpent = stats.reduce((sum, s) => sum + s.spent, 0);
    const totalLimit = stats
      .filter(s => s.hasLimit)
      .reduce((sum, s) => sum + (s.limit || 0), 0);

    return NextResponse.json({
      object: {
        id: object.id,
        name: object.name
      },
      period: {
        month: currentMonth,
        year: currentYear
      },
      summary: {
        totalSpent,
        totalLimit: totalLimit > 0 ? totalLimit : null,
        totalRemaining: totalLimit > 0 ? totalLimit - totalSpent : null,
        percentage: totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0
      },
      categories: stats.sort((a, b) => b.spent - a.spent)
    });
  } catch (error) {
    console.error('Error fetching expense stats:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
