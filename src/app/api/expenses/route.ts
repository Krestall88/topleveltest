import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createExpenseSchema } from '@/lib/validators/expense';
import { getAuthSession } from '@/lib/auth'; // Assuming auth setup exists
import type { InventoryItem } from '@prisma/client';

export const dynamic = 'force-dynamic'; // Force dynamic rendering to ensure cookies() works

export async function GET(req: NextRequest) {
  const session = await getAuthSession();

  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return new NextResponse('Недостаточно прав', { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('itemId');

  if (!itemId) {
    return NextResponse.json(
      { message: 'Требуется ID товара' },
      { status: 400 }
    );
  }

  try {
    const expenses = await prisma.expense.findMany({
      where: { itemId },
      orderBy: { createdAt: 'desc' },
      include: { 
        user: { select: { name: true } },
        task: {
          include: {
            checklist: {
              include: {
                object: { select: { name: true } },
                room: { select: { name: true } }
              }
            }
          }
        }
      },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Не удалось получить расходы' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();

  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return new NextResponse('Недостаточно прав', { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createExpenseSchema.parse(body);

    const item = (await prisma.inventoryItem.findUnique({
      where: { id: data.itemId },
    })) as any; // Временное решение для обхода устойчивой ошибки типизации

    if (!item) {
      return NextResponse.json({ message: 'Позиция инвентаря не найдена' }, { status: 404 });
    }

    // Проверка на достаточное количество
    if (item.quantity < data.quantity) {
      return NextResponse.json(
        { message: 'Недостаточно товара на складе' },
        { status: 400 }
      );
    }

    if (item.price === null) {
      return NextResponse.json(
        { message: 'У товара нет цены, невозможно рассчитать расход' },
        { status: 400 }
      );
    }

    // Рассчитываем стоимость расхода
    const calculatedAmount = item.price.toNumber() * data.quantity;

    const expenseData: any = {
      quantity: data.quantity,
      amount: calculatedAmount,
      checkPhotoUrl: data.checkPhotoUrl,
      itemId: data.itemId,
      userId: session.user.id,
    };

    // Добавляем taskId если он передан
    if (body.taskId) {
      expenseData.taskId = body.taskId;
    }

    const [expense] = await prisma.$transaction([
      prisma.expense.create({
        data: expenseData,
      }),
      prisma.inventoryItem.update({
        where: { id: data.itemId },
        data: { quantity: { decrement: data.quantity } },
      }),
    ]);

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Не удалось создать расход' },
      { status: 500 }
    );
  }
}
