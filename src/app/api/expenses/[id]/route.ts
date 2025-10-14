import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { updateExpenseSchema } from '@/lib/validators/expense';

export const dynamic = 'force-dynamic';

type Params = {
  params: {
    id: string;
  };
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return new NextResponse('Недостаточно прав', { status: 403 });
  }

  try {
    const body = await req.json();
    const data = updateExpenseSchema.parse(body);

    const originalExpense = await prisma.expense.findUnique({
      where: { id: params.id },
    });

    if (!originalExpense) {
      return NextResponse.json({ message: 'Расход не найден' }, { status: 404 });
    }

    const updatedExpense = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.update({
        where: { id: params.id },
        data: data,
      });

      if (data.quantity) {
        const quantityDifference = data.quantity - originalExpense.quantity;
        await tx.inventoryItem.update({
          where: { id: originalExpense.itemId },
          data: { quantity: { decrement: quantityDifference } },
        });
      }

      return expense;
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Не удалось обновить расход' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return new NextResponse('Недостаточно прав', { status: 403 });
  }

  try {
    const expenseToDelete = await prisma.expense.findUnique({
      where: { id: params.id },
    });

    if (!expenseToDelete) {
      return NextResponse.json({ message: 'Расход не найден' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.expense.delete({ where: { id: params.id } });

      await tx.inventoryItem.update({
        where: { id: expenseToDelete.itemId },
        data: { quantity: { increment: expenseToDelete.quantity } },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Не удалось удалить расход' },
      { status: 500 }
    );
  }
}
