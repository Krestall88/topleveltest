import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';

const prisma = new PrismaClient();

// POST /api/sites/[id]/assign-manager - назначить менеджера на участок
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем права доступа
    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!userRecord || !['ADMIN', 'DEPUTY'].includes(userRecord.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { managerId } = body;

    // Проверяем существование участка
    const site = await prisma.site.findUnique({
      where: { id: params.id },
      include: {
        object: { select: { name: true } },
        manager: { select: { name: true } }
      }
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    let newManager = null;
    if (managerId) {
      // Проверяем существование менеджера
      newManager = await prisma.user.findUnique({
        where: { id: managerId, role: 'MANAGER' }
      });

      if (!newManager) {
        return NextResponse.json(
          { error: 'Manager not found' },
          { status: 404 }
        );
      }
    }

    // Обновляем назначение
    const updatedSite = await prisma.site.update({
      where: { id: params.id },
      data: { managerId },
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
    const oldManager = site.manager?.name || 'не назначен';
    const newManagerName = newManager?.name || 'не назначен';
    
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ASSIGN_SITE_MANAGER',
        entity: 'SITE',
        entityId: params.id,
        details: `Назначение менеджера на участок "${site.name}" объекта "${site.object.name}": ${oldManager} → ${newManagerName}`
      }
    });

    return NextResponse.json({
      message: 'Manager assigned successfully',
      site: updatedSite
    });
  } catch (error) {
    console.error('Error assigning manager to site:', error);
    return NextResponse.json(
      { error: 'Failed to assign manager' },
      { status: 500 }
    );
  }
}
