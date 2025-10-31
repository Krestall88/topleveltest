import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const skip = (page - 1) * limit;

    // Построение фильтров
    const whereClause: Record<string, unknown> = {};

    if (userId) {
      whereClause.userId = userId;
    }

    if (action) {
      whereClause.action = action;
    }

    if (resource) {
      whereClause.entity = resource;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        (whereClause.createdAt as any).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (whereClause.createdAt as any).lte = new Date(dateTo + 'T23:59:59');
      }
    }

    const [auditLogs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({
        where: whereClause,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      auditLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Ошибка при получении аудит логов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении аудит логов' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, entity, entityId, details, ipAddress, userAgent } = body;

    if (!userId || !action || !entity) {
      return NextResponse.json(
        { error: 'Обязательные поля: userId, action, entity' },
        { status: 400 }
      );
    }

    const auditLog = await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId || null,
        details: details || {},
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(auditLog, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании аудит лога:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании аудит лога' },
      { status: 500 }
    );
  }
}
