import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

async function getUserFromToken(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    return { 
      id: payload.userId as string, 
      role: payload.role as string 
    };
  } catch (error) {
    return null;
  }
}

// GET /api/reporting/tasks - Получить задачи отчетности
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const objectId = searchParams.get('objectId');
    const status = searchParams.get('status');

    let whereClause: any = {};

    // Фильтрация по объекту
    if (objectId) {
      whereClause.objectId = objectId;
    }

    // Фильтрация по статусу
    if (status) {
      whereClause.status = status;
    }

    // Ограничения доступа по ролям
    if (user.role === 'MANAGER') {
      // Менеджер видит только задачи своих объектов
      const managedObjects = await prisma.cleaningObject.findMany({
        where: { managerId: user.id },
        select: { id: true }
      });
      
      const objectIds = managedObjects.map(obj => obj.id);
      whereClause.objectId = { in: objectIds };
    }

    const tasks = await prisma.reportingTask.findMany({
      where: whereClause,
      include: {
        object: {
          select: { id: true, name: true, managerId: true }
        },
        createdBy: {
          select: { id: true, name: true, role: true }
        },
        assignedTo: {
          select: { id: true, name: true, role: true }
        },
        _count: {
          select: {
            comments: true,
            attachments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Ошибка при получении задач отчетности:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/reporting/tasks - Создать новую задачу отчетности
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, objectId, assignedToId, priority, dueDate } = body;

    // Проверяем права создания задач
    const canCreate = user.role === 'ADMIN' || user.role === 'DEPUTY';
    
    if (!canCreate) {
      // Менеджер может создавать задачи только для своих объектов
      if (user.role === 'MANAGER') {
        const object = await prisma.cleaningObject.findUnique({
          where: { id: objectId }
        });
        
        if (!object || object.managerId !== user.id) {
          return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
      }
    }

    // Проверяем, что объект существует
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId }
    });

    if (!object) {
      return NextResponse.json({ message: 'Объект не найден' }, { status: 404 });
    }

    // Проверяем, что назначенный пользователь существует
    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId }
      });

      if (!assignedUser) {
        return NextResponse.json({ message: 'Назначенный пользователь не найден' }, { status: 404 });
      }
    }

    const task = await prisma.reportingTask.create({
      data: {
        title,
        description,
        objectId,
        createdById: user.id,
        assignedToId: assignedToId || user.id,
        priority: priority || 'MEDIUM',
        status: 'NEW',
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        object: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, role: true }
        },
        assignedTo: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании задачи отчетности:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
