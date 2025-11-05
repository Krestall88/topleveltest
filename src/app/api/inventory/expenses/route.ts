import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET - получить расходы
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user;

    const { searchParams } = new URL(req.url);
    const objectId = searchParams.get('objectId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let whereClause: any = {};
    
    if (objectId) whereClause.objectId = objectId;
    if (month) whereClause.month = parseInt(month);
    if (year) whereClause.year = parseInt(year);

    // Менеджеры видят только расходы по своим объектам
    if (user.role === 'MANAGER') {
      const managerObjects = await prisma.cleaningObject.findMany({
        where: { managerId: user.id },
        select: { id: true }
      });
      
      const allowedObjectIds = managerObjects.map(obj => obj.id);
      
      if (objectId && !allowedObjectIds.includes(objectId)) {
        return NextResponse.json({ error: 'Access denied to this object' }, { status: 403 });
      }
      
      if (!objectId) {
        whereClause.objectId = { in: allowedObjectIds };
      }
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
        whereClause.objectId = { in: allowedObjectIds };
      }
    }

    const expenses = await prisma.inventoryExpense.findMany({
      where: whereClause,
      include: {
        object: {
          select: { id: true, name: true, address: true }
        },
        recordedBy: {
          select: { id: true, name: true, email: true }
        },
        category: {
          select: { id: true, name: true, description: true }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(expenses);

  } catch (error) {
    console.error('Error fetching inventory expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST - создать расход
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user;

    const body = await req.json();
    const { objectId, amount, description, month, year, categoryId } = body;

    if (!objectId || !amount) {
      return NextResponse.json({ error: 'objectId and amount are required' }, { status: 400 });
    }

    // Менеджеры могут добавлять расходы только по своим объектам
    if (user.role === 'MANAGER') {
      const managerObject = await prisma.cleaningObject.findFirst({
        where: {
          id: objectId,
          managerId: user.id
        }
      });
      
      if (!managerObject) {
        return NextResponse.json({ error: 'Access denied to this object' }, { status: 403 });
      }
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

    // Используем текущий месяц и год, если не указаны
    const currentDate = new Date();
    const expenseMonth = month || (currentDate.getMonth() + 1);
    const expenseYear = year || currentDate.getFullYear();

    // Проверяем лимиты если указана категория (БЕЗ БЛОКИРОВКИ)
    let warning = null;
    if (categoryId) {
      const limits = await prisma.expenseCategoryLimit.findMany({
        where: {
          objectId,
          categoryId,
          category: {
            isActive: true
          }
        },
        include: {
          category: true
        }
      });

      for (const limit of limits) {
        let totalSpent = 0;
        const expenseAmount = parseFloat(amount);

        // Рассчитываем потраченное в зависимости от типа периода
        if (limit.periodType === 'DAILY') {
          const today = new Date();
          const expenses = await prisma.inventoryExpense.aggregate({
            where: {
              objectId,
              categoryId,
              createdAt: {
                gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
              }
            },
            _sum: { amount: true }
          });
          totalSpent = Number(expenses._sum.amount || 0);
        } else if (limit.periodType === 'MONTHLY') {
          const expenses = await prisma.inventoryExpense.aggregate({
            where: {
              objectId,
              categoryId,
              month: parseInt(expenseMonth),
              year: parseInt(expenseYear)
            },
            _sum: { amount: true }
          });
          totalSpent = Number(expenses._sum.amount || 0);
        } else if (limit.periodType === 'SEMI_ANNUAL' || limit.periodType === 'ANNUAL') {
          if (limit.startDate && limit.endDate) {
            const expenses = await prisma.inventoryExpense.aggregate({
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
            totalSpent = Number(expenses._sum.amount || 0);
          }
        }

        const newTotal = totalSpent + expenseAmount;
        const limitAmount = Number(limit.amount);
        const percentage = (newTotal / limitAmount) * 100;

        // Формируем предупреждение (БЕЗ БЛОКИРОВКИ)
        if (newTotal > limitAmount) {
          const periodName = {
            DAILY: 'ежедневный',
            MONTHLY: 'месячный',
            SEMI_ANNUAL: 'полугодовой',
            ANNUAL: 'годовой'
          }[limit.periodType];
          
          warning = `⚠️ Превышен ${periodName} лимит по категории "${limit.category.name}": ${newTotal.toLocaleString('ru-RU')}₽ из ${limitAmount.toLocaleString('ru-RU')}₽ (${percentage.toFixed(1)}%)`;
        } else if (percentage >= 90) {
          warning = `⚠️ Использовано ${percentage.toFixed(1)}% лимита по категории "${limit.category.name}"`;
        }
      }
    }

    const expense = await prisma.inventoryExpense.create({
      data: {
        objectId,
        amount: parseFloat(amount),
        description,
        month: parseInt(expenseMonth),
        year: parseInt(expenseYear),
        categoryId: categoryId || null,
        recordedById: user.id
      },
      include: {
        object: {
          select: { id: true, name: true, address: true }
        },
        recordedBy: {
          select: { id: true, name: true, email: true }
        },
        category: {
          select: { id: true, name: true, description: true }
        }
      }
    });

    // Логируем действие
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_INVENTORY_EXPENSE',
        entity: 'InventoryExpense',
        entityId: expense.id,
        details: `Добавлен расход ${amount} руб. для объекта ${expense.object.name}: ${description}${warning ? ` (${warning})` : ''}`,
        userId: user.id
      }
    });

    return NextResponse.json({ 
      ...expense, 
      warning: warning || undefined 
    });

  } catch (error) {
    console.error('Error creating inventory expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
