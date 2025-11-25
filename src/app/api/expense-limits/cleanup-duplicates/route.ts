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

// POST /api/expense-limits/cleanup-duplicates - Найти и удалить дубликаты лимитов
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden: Admin only' }, { status: 403 });
    }

    // Находим все лимиты
    const allLimits = await prisma.expenseCategoryLimit.findMany({
      orderBy: [
        { objectId: 'asc' },
        { categoryId: 'asc' },
        { periodType: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    console.log(`📊 Всего лимитов в базе: ${allLimits.length}`);

    // Группируем лимиты по ключу: objectId + categoryId + periodType + startDate + endDate
    const groupedLimits = new Map<string, typeof allLimits>();

    for (const limit of allLimits) {
      const key = `${limit.objectId}_${limit.categoryId}_${limit.periodType}_${limit.startDate?.toISOString() || 'null'}_${limit.endDate?.toISOString() || 'null'}`;
      
      if (!groupedLimits.has(key)) {
        groupedLimits.set(key, []);
      }
      
      groupedLimits.get(key)!.push(limit);
    }

    // Находим группы с дубликатами
    const duplicates = [];
    const toDelete = [];

    for (const [key, limits] of groupedLimits.entries()) {
      if (limits.length > 1) {
        console.log(`⚠️ Найдена группа дубликатов (${limits.length} шт.):`, {
          key,
          limits: limits.map(l => ({
            id: l.id,
            amount: l.amount.toString(),
            createdAt: l.createdAt
          }))
        });

        duplicates.push({
          key,
          count: limits.length,
          limits: limits.map(l => ({
            id: l.id,
            amount: l.amount.toString(),
            periodType: l.periodType,
            createdAt: l.createdAt
          }))
        });

        // Оставляем самый старый (первый созданный), остальные удаляем
        const [keep, ...remove] = limits;
        toDelete.push(...remove.map(l => l.id));

        console.log(`  ✅ Оставляем: ${keep.id} (создан ${keep.createdAt})`);
        console.log(`  ❌ Удаляем: ${remove.map(l => l.id).join(', ')}`);
      }
    }

    if (toDelete.length === 0) {
      return NextResponse.json({
        message: 'Дубликаты не найдены',
        duplicates: [],
        deleted: 0
      });
    }

    // Удаляем дубликаты
    const deleted = await prisma.expenseCategoryLimit.deleteMany({
      where: {
        id: { in: toDelete }
      }
    });

    console.log(`✅ Удалено дубликатов: ${deleted.count}`);

    return NextResponse.json({
      message: `Удалено ${deleted.count} дубликатов из ${duplicates.length} групп`,
      duplicates,
      deleted: deleted.count
    });

  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
