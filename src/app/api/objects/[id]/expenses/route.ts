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

// GET /api/objects/[id]/expenses - Получить расходы объекта
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: objectId } = params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const categoryId = searchParams.get('categoryId');

    // Проверяем доступ к объекту
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      select: { id: true, managerId: true }
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

    const where: any = { objectId };
    
    if (month && year) {
      where.month = parseInt(month);
      where.year = parseInt(year);
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const expenses = await prisma.inventoryExpense.findMany({
      where,
      include: {
        category: true,
        recordedBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/objects/[id]/expenses - Добавить расход
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: objectId } = params;
    const body = await request.json();
    const { amount, description, categoryId, month, year } = body;

    // Валидация
    if (!amount || !month || !year) {
      return NextResponse.json(
        { message: 'Amount, month and year are required' },
        { status: 400 }
      );
    }

    // Проверяем доступ к объекту
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      select: { id: true, managerId: true }
    });

    if (!object) {
      return NextResponse.json(
        { message: 'Object not found' },
        { status: 404 }
      );
    }

    // Менеджер может добавлять расходы только по своим объектам
    if (user.role === 'MANAGER' && object.managerId !== user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Если указана категория, проверяем лимиты
    if (categoryId) {
      const category = await prisma.expenseCategory.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return NextResponse.json(
          { message: 'Category not found' },
          { status: 404 }
        );
      }

      // Проверяем лимиты
      const limitCheck = await checkExpenseLimits(
        objectId,
        categoryId,
        new Decimal(amount),
        month,
        year,
        new Date()
      );

      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            message: 'Expense exceeds limit',
            warning: limitCheck.warning,
            limitExceeded: true
          },
          { status: 400 }
        );
      }

      // Если есть предупреждение, но разрешено
      if (limitCheck.warning) {
        // Можно залогировать или отправить уведомление
        console.warn(`Expense warning for object ${objectId}:`, limitCheck.warning);
      }
    }

    const expense = await prisma.inventoryExpense.create({
      data: {
        objectId,
        categoryId: categoryId || null,
        amount: new Decimal(amount),
        description,
        month,
        year,
        recordedById: user.id
      },
      include: {
        category: true,
        recordedBy: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Функция проверки лимитов
async function checkExpenseLimits(
  objectId: string,
  categoryId: string,
  amount: Decimal,
  month: number,
  year: number,
  date: Date
): Promise<{ allowed: boolean; warning?: string }> {
  // Получаем все активные лимиты для этой категории и объекта
  const limits = await prisma.expenseCategoryLimit.findMany({
    where: {
      objectId,
      categoryId
    }
  });

  if (limits.length === 0) {
    // Нет лимитов - разрешаем
    return { allowed: true };
  }

  for (const limit of limits) {
    let currentExpenses = new Decimal(0);
    let limitAmount = new Decimal(limit.amount);

    // В зависимости от типа периода считаем расходы
    switch (limit.periodType) {
      case 'DAILY':
        // Расходы за сегодня
        const today = new Date(date);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dailyExpenses = await prisma.inventoryExpense.aggregate({
          where: {
            objectId,
            categoryId,
            createdAt: {
              gte: today,
              lt: tomorrow
            }
          },
          _sum: { amount: true }
        });

        currentExpenses = new Decimal(dailyExpenses._sum.amount || 0);
        break;

      case 'MONTHLY':
        // Расходы за месяц
        if (limit.month === month && limit.year === year) {
          const monthlyExpenses = await prisma.inventoryExpense.aggregate({
            where: {
              objectId,
              categoryId,
              month,
              year
            },
            _sum: { amount: true }
          });

          currentExpenses = new Decimal(monthlyExpenses._sum.amount || 0);
        }
        break;

      case 'SEMI_ANNUAL':
      case 'ANNUAL':
        // Расходы за период
        if (limit.startDate && limit.endDate) {
          const periodExpenses = await prisma.inventoryExpense.aggregate({
            where: {
              objectId,
              categoryId,
              createdAt: {
                gte: limit.startDate,
                lte: limit.endDate
              }
            },
            _sum: { amount: true }
          });

          currentExpenses = new Decimal(periodExpenses._sum.amount || 0);
        }
        break;
    }

    // Проверяем превышение
    const totalAfterExpense = currentExpenses.add(amount);
    
    if (totalAfterExpense.greaterThan(limitAmount)) {
      const remaining = limitAmount.minus(currentExpenses);
      return {
        allowed: false,
        warning: `Превышен лимит "${limit.periodType}". Лимит: ${limitAmount}, Текущие расходы: ${currentExpenses}, Остаток: ${remaining}`
      };
    }

    // Предупреждение если осталось меньше 10%
    const percentage = totalAfterExpense.dividedBy(limitAmount).times(100);
    if (percentage.greaterThan(90)) {
      return {
        allowed: true,
        warning: `Внимание! Использовано ${percentage.toFixed(1)}% лимита "${limit.periodType}"`
      };
    }
  }

  return { allowed: true };
}
