import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';

const prisma = new PrismaClient();

// PATCH - обновить расход
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user;
    const { id } = params;
    const body = await req.json();
    const { amount, description, categoryId } = body;

    // Проверяем права доступа
    if (!['ADMIN', 'DEPUTY_ADMIN', 'ACCOUNTANT'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Получаем расход
    const expense = await prisma.inventoryExpense.findUnique({
      where: { id },
      include: {
        object: {
          select: { id: true, managerId: true, name: true }
        }
      }
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // DEPUTY_ADMIN может редактировать только расходы своих объектов
    if (user.role === 'DEPUTY_ADMIN') {
      const assignment = await prisma.deputyAdminAssignment.findFirst({
        where: {
          deputyAdminId: user.id,
          objectId: expense.objectId
        }
      });
      
      if (!assignment) {
        return NextResponse.json(
          { error: 'Forbidden: You can only edit expenses for your objects' },
          { status: 403 }
        );
      }
    }

    // Обновляем расход
    const updated = await prisma.inventoryExpense.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(description !== undefined && { description }),
        ...(categoryId !== undefined && { categoryId: categoryId || null })
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
        action: 'UPDATE_INVENTORY_EXPENSE',
        entity: 'InventoryExpense',
        entityId: id,
        details: `Обновлен расход для объекта ${expense.object.name}`,
        userId: user.id
      }
    });

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Error updating inventory expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - удалить расход
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user;
    const { id } = params;

    // Проверяем права доступа
    if (!['ADMIN', 'DEPUTY_ADMIN', 'ACCOUNTANT'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Получаем расход
    const expense = await prisma.inventoryExpense.findUnique({
      where: { id },
      include: {
        object: {
          select: { id: true, managerId: true, name: true }
        }
      }
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // DEPUTY_ADMIN может удалять только расходы своих объектов
    if (user.role === 'DEPUTY_ADMIN') {
      const assignment = await prisma.deputyAdminAssignment.findFirst({
        where: {
          deputyAdminId: user.id,
          objectId: expense.objectId
        }
      });
      
      if (!assignment) {
        return NextResponse.json(
          { error: 'Forbidden: You can only delete expenses for your objects' },
          { status: 403 }
        );
      }
    }

    // Удаляем расход
    await prisma.inventoryExpense.delete({
      where: { id }
    });

    // Логируем действие
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_INVENTORY_EXPENSE',
        entity: 'InventoryExpense',
        entityId: id,
        details: `Удален расход ${expense.amount} руб. для объекта ${expense.object.name}`,
        userId: user.id
      }
    });

    return NextResponse.json({ message: 'Expense deleted successfully' });

  } catch (error) {
    console.error('Error deleting inventory expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
