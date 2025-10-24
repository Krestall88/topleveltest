import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const managerId = params.id;

    // Получаем детальную информацию о менеджере
    const manager = await prisma.user.findUnique({
      where: { 
        id: managerId,
        role: 'MANAGER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        // Объекты, которыми управляет менеджер
        managedObjects: {
          select: {
            id: true,
            name: true,
            address: true,
            description: true,
            sites: {
              where: {
                managerId: managerId
              },
              select: {
                id: true,
                name: true,
                description: true,
                area: true
              }
            }
          }
        },
        // Участки, которыми управляет менеджер
        managedSites: {
          select: {
            id: true,
            name: true,
            description: true,
            area: true,
            comment: true,
            object: {
              select: {
                id: true,
                name: true,
                address: true
              }
            }
          }
        }
      }
    });

    if (!manager) {
      return NextResponse.json(
        { error: 'Менеджер не найден' },
        { status: 404 }
      );
    }

    // Получаем статистику
    const stats = await prisma.$transaction(async (tx) => {
      // Количество чек-листов
      const checklistsCount = await tx.checklist.count({
        where: {
          object: {
            managerId: managerId
          }
        }
      });

      // Количество заявок
      const requestsCount = await tx.additionalTask.count({
        where: {
          object: {
            managerId: managerId
          }
        }
      });

      // Общие расходы по инвентарю
      const expensesSum = await tx.inventoryExpense.aggregate({
        where: {
          object: {
            managerId: managerId
          }
        },
        _sum: {
          amount: true
        }
      });

      return {
        checklists: checklistsCount,
        requests: requestsCount,
        totalExpenses: expensesSum._sum.amount || 0
      };
    });

    // Формируем ответ
    const response = {
      ...manager,
      objectsCount: manager?.managedObjects?.length || 0,
      sitesCount: manager?.managedSites?.length || 0
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Ошибка при получении данных менеджера:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
