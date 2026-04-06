import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPhotoReportSchema } from '@/lib/validators/photo';
import { ZodError } from 'zod';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

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

// GET /api/photos - Получить список фотоотчётов
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const objectId = searchParams.get('objectId');
  const checklistId = searchParams.get('checklistId');
  const requestId = searchParams.get('requestId');
  const taskId = searchParams.get('taskId');

  try {
    // Проверка авторизации
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const where: any = {};
    
    // Права доступа для менеджеров - фильтруем по объектам менеджера
    if (user.role === 'MANAGER') {
      // Получаем объекты менеджера
      const managerObjects = await prisma.cleaningObject.findMany({
        where: { managerId: user.id },
        select: { id: true }
      });
      
      if (managerObjects.length > 0) {
        const managerObjectIds = managerObjects.map(obj => obj.id);
        
        // Если передан objectId, проверяем что он принадлежит менеджеру
        if (objectId) {
          if (managerObjectIds.includes(objectId)) {
            where.objectId = objectId;
          } else {
            // Объект не принадлежит менеджеру - возвращаем пустой результат
            return NextResponse.json([]);
          }
        } else {
          // Фильтруем только по объектам менеджера
          where.objectId = {
            in: managerObjectIds
          };
        }
      } else {
        // Если у менеджера нет объектов, возвращаем пустой результат
        return NextResponse.json([]);
      }
    } else {
      // Для админов и других ролей - применяем фильтры как есть
      if (objectId) where.objectId = objectId;
    }
    
    if (checklistId) where.checklistId = checklistId;
    if (requestId) where.requestId = requestId;
    if (taskId) where.taskId = taskId;

    const photos = await prisma.photoReport.findMany({
      where,
      include: {
        uploader: {
          select: { name: true, email: true }
        },
        object: {
          select: { name: true, address: true }
        },
        checklist: {
          select: { id: true, date: true }
        },
        request: {
          select: { id: true, title: true }
        },
        task: {
          include: {
            checklist: {
              include: {
                object: { select: { name: true } },
                room: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/photos - Создать новый фотоотчёт
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Временно используем простую валидацию вместо схемы
    const { url, comment, uploaderId, objectId, checklistId, requestId, taskId } = body;

    const photoData: any = {
      url,
      uploaderId,
    };

    if (comment) photoData.comment = comment;
    if (objectId) photoData.objectId = objectId;
    if (checklistId) photoData.checklistId = checklistId;
    if (requestId) photoData.requestId = requestId;
    if (taskId) photoData.taskId = taskId;

    const newPhoto = await prisma.photoReport.create({
      data: photoData,
      include: {
        uploader: {
          select: { name: true, email: true }
        },
        object: {
          select: { name: true, address: true }
        },
        checklist: {
          select: { id: true, date: true }
        },
        request: {
          select: { id: true, title: true }
        },
        task: {
          include: {
            checklist: {
              include: {
                object: { select: { name: true } },
                room: { select: { name: true } }
              }
            }
          }
        }
      }
    });

    return NextResponse.json(newPhoto, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Ошибка валидации', details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Не удалось создать фотоотчёт' }, { status: 500 });
  }
}
