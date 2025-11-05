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

// GET /api/objects/[id]/expense-limits - Получить лимиты объекта
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

    const limits = await prisma.expenseCategoryLimit.findMany({
      where: { objectId },
      include: {
        category: true,
        setBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { periodType: 'asc' }
      ]
    });

    return NextResponse.json({ limits });
  } catch (error) {
    console.error('Error fetching expense limits:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/objects/[id]/expense-limits - Создать лимит (только админ)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEPUTY_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id: objectId } = params;
    const body = await request.json();
    const {
      categoryId,
      amount,
      periodType,
      month,
      year,
      startDate,
      endDate,
      isRecurring
    } = body;

    // Валидация
    if (!categoryId || !amount || !periodType) {
      return NextResponse.json(
        { message: 'Category, amount and period type are required' },
        { status: 400 }
      );
    }

    // Проверка существования объекта
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId }
    });

    if (!object) {
      return NextResponse.json(
        { message: 'Object not found' },
        { status: 404 }
      );
    }

    // Проверка существования категории
    const category = await prisma.expenseCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { message: 'Category not found' },
        { status: 404 }
      );
    }

    // Валидация в зависимости от типа периода
    if (periodType === 'MONTHLY' && (!month || !year)) {
      return NextResponse.json(
        { message: 'Month and year are required for MONTHLY period' },
        { status: 400 }
      );
    }

    if ((periodType === 'SEMI_ANNUAL' || periodType === 'ANNUAL') && !startDate) {
      return NextResponse.json(
        { message: 'Start date is required for SEMI_ANNUAL and ANNUAL periods' },
        { status: 400 }
      );
    }

    const limit = await prisma.expenseCategoryLimit.create({
      data: {
        objectId,
        categoryId,
        amount,
        periodType,
        month: periodType === 'MONTHLY' ? month : null,
        year: periodType === 'MONTHLY' ? year : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isRecurring: isRecurring || false,
        setById: user.id
      },
      include: {
        category: true,
        setBy: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({ limit }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating expense limit:', error);
    
    // Обработка ошибки уникальности
    if (error.code === 'P2002') {
      return NextResponse.json(
        { message: 'Limit for this category and period already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
