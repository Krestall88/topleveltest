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

    // Пытаемся удалить фотоотчет из таблицы PhotoReport по реальному ID
    const photo = await prisma.photoReport.findUnique({
      where: { id }
    });

    if (photo) {
      // Проверка прав: только админы или автор фотографии могут удалять
      const isAdmin = ['ADMIN', 'DEPUTY_ADMIN'].includes(user.role as string);
      const isOwner = photo.uploaderId === user.userId;

      if (!isAdmin && !isOwner) {
        return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
      }

      await prisma.photoReport.delete({
        where: { id }
      });

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
    }

    // Если записи PhotoReport нет, пробуем удалить фото, пришедшее из completionPhotos задачи
    if (id.startsWith('task-')) {
      const rawId = id.substring(5); // убираем префикс "task-"
      const lastDashIndex = rawId.lastIndexOf('-');

      if (lastDashIndex <= 0) {
        return NextResponse.json({ message: 'Неверный идентификатор фотографии' }, { status: 400 });
      }

      const taskId = rawId.substring(0, lastDashIndex);
      const indexStr = rawId.substring(lastDashIndex + 1);
      const photoIndex = parseInt(indexStr, 10);

      if (Number.isNaN(photoIndex)) {
        return NextResponse.json({ message: 'Неверный идентификатор фотографии' }, { status: 400 });
      }

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          completionPhotos: true,
          completedById: true
        }
      });

      if (!task || !task.completionPhotos || task.completionPhotos.length <= photoIndex) {
        return NextResponse.json({ message: 'Фотография не найдена' }, { status: 404 });
      }

      // Проверка прав: только админы или тот, кто завершил задачу
      const isAdmin = ['ADMIN', 'DEPUTY_ADMIN'].includes(user.role as string);
      const isOwner = task.completedById === user.userId;

      if (!isAdmin && !isOwner) {
        return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
      }

      const removedUrl = task.completionPhotos[photoIndex];
      const newCompletionPhotos = task.completionPhotos.filter((_, i) => i !== photoIndex);

      await prisma.task.update({
        where: { id: taskId },
        data: {
          completionPhotos: newCompletionPhotos
        }
      });

      await prisma.auditLog.create({
        data: {
          action: 'TASK_COMPLETION_PHOTO_DELETED',
          entity: 'TASK',
          entityId: taskId,
          details: {
            url: removedUrl,
            source: 'completionPhotos',
            index: photoIndex
          },
          userId: user.userId as string
        }
      });

      console.log('✅ Удалено фото из completionPhotos задачи:', { taskId, photoIndex });

      return NextResponse.json({ message: 'Фотография удалена' });
    }

    return NextResponse.json({ message: 'Фотография не найдена' }, { status: 404 });

  } catch (error) {
    console.error('Ошибка удаления фотографии:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
