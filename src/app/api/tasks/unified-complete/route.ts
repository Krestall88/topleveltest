import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { materializeVirtualTask } from '@/lib/unified-task-system';

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

// POST /api/tasks/unified-complete - Единое завершение задач
export async function POST(req: NextRequest) {
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
    const { taskId, status, comment, photos } = body;

    console.log('🔄 UNIFIED COMPLETE: Завершение задачи:', { 
      taskId, 
      status, 
      userId: user.id,
      userRole: user.role 
    });

    // Проверяем, существует ли задача в БД
    let existingTask = await prisma.task.findUnique({
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
            }
          }
        }
      }
    });

    let completedTask;

    if (existingTask) {
      // Задача уже материализована, просто обновляем её
      console.log('✅ UNIFIED COMPLETE: Обновляем существующую задачу');
      
      // Проверяем права доступа для менеджеров
      if (user.role === 'MANAGER' && existingTask.checklist?.object.managerId !== user.id) {
        return NextResponse.json({ 
          message: 'Вы можете работать только со своими объектами' 
        }, { status: 403 });
      }

      const completedAt = status === 'COMPLETED' ? new Date() : null;

      // Если failureReason пустой, пытаемся извлечь frequency из техкарты
      let failureReason = existingTask.failureReason;
      if (!failureReason && taskId.includes('-')) {
        try {
          const parts = taskId.split('-');
          if (parts.length >= 4) {
            const techCardId = parts.slice(0, -3).join('-');
            const techCard = await prisma.techCard.findUnique({
              where: { id: techCardId },
              select: { frequency: true }
            });
            if (techCard) {
              failureReason = techCard.frequency;
              console.log('🔧 UNIFIED COMPLETE: Обновляем frequency для существующей задачи:', {
                taskId,
                techCardId,
                frequency: failureReason
              });
            }
          }
        } catch (error) {
          console.warn('⚠️ UNIFIED COMPLETE: Не удалось извлечь frequency:', error);
        }
      }

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          status,
          completedAt,
          completedById: completedAt ? user.id : null,
          completionComment: comment || null,
          completionPhotos: photos || [],
          failureReason: failureReason || existingTask.failureReason // Обновляем frequency если получили
        },
        include: {
          completedBy: { select: { id: true, name: true } }
        }
      });

      // Создаем фотоотчеты
      if (photos && photos.length > 0) {
        const photoReports = photos.map((photoUrl: string) => ({
          url: photoUrl,
          comment: comment || `Фото при завершении задачи: ${updatedTask.description}`,
          uploaderId: user.id,
          taskId: updatedTask.id,
          objectId: null, // Для существующих задач objectId может быть неизвестен
          checklistId: updatedTask.checklistId || null // Может быть null для виртуальных задач
        }));

        await prisma.photoReport.createMany({
          data: photoReports
        });
      }

      completedTask = {
        id: updatedTask.id,
        status: updatedTask.status,
        completedAt: updatedTask.completedAt,
        completedBy: updatedTask.completedBy,
        completionComment: updatedTask.completionComment,
        completionPhotos: updatedTask.completionPhotos
      };

    } else {
      // Виртуальная задача, материализуем её
      console.log('🔧 UNIFIED COMPLETE: Материализуем виртуальную задачу');
      
      try {
        const materializedTask = await materializeVirtualTask(
          taskId,
          user.id,
          status,
          comment,
          photos
        );

        // Создаем фотоотчеты для материализованной задачи
        if (photos && photos.length > 0) {
          const photoReports = photos.map((photoUrl: string) => ({
            url: photoUrl,
            comment: comment || `Фото при завершении задачи: ${materializedTask.description}`,
            uploaderId: user.id,
            taskId: materializedTask.id,
            objectId: materializedTask.objectId
            // Убираем checklistId для виртуальных задач
          }));

          await prisma.photoReport.createMany({
            data: photoReports
          });
        }

        completedTask = {
          id: materializedTask.id,
          status: materializedTask.status,
          completedAt: materializedTask.completedAt,
          completedBy: materializedTask.completedBy,
          completionComment: materializedTask.completionComment,
          completionPhotos: materializedTask.completionPhotos
        };

      } catch (materializeError) {
        console.error('❌ UNIFIED COMPLETE: Ошибка материализации:', materializeError);
        return NextResponse.json({ 
          message: 'Не удалось материализовать задачу: ' + materializeError 
        }, { status: 400 });
      }
    }

    // Создаем лог действия
    await prisma.auditLog.create({
      data: {
        action: 'TASK_COMPLETED_UNIFIED',
        entity: 'TASK',
        entityId: taskId,
        userId: user.id,
        details: {
          taskId,
          status,
          comment,
          photosCount: photos?.length || 0,
          completedAt: completedTask.completedAt?.toISOString(),
          managerName: user.name,
          managerEmail: user.email,
          wasVirtual: !existingTask
        }
      }
    });

    console.log('✅ UNIFIED COMPLETE: Задача успешно завершена:', {
      taskId,
      status: completedTask.status,
      wasVirtual: !existingTask
    });

    return NextResponse.json({
      task: completedTask,
      message: 'Задача успешно завершена',
      wasVirtual: !existingTask
    });

  } catch (error) {
    console.error('❌ UNIFIED COMPLETE: Ошибка завершения задачи:', error);
    return NextResponse.json(
      { message: 'Ошибка при завершении задачи: ' + error },
      { status: 500 }
    );
  }
}
