import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/sites - получить все участки
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const objectId = searchParams.get('objectId');

    const whereClause = objectId ? { objectId } : {};

    const sites = await prisma.site.findMany({
      where: whereClause,
      include: {
        object: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        manager: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        zones: {
          select: {
            id: true,
            name: true,
            area: true
          }
        }
      },
      orderBy: [
        { object: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(sites);
  } catch (error) {
    console.error('Error fetching sites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    );
  }
}

// POST /api/sites - создать новый участок
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем права доступа
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user || !['ADMIN', 'DEPUTY'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, area, objectId, managerId } = body;

    // Валидация
    if (!name || !objectId) {
      return NextResponse.json(
        { error: 'Name and objectId are required' },
        { status: 400 }
      );
    }

    // Проверяем существование объекта
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId }
    });

    if (!object) {
      return NextResponse.json(
        { error: 'Object not found' },
        { status: 404 }
      );
    }

    // Проверяем менеджера, если указан
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId, role: 'MANAGER' }
      });

      if (!manager) {
        return NextResponse.json(
          { error: 'Manager not found' },
          { status: 404 }
        );
      }
    }

    const site = await prisma.site.create({
      data: {
        name,
        description,
        area: area ? parseFloat(area) : null,
        objectId,
        managerId
      },
      include: {
        object: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        manager: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        }
      }
    });

    // Логируем в аудит
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_SITE',
        entity: 'SITE',
        entityId: site.id,
        details: `Создан участок: ${site.name} для объекта ${object.name}${managerId ? ` с менеджером ${site.manager?.name}` : ''}`
      }
    });

    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    console.error('Error creating site:', error);
    return NextResponse.json(
      { error: 'Failed to create site' },
      { status: 500 }
    );
  }
}
