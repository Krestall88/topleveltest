import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { jwtVerify } from 'jose';
import { notifySiteAssignment } from '@/lib/telegram-notifications';

async function getUserFromToken(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, role: true, name: true, email: true }
    });
    return user;
  } catch (error) {
    console.error('Failed to verify token', error);
    return null;
  }
}

const assignManagerSchema = z.object({
  managerId: z.string().nullable(),
  isSeniorManager: z.boolean().optional().default(false)
});

// POST /api/sites/[id]/assign-manager - назначить менеджера на участок
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEPUTY_ADMIN')) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const { id: siteId } = await params;
    const body = await request.json();
    const validatedData = assignManagerSchema.parse(body);

    // Проверяем существование участка
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        object: { select: { name: true } },
        manager: { select: { name: true, role: true } },
        seniorManager: { select: { name: true, role: true } }
      }
    });

    if (!site) {
      return NextResponse.json({ message: 'Участок не найден' }, { status: 404 });
    }

    let newManager = null;
    if (validatedData.managerId) {
      // Проверяем существование менеджера
      newManager = await prisma.user.findUnique({
        where: { id: validatedData.managerId },
        select: { id: true, name: true, email: true, role: true }
      });

      if (!newManager) {
        return NextResponse.json(
          { message: 'Пользователь не найден' },
          { status: 404 }
        );
      }

      // Проверяем роль
      if (!['MANAGER', 'SENIOR_MANAGER', 'ACCOUNTANT'].includes(newManager.role)) {
        return NextResponse.json(
          { message: 'Можно назначать только менеджеров, старших менеджеров и бухгалтеров' },
          { status: 400 }
        );
      }
    }

    // Обновляем назначение
    const updateData: any = {};
    if (validatedData.isSeniorManager) {
      updateData.seniorManagerId = validatedData.managerId;
    } else {
      updateData.managerId = validatedData.managerId;
    }

    const updatedSite = await prisma.site.update({
      where: { id: siteId },
      data: updateData,
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
            email: true,
            role: true
          }
        },
        seniorManager: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Логируем в аудит
    const fieldName = validatedData.isSeniorManager ? 'старший менеджер' : 'менеджер';
    const oldManager = validatedData.isSeniorManager 
      ? (site.seniorManager?.name || 'не назначен')
      : (site.manager?.name || 'не назначен');
    const newManagerName = newManager?.name || 'не назначен';
    
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ASSIGN_SITE_MANAGER',
        entity: 'SITE',
        entityId: siteId,
        details: {
          siteName: site.name,
          objectName: site.object.name,
          fieldName,
          oldManager,
          newManager: newManagerName
        }
      }
    });

    // Отправляем уведомление менеджеру в Telegram (если привязан)
    if (newManager?.telegramId) {
      await notifySiteAssignment(newManager.telegramId, {
        siteName: site.name,
        objectName: site.object.name,
        isSeniorManager: validatedData.isSeniorManager
      });
      console.log('📱 Уведомление о назначении на участок отправлено:', newManager.name);
    }

    return NextResponse.json({
      message: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} успешно назначен на участок`,
      site: updatedSite
    });
  } catch (error: any) {
    console.error('Error assigning manager to site:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Неверные данные', errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Ошибка при назначении менеджера', error: error.message },
      { status: 500 }
    );
  }
}
