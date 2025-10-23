import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

async function getUserFromToken(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, role: true, name: true, email: true }
    });
    
    return user;
  } catch (error) {
    return null;
  }
}

// GET /api/tasks/[id]/details - Получение полной детальной информации о задаче
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { id: taskId } = await params;

    console.log('🔍 Поиск задачи с ID:', taskId);

    // Ищем задачу в таблице Task
    const taskRecord = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        completedBy: {
          select: { name: true }
        },
        room: {
          select: {
            name: true,
            area: true,
            roomGroup: {
              select: {
                name: true,
                zone: {
                  select: {
                    name: true,
                    site: {
                      select: { name: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!taskRecord) {
      console.log('❌ Задача не найдена:', taskId);
      return NextResponse.json({ 
        message: 'Задача не найдена',
        taskId 
      }, { status: 404 });
    }

    console.log('✅ Найдена задача:', taskRecord.id);
      objectName: task.checklist?.object?.name,
      siteName: task.site?.name,
      zoneName: task.zone?.name,
      roomName: task.room?.name
    } : 'Задача не найдена');

    return NextResponse.json({
      id: task.id,
      description: task.description,
      status: task.status,
      completionComment: task.completionComment,
      completionPhotos: task.completionPhotos || [],
      completedAt: task.completedAt,
      completedBy: task.completedBy,
      checklist: {
        object: task.checklist?.object,
        room: task.checklist?.room
      },
      // Добавляем полную иерархию
      site: task.site,
      zone: task.zone,
      room: task.room,
      techCard: task.techCard,
      adminComments: [], // Пока пустой массив
      photoReports: [] // Пока пустой массив
    });

  } catch (error) {
    console.error('Ошибка получения деталей задачи:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
