import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';

const prisma = new PrismaClient();

// POST - массовое создание лимитов по категориям
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

    const { 
      categoryId, 
      periodType, 
      amount, 
      objectIds, 
      month, 
      year, 
      startDate, 
      endDate, 
      isRecurring 
    } = await request.json();

    if (!categoryId || !periodType || !amount || !objectIds || !Array.isArray(objectIds) || objectIds.length === 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Проверяем существование категории
    const category = await prisma.expenseCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category || !category.isActive) {
      return NextResponse.json({ error: 'Category not found or inactive' }, { status: 400 });
    }

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

      // Создаем лимит в зависимости от типа периода
      if (periodType === 'MONTHLY') {
        // Проверяем существующий лимит
        const existingLimit = await prisma.expenseCategoryLimit.findFirst({
          where: {
            objectId,
            categoryId,
            periodType: 'MONTHLY',
            month,
            year
          }
        });

        if (existingLimit) {
          // Обновляем
          const updated = await prisma.expenseCategoryLimit.update({
            where: { id: existingLimit.id },
            data: {
              amount: amount,
              setById: user.id
            }
          });
          results.push(updated);
        } else {
          // Создаем новый
          const created = await prisma.expenseCategoryLimit.create({
            data: {
              amount: amount,
              periodType: 'MONTHLY',
              month,
              year,
              isRecurring: isRecurring || false,
              objectId,
              categoryId,
              setById: user.id
            }
          });
          results.push(created);
        }

        // Если повторяющийся, создаем на будущие месяцы
        if (isRecurring) {
          const currentDate = new Date();
          const endYear = currentDate.getFullYear() + 1;
          
          let currentMonth = month + 1;
          let currentYear = year;

          while (currentYear <= endYear) {
            if (currentMonth > 12) {
              currentMonth = 1;
              currentYear++;
            }

            const existingFuture = await prisma.expenseCategoryLimit.findFirst({
              where: {
                objectId,
                categoryId,
                periodType: 'MONTHLY',
                month: currentMonth,
                year: currentYear
              }
            });

            if (!existingFuture) {
              await prisma.expenseCategoryLimit.create({
                data: {
                  amount: amount,
                  periodType: 'MONTHLY',
                  month: currentMonth,
                  year: currentYear,
                  isRecurring: true,
                  objectId,
                  categoryId,
                  setById: user.id
                }
              });
            }

            currentMonth++;
          }
        }

      } else if (periodType === 'DAILY') {
        // Проверяем существующий дневной лимит
        const existingLimit = await prisma.expenseCategoryLimit.findFirst({
          where: {
            objectId,
            categoryId,
            periodType: 'DAILY'
          }
        });

        if (existingLimit) {
          const updated = await prisma.expenseCategoryLimit.update({
            where: { id: existingLimit.id },
            data: {
              amount: amount,
              setById: user.id
            }
          });
          results.push(updated);
        } else {
          const created = await prisma.expenseCategoryLimit.create({
            data: {
              amount: amount,
              periodType: 'DAILY',
              objectId,
              categoryId,
              setById: user.id
            }
          });
          results.push(created);
        }

      } else if (periodType === 'SEMI_ANNUAL' || periodType === 'ANNUAL') {
        if (!startDate || !endDate) {
          continue;
        }

        const created = await prisma.expenseCategoryLimit.create({
          data: {
            amount: amount,
            periodType: periodType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            objectId,
            categoryId,
            setById: user.id
          }
        });
        results.push(created);
      }

      // Логируем действие
      await prisma.auditLog.create({
        data: {
          action: 'BULK_SET_CATEGORY_LIMIT',
          entity: 'ExpenseCategoryLimit',
          entityId: objectId,
          details: `Массовое установление лимита ${amount} руб. для категории ${category.name} на объекте ${object.name}`,
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
