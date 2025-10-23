import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { materializeTask } from '@/lib/virtual-tasks';

async function getUserFromToken(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, name: true, email: true, role: true }
    });

    return user;
  } catch (error) {
    return null;
  }
}

interface Params {
  params: { id: string };
}

// POST /api/tasks/[id]/complete-virtual - Завершить виртуальную или реальную задачу
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Только менеджеры и админы могут отмечать задачи
    if (!['MANAGER', 'ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await req.json();
    const { status, notes, photoUrl, comment, photos } = body;
    const taskId = params.id;

    console.log('🔄 Завершение задачи:', { taskId, status, userId: user.id });

    // Сначала проверяем, существует ли задача в БД
    let task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        checklist: {
          include: {
            object: { 
              select: { 
                name: true, 
                managerId: true,
                requirePhotoForCompletion: true,
                requireCommentForCompletion: true,
                completionRequirements: true
              } 
            },
            room: { select: { name: true } }
          }
        }
      }
    });

    // Если задача не найдена в БД, пытаемся материализовать виртуальную задачу
    if (!task) {
      console.log('📋 Задача не найдена в БД, пытаемся материализовать виртуальную...');
      
      // Парсим ID виртуальной задачи (формат: techCardId-date)
      const parts = taskId.split('-');
      if (parts.length >= 4) { // например: cmgyu3afm00fjvyjo1rk1i08j-2025-10-23
        const dateStr = parts.slice(-3).join('-'); // последние 3 части - дата
        const techCardId = parts.slice(0, -3).join('-'); // все остальное - ID техкарты
        
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            console.log('🔧 Материализуем задачу:', { techCardId, dateStr });
            
            // Материализуем задачу
            task = await materializeTask(techCardId, date, 'complete');
            
            // Получаем полную информацию о созданной задаче
            task = await prisma.task.findUnique({
              where: { id: task.id },
              include: {
                checklist: {
                  include: {
                    object: { 
                      select: { 
                        name: true, 
                        managerId: true,
                        requirePhotoForCompletion: true,
                        requireCommentForCompletion: true,
                        completionRequirements: true
                      } 
                    },
                    room: { select: { name: true } }
                  }
                }
              }
            });
          }
        } catch (materializeError) {
          console.error('❌ Ошибка материализации:', materializeError);
        }
      }
    }

    // Если задача все еще не найдена, возвращаем ошибку
    if (!task) {
      console.log('❌ Задача не найдена и не может быть материализована:', taskId);
      return NextResponse.json({ message: 'Задача не найдена' }, { status: 404 });
    }

    console.log('✅ Задача найдена:', { id: task.id, status: task.status });

    // Проверяем права доступа для менеджеров
    if (user.role === 'MANAGER' && task.checklist?.object.managerId !== user.id) {
      return NextResponse.json({ 
        message: 'Вы можете работать только со своими объектами' 
      }, { status: 403 });
    }

    // Проверяем требования к завершению (если есть чек-лист)
    if (task.checklist) {
      const requirements = task.checklist.object.completionRequirements as any || {
        photo: task.checklist.object.requirePhotoForCompletion || false,
        comment: task.checklist.object.requireCommentForCompletion || false,
      };

      // Валидация требований к фото
      if (requirements.photo && (!photos || photos.length === 0)) {
        const minPhotos = requirements.minPhotos || 1;
        return NextResponse.json({ 
          error: `Для завершения задачи требуется минимум ${minPhotos} фото` 
        }, { status: 400 });
      }

      // Валидация требований к комментарию
      if (requirements.comment && (!comment || !comment.trim())) {
        return NextResponse.json({ 
          error: 'Для завершения задачи требуется комментарий' 
        }, { status: 400 });
      }
    }

    // Сохраняем предыдущий статус для логирования
    const previousStatus = task.status;
    const completedAt = status === 'COMPLETED' || status === 'CLOSED_WITH_PHOTO' ? new Date() : null;

    // Обновляем задачу
    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: {
        status,
        notes,
        photoUrl,
        completedAt,
        completedById: completedAt ? user.id : null,
        completionComment: comment || null,
        completionPhotos: photos || []
      },
      include: {
        completedBy: { select: { name: true, email: true } },
        checklist: {
          include: {
            object: { select: { name: true } },
            room: { select: { name: true } }
          }
        }
      }
    });

    // Создаем лог действия
    await prisma.auditLog.create({
      data: {
        action: 'TASK_STATUS_CHANGED',
        entityType: 'TASK',
        entityId: task.id,
        userId: user.id,
        details: {
          taskDescription: task.description,
          objectName: task.objectName || task.checklist?.object.name,
          roomName: task.roomName || task.checklist?.room?.name,
          previousStatus,
          newStatus: status,
          notes,
          comment,
          hasPhoto: !!photoUrl,
          photosCount: photos?.length || 0,
          completedAt: completedAt?.toISOString(),
          managerName: user.name,
          managerEmail: user.email,
          wasVirtual: !task.checklist // Если нет чек-листа, значит была виртуальной
        }
      }
    });

    // Если есть чек-лист, проверяем его завершение
    let checklistCompleted = false;
    if (task.checklistId) {
      const checklistTasks = await prisma.task.findMany({
        where: { checklistId: task.checklistId },
        select: { status: true }
      });

      const allCompleted = checklistTasks.every(t => 
        t.status === 'COMPLETED' || t.status === 'CLOSED_WITH_PHOTO'
      );

      if (allCompleted) {
        await prisma.checklist.update({
          where: { id: task.checklistId },
          data: { 
            completedAt: new Date(),
            completedById: user.id
          }
        });

        checklistCompleted = true;

        // Логируем завершение чек-листа
        await prisma.auditLog.create({
          data: {
            action: 'CHECKLIST_COMPLETED',
            entityType: 'CHECKLIST',
            entityId: task.checklistId,
            userId: user.id,
            details: {
              objectName: task.checklist?.object.name,
              roomName: task.checklist?.room?.name,
              totalTasks: checklistTasks.length,
              completedBy: user.name,
              completedAt: new Date().toISOString()
            }
          }
        });
      }
    }

    console.log('✅ Задача успешно завершена:', { 
      id: updatedTask.id, 
      status: updatedTask.status,
      checklistCompleted 
    });

    return NextResponse.json({
      task: updatedTask,
      checklistCompleted,
      message: 'Задача успешно обновлена',
      wasVirtual: !task.checklist
    });

  } catch (error) {
    console.error('❌ Ошибка завершения задачи:', error);
    return NextResponse.json(
      { 
        message: 'Ошибка при обновлении задачи',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}
