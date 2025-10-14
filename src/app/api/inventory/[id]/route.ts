import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const updateInventorySchema = z.object({
  name: z.string().min(1, 'Название обязательно').optional(),
  description: z.string().optional(),
  quantity: z.number().min(0, 'Количество не может быть отрицательным').optional(),
  unit: z.string().min(1, 'Единица измерения обязательна').optional(),
  pricePerUnit: z.number().min(0, 'Цена за единицу не может быть отрицательной').optional(),
  minQuantity: z.number().min(0, 'Минимальное количество не может быть отрицательным').optional(),
});

const expenseSchema = z.object({
  quantity: z.number().min(0.01, 'Количество должно быть больше 0'),
  description: z.string().optional(),
});

interface Params {
  params: { id: string };
}

// GET /api/inventory/[id] - Получить позицию инвентаря
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  
  if (!session?.user) {
    return new NextResponse('Необходима авторизация', { status: 401 });
  }

  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: params.id },
      include: {
        object: {
          select: {
            id: true,
            name: true,
            address: true,
            manager: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        expenses: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!item) {
      return NextResponse.json({ message: 'Позиция не найдена' }, { status: 404 });
    }

    // Проверяем права доступа для менеджеров
    if (session.user.role === 'MANAGER' && item.object.manager?.id !== session.user.id) {
      return new NextResponse('Нет доступа к этой позиции', { status: 403 });
    }

    // Добавляем вычисляемые поля
    const itemWithCalculations = {
      ...item,
      totalValue: Number(item.pricePerUnit) * item.quantity,
      isLowStock: item.minQuantity ? item.quantity <= item.minQuantity : false
    };

    return NextResponse.json(itemWithCalculations);
  } catch (error) {
    console.error('Ошибка получения позиции инвентаря:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// PATCH /api/inventory/[id] - Обновить позицию инвентаря
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();

  if (!session?.user || !['ADMIN', 'DEPUTY', 'MANAGER'].includes(session.user.role)) {
    return new NextResponse('Недостаточно прав', { status: 403 });
  }

  try {
    // Сначала получаем текущую позицию для проверки прав
    const currentItem = await prisma.inventoryItem.findUnique({
      where: { id: params.id },
      include: {
        object: {
          select: {
            managerId: true
          }
        }
      }
    });

    if (!currentItem) {
      return NextResponse.json({ message: 'Позиция не найдена' }, { status: 404 });
    }

    // Проверяем права доступа для менеджеров
    if (session.user.role === 'MANAGER' && currentItem.object.managerId !== session.user.id) {
      return new NextResponse('Нет доступа к этой позиции', { status: 403 });
    }

    const body = await req.json();
    const data = updateInventorySchema.parse(body);

    // Вычисляем новую общую стоимость если изменились цена или количество
    let updateData: any = { ...data };
    
    if (data.quantity !== undefined || data.pricePerUnit !== undefined) {
      const newQuantity = data.quantity ?? currentItem.quantity;
      const newPricePerUnit = data.pricePerUnit ?? Number(currentItem.pricePerUnit);
      updateData.totalValue = newQuantity * newPricePerUnit;
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: updateData,
      include: {
        object: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Ошибка валидации', details: error.issues }, { status: 400 });
    }
    console.error('Ошибка обновления позиции инвентаря:', error);
    return NextResponse.json({ message: 'Не удалось обновить позицию' }, { status: 500 });
  }
}

// DELETE /api/inventory/[id] - Удалить позицию инвентаря
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();

  if (!session?.user || !['ADMIN', 'DEPUTY', 'MANAGER'].includes(session.user.role)) {
    return new NextResponse('Недостаточно прав', { status: 403 });
  }

  try {
    // Проверяем права доступа для менеджеров
    if (session.user.role === 'MANAGER') {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: params.id },
        include: {
          object: {
            select: {
              managerId: true
            }
          }
        }
      });

      if (!item) {
        return NextResponse.json({ message: 'Позиция не найдена' }, { status: 404 });
      }

      if (item.object.managerId !== session.user.id) {
        return new NextResponse('Нет доступа к этой позиции', { status: 403 });
      }
    }

    await prisma.inventoryItem.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Ошибка удаления позиции инвентаря:', error);
    return NextResponse.json({ message: 'Не удалось удалить позицию' }, { status: 500 });
  }
}

// POST /api/inventory/[id] - Списать инвентарь (создать расход)
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();

  if (!session?.user || !['ADMIN', 'DEPUTY', 'MANAGER'].includes(session.user.role)) {
    return new NextResponse('Недостаточно прав', { status: 403 });
  }

  try {
    const body = await req.json();
    const { quantity, description } = expenseSchema.parse(body);

    // Получаем текущую позицию инвентаря
    const item = await prisma.inventoryItem.findUnique({
      where: { id: params.id },
      include: {
        object: {
          select: {
            id: true,
            managerId: true
          }
        }
      }
    });

    if (!item) {
      return NextResponse.json({ message: 'Позиция не найдена' }, { status: 404 });
    }

    // Проверяем права доступа для менеджеров
    if (session.user.role === 'MANAGER' && item.object.managerId !== session.user.id) {
      return new NextResponse('Нет доступа к этой позиции', { status: 403 });
    }

    // Проверяем достаточность остатков
    if (item.quantity < quantity) {
      return NextResponse.json({ 
        message: `Недостаточно остатков. Доступно: ${item.quantity} ${item.unit}` 
      }, { status: 400 });
    }

    // Создаем транзакцию для списания
    const result = await prisma.$transaction(async (tx) => {
      // Создаем запись о расходе
      const expense = await tx.expense.create({
        data: {
          quantity: quantity,
          amount: Number(item.pricePerUnit) * quantity,
          itemId: item.id,
          userId: session.user.id,
          objectId: item.objectId,
        }
      });

      // Обновляем остатки инвентаря
      const newQuantity = item.quantity - quantity;
      const updatedItem = await tx.inventoryItem.update({
        where: { id: params.id },
        data: {
          quantity: newQuantity,
          totalValue: Number(item.pricePerUnit) * newQuantity
        },
        include: {
          object: {
            select: {
              id: true,
              name: true,
              address: true
            }
          }
        }
      });

      return { expense, updatedItem };
    });

    return NextResponse.json({
      message: 'Инвентарь успешно списан',
      expense: result.expense,
      updatedItem: result.updatedItem
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Ошибка валидации', details: error.issues }, { status: 400 });
    }
    console.error('Ошибка списания инвентаря:', error);
    return NextResponse.json({ message: 'Не удалось списать инвентарь' }, { status: 500 });
  }
}
