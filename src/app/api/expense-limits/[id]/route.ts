import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

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

// PATCH /api/expense-limits/[id] - Обновить лимит
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEPUTY_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const {
      amount,
      month,
      year,
      startDate,
      endDate,
      isRecurring
    } = body;

    const limit = await prisma.expenseCategoryLimit.findUnique({
      where: { id }
    });

    if (!limit) {
      return NextResponse.json(
        { message: 'Limit not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.expenseCategoryLimit.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount }),
        ...(month !== undefined && { month }),
        ...(year !== undefined && { year }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isRecurring !== undefined && { isRecurring })
      },
      include: {
        category: true,
        setBy: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({ limit: updated });
  } catch (error) {
    console.error('Error updating expense limit:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/expense-limits/[id] - Удалить лимит
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEPUTY_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    const limit = await prisma.expenseCategoryLimit.findUnique({
      where: { id }
    });

    if (!limit) {
      return NextResponse.json(
        { message: 'Limit not found' },
        { status: 404 }
      );
    }

    await prisma.expenseCategoryLimit.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Limit deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense limit:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
