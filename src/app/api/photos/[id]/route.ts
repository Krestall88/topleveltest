import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getUserFromToken(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    return payload;
  } catch (error) {
    return null;
  }
}

// DELETE /api/photos/[id] - Удалить фотографию
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await context.params;

    // Получаем фотографию
    const photo = await prisma.photoReport.findUnique({
      where: { id }
    });

    if (!photo) {
      return NextResponse.json({ message: 'Фотография не найдена' }, { status: 404 });
    }

    // Проверка прав: только админы или автор фотографии могут удалять
    const isAdmin = ['ADMIN', 'DEPUTY_ADMIN'].includes(user.role as string);
    const isOwner = photo.uploaderId === user.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    // Удаляем фотографию
    await prisma.photoReport.delete({
      where: { id }
    });

    // Логируем удаление
    await prisma.auditLog.create({
      data: {
        action: 'PHOTO_DELETED',
        entity: 'PHOTO_REPORT',
        entityId: id,
        details: {
          url: photo.url,
          deletedBy: user.userId as string
        },
        userId: user.userId as string
      }
    });

    console.log('✅ Фотография удалена:', id);

    return NextResponse.json({ message: 'Фотография удалена' });

  } catch (error) {
    console.error('Ошибка удаления фотографии:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
