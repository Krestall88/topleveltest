import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateTaskSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'COMPLETED', 'CLOSED_WITH_PHOTO']),
  photoUrl: z.string().optional(),
  completedById: z.string().optional(),
  roomId: z.string().optional(),
});

interface Params {
  params: { id: string };
}

// PATCH /api/tasks/[id] - Обновить статус задачи
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const { status, photoUrl, completedById, roomId } = updateTaskSchema.parse(body);

    // Проверка: для статуса CLOSED_WITH_PHOTO обязательно фото
    if (status === 'CLOSED_WITH_PHOTO' && !photoUrl) {
      return NextResponse.json(
        { error: 'Для закрытия задачи с фото необходимо прикрепить фотоотчет' },
        { status: 400 }
      );
    }

    const updateData: any = { status };
    
    if (status === 'COMPLETED' || status === 'CLOSED_WITH_PHOTO') {
      updateData.completedAt = new Date();
      if (completedById) {
        updateData.completedById = completedById;
      }
    }
    
    if (photoUrl) {
      updateData.photoUrl = photoUrl;
    }

    if (roomId) {
      updateData.roomId = roomId;
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        checklist: {
          select: { 
            id: true, 
            date: true,
            object: { select: { name: true } }
          }
        },
        room: {
          select: { name: true }
        },
        completedBy: {
          select: { name: true }
        },
        photoReports: {
          select: { url: true, comment: true, createdAt: true }
        }
      }
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ошибка валидации', details: error.errors }, { status: 400 });
    }
    console.error('Ошибка при обновлении задачи:', error);
    return NextResponse.json({ error: 'Не удалось обновить задачу' }, { status: 500 });
  }
}

// GET /api/tasks/[id] - Получить детали задачи
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        checklist: {
          select: { 
            id: true, 
            date: true,
            object: { 
              select: { 
                id: true,
                name: true, 
                address: true,
                requirePhotoForCompletion: true,
                requireCommentForCompletion: true,
                completionRequirements: true
              } 
            },
            room: {
              select: { id: true, name: true }
            }
          }
        },
        room: {
          select: { name: true, description: true }
        },
        request: {
          select: { title: true, description: true }
        },
        completedBy: {
          select: { name: true, email: true }
        },
        expenses: {
          include: {
            item: { select: { name: true, unit: true } },
            user: { select: { name: true } }
          }
        },
        photoReports: {
          select: { 
            id: true,
            url: true, 
            comment: true, 
            createdAt: true,
            uploader: { select: { name: true } }
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Ошибка при получении задачи:', error);
    return NextResponse.json({ error: 'Не удалось загрузить задачу' }, { status: 500 });
  }
}
