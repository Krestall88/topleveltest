import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { getAuthSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/sites/[id] - получить участок по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const site = await prisma.site.findUnique({
      where: { id },
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
            description: true,
            area: true
          }
        }
      }
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    return NextResponse.json(site);
  } catch (error) {
    console.error('Error fetching site:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site' },
      { status: 500 }
    );
  }
}

// PUT /api/sites/[id] - обновить участок
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
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
    const { name, description, area, managerId, seniorManagerId } = body;

    // Проверяем существование участка
    const existingSite = await prisma.site.findUnique({
      where: { id },
      include: {
        object: { select: { name: true } },
        manager: { select: { name: true } },
        seniorManager: { select: { name: true } }
      }
    });

    if (!existingSite) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
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

    // Проверяем старшего менеджера, если указан
    if (seniorManagerId) {
      const seniorManager = await prisma.user.findUnique({
        where: { id: seniorManagerId, role: 'SENIOR_MANAGER' }
      });

      if (!seniorManager) {
        return NextResponse.json(
          { error: 'Senior manager not found' },
          { status: 404 }
        );
      }
    }

    const updatedSite = await prisma.site.update({
      where: { id },
      data: {
        name: name || existingSite.name,
        description,
        area: area ? parseFloat(area) : null,
        managerId,
        seniorManagerId
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
    const changes = [];
    if (name && name !== existingSite.name) changes.push(`название: ${existingSite.name} → ${name}`);
    if (managerId !== existingSite.managerId) {
      const oldManager = existingSite.manager?.name || 'не назначен';
      const newManager = updatedSite.manager?.name || 'не назначен';
      changes.push(`менеджер: ${oldManager} → ${newManager}`);
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_SITE',
        entity: 'SITE',
        entityId: id,
        details: `Обновлен участок: ${updatedSite.name}${changes.length > 0 ? ` (${changes.join(', ')})` : ''}`
      }
    });

    return NextResponse.json(updatedSite);
  } catch (error) {
    console.error('Error updating site:', error);
    return NextResponse.json(
      { error: 'Failed to update site' },
      { status: 500 }
    );
  }
}

// PATCH /api/sites/[id] - обновить участок (упрощенная версия)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, area, comment, managerId, seniorManagerId } = body;

    const updatedSite = await prisma.site.update({
      where: { id },
      data: {
        name,
        description,
        area: area ? parseFloat(area) : null,
        comment,
        managerId: managerId !== undefined ? managerId : undefined,
        seniorManagerId: seniorManagerId !== undefined ? seniorManagerId : undefined,
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
          }
        },
        zones: true,
      }
    });

    console.log('✅ Обновлен участок:', updatedSite.name);
    return NextResponse.json(updatedSite);
  } catch (error) {
    console.error('❌ Ошибка обновления участка:', error);
    return NextResponse.json(
      { error: 'Failed to update site' },
      { status: 500 }
    );
  }
}

// DELETE /api/sites/[id] - удалить участок
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
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

    // Проверяем существование участка
    const site = await prisma.site.findUnique({
      where: { id },
      include: {
        object: { select: { name: true } },
        zones: { select: { id: true } }
      }
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Проверяем, есть ли зоны
    if (site.zones.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete site with existing zones' },
        { status: 400 }
      );
    }

    await prisma.site.delete({
      where: { id }
    });

    // Логируем в аудит
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_SITE',
        entity: 'SITE',
        entityId: id,
        details: `Удален участок: ${site.name} объекта ${site.object.name}`
      }
    });

    return NextResponse.json({ message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Error deleting site:', error);
    return NextResponse.json(
      { error: 'Failed to delete site' },
      { status: 500 }
    );
  }
}
