import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { materializeTask } from '@/lib/virtual-tasks';

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

// GET /api/tasks/[id]/admin-comments - Получение комментариев к задаче
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { id: taskId } = await params;

    // Получаем комментарии к задаче
    const comments = await prisma.taskAdminComment.findMany({
      where: { taskId },
      include: {
        admin: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      comments
    });

  } catch (error) {
    console.error('Ошибка получения комментариев:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка сервера' 
    }, { status: 500 });
  }
}

// POST /api/tasks/[id]/admin-comments - Добавление комментария к задаче
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем права администратора
    if (!['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ 
        message: 'Недостаточно прав' 
      }, { status: 403 });
    }

    const { id: taskId } = await params;
    const { content, type, parentId } = await req.json();

    if (!content || !type) {
      return NextResponse.json({ 
        message: 'Не указан текст комментария или тип' 
      }, { status: 400 });
    }

    console.log('💬 Добавление комментария к задаче:', taskId);

    // Проверяем существование задачи или материализуем виртуальную
    let task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        checklist: {
          include: {
            creator: true,
            object: true
          }
        }
      }
    });

    // Если задача не найдена, пытаемся материализовать виртуальную
    if (!task) {
      console.log('📋 Задача не найдена в БД, пытаемся материализовать виртуальную...');
      
      // Парсим ID виртуальной задачи (формат: techCardId-date)
      const parts = taskId.split('-');
      if (parts.length >= 4) {
        const dateStr = parts.slice(-3).join('-'); // последние 3 части - дата
        const techCardId = parts.slice(0, -3).join('-'); // все остальное - ID техкарты
        
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            console.log('🔧 Материализуем задачу для комментария:', { techCardId, dateStr });
            
            // Материализуем задачу
            const materializedTask = await materializeTask(techCardId, date, 'comment');
            
            // Получаем полную информацию о созданной задаче
            task = await prisma.task.findUnique({
              where: { id: materializedTask.id },
              include: {
                checklist: {
                  include: {
                    creator: true,
                    object: true
                  }
                }
              }
            });
          }
        } catch (materializeError) {
          console.error('❌ Ошибка материализации для комментария:', materializeError);
        }
      }
    }

    if (!task) {
      console.log('❌ Задача не найдена и не может быть материализована:', taskId);
      return NextResponse.json({ 
        message: 'Задача не найдена' 
      }, { status: 404 });
    }

    console.log('✅ Задача найдена для комментария:', { id: task.id, description: task.description });

    // Преобразуем тип комментария из фронтенда в формат БД
    const typeMapping: { [key: string]: string } = {
      'admin_note': 'ADMIN_NOTE',
      'completion_feedback': 'COMPLETION_FEEDBACK', 
      'instruction': 'INSTRUCTION',
      'quality_check': 'QUALITY_CHECK'
    };

    const dbType = typeMapping[type] || 'ADMIN_NOTE';
    console.log('🔄 Преобразование типа комментария:', { frontendType: type, dbType });

    // Создаем комментарий
    const comment = await prisma.taskAdminComment.create({
      data: {
        taskId: task.id, // Используем task.id вместо taskId для материализованной задачи
        adminId: user.id,
        content,
        type: dbType as any, // Приводим к типу схемы
        parentCommentId: parentId || null
      },
      include: {
        admin: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    // Создаем уведомление для менеджера
    if (task.checklist?.creator) {
      await prisma.notification.create({
        data: {
          userId: task.checklist.creator.id,
          title: 'Новый комментарий администратора',
          message: `Администратор ${user.name} оставил комментарий к задаче "${task.description}"`,
          type: 'ADMIN_COMMENT',
          relatedTaskId: taskId
        }
      });
    }

    // Логируем действие
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_COMMENT_ADDED',
        entity: 'Task',
        entityId: taskId,
        details: {
          commentType: type,
          content: content.substring(0, 100),
          taskDescription: task.description,
          objectName: task.checklist?.object?.name
        }
      }
    });

    return NextResponse.json({
      success: true,
      comment,
      message: 'Комментарий добавлен успешно'
    });

  } catch (error) {
    console.error('Ошибка добавления комментария:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
