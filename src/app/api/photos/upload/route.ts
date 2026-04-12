import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { uploadImage } from '@/lib/storage';

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

// POST /api/photos/upload - Загрузка фотоотчетов
export async function POST(req: NextRequest) {
  try {
    console.log('📸 API: Начало загрузки фото');
    
    const user = await getUserFromToken(req);
    if (!user) {
      console.log('❌ API: Пользователь не авторизован');
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    console.log('✅ API: Пользователь авторизован:', user.name);

    const formData = await req.formData();
    console.log('📋 API: FormData получена');
    
    const files = formData.getAll('photos') as File[];
    const taskId = formData.get('taskId') as string;
    const objectId = formData.get('objectId') as string;
    const techCardId = formData.get('techCardId') as string;
    const comment = formData.get('comment') as string;

    console.log('📸 API: Параметры:', {
      filesCount: files.length,
      taskId,
      objectId,
      techCardId,
      hasComment: !!comment
    });

    if (!files || files.length === 0) {
      console.log('❌ API: Нет файлов для загрузки');
      return NextResponse.json({ message: 'Нет файлов для загрузки' }, { status: 400 });
    }

    const uploadedPhotos = [];

    for (const file of files) {
      if (file.size === 0) {
        console.log('⚠️ API: Пропускаем пустой файл');
        continue;
      }

      console.log('📤 API: Загружаем файл:', file.name, 'размер:', file.size);

      try {
        // Загружаем файл в облачное хранилище (Timeweb S3)
        const fileUrl = await uploadImage(file);
        console.log('✅ API: Файл загружен в S3:', fileUrl);

        // Для виртуальных задач НЕ создаем photoReport сразу
        // Виртуальные задачи имеют формат: techCardId-YYYY-MM-DD или techCardId-objectId-roomId-YYYY-MM-DD
        const isVirtualTask = taskId && /\d{4}-\d{2}-\d{2}$/.test(taskId);
        
        console.log('🔍 API: Проверка задачи:', {
          taskId,
          isVirtual: isVirtualTask,
          pattern: /\d{4}-\d{2}-\d{2}$/.test(taskId || '')
        });
        
        // Для виртуальных задач просто возвращаем URL фото
        // PhotoReport будет создан позже в /api/tasks/unified-complete после материализации
        if (isVirtualTask) {
          console.log('⚠️ API: Виртуальная задача, пропускаем создание photoReport');
          uploadedPhotos.push({
            id: `temp-${Date.now()}-${Math.random()}`,
            url: fileUrl,
            comment: comment || null,
            uploaderId: user.id,
            objectId: objectId,
            createdAt: new Date()
          });
        } else {
          // Для материализованных задач создаем photoReport
          const photoData: any = {
            url: fileUrl,
            comment: comment || null,
            uploaderId: user.id,
            objectId: objectId
          };
          
          // Проверяем, существует ли задача в БД
          if (taskId) {
            const taskExists = await prisma.task.findUnique({
              where: { id: taskId },
              select: { id: true }
            });
            
            if (taskExists) {
              photoData.taskId = taskId;
              console.log('✅ API: Задача существует, добавляем taskId');
            } else {
              console.log('⚠️ API: Задача не найдена в БД, пропускаем taskId');
            }
          }
          
          const photoReport = await prisma.photoReport.create({
            data: photoData
          });

          console.log('✅ API: Запись в БД создана:', photoReport.id);
          uploadedPhotos.push(photoReport);
        }
      } catch (fileError) {
        console.error('❌ API: Ошибка загрузки файла:', file.name, fileError);
        throw fileError;
      }
    }

    // Логируем действие только если создали photoReport (не виртуальная задача)
    const isVirtualTask = taskId && /\d{4}-\d{2}-\d{2}$/.test(taskId);
    if (!isVirtualTask && uploadedPhotos.length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PHOTOS_UPLOADED',
          entity: 'PhotoReport',
          entityId: uploadedPhotos[0]?.id || '',
          details: {
            photosCount: uploadedPhotos.length,
            objectId: objectId,
            techCardId: techCardId,
            taskId: taskId,
            comment: comment
          }
        }
      });
    }

    return NextResponse.json({
      message: 'Фотоотчеты загружены',
      photos: uploadedPhotos.map(photo => ({
        id: photo.id,
        url: photo.url,
        comment: photo.comment
      }))
    });

  } catch (error) {
    console.error('❌ API: Ошибка загрузки фотоотчетов:', error);
    console.error('❌ API: Детали ошибки:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      message: 'Ошибка сервера: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}

// GET /api/photos/upload - Получение фотоотчетов
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const objectId = searchParams.get('objectId');
    const taskId = searchParams.get('taskId');
    const techCardId = searchParams.get('techCardId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Строим условия для поиска
    const whereClause: any = {};
    let managerObjects: Array<{ id: string; name?: string | null }> = [];
    let managerObjectIds: string[] = [];
    let managerObjectNames: string[] = [];

    // Права доступа для менеджеров - СНАЧАЛА фильтруем по объектам менеджера
    if (user.role === 'MANAGER') {
      // Получаем объекты менеджера
      managerObjects = await prisma.cleaningObject.findMany({
        where: { managerId: user.id },
        select: { id: true, name: true }
      });
      managerObjectIds = managerObjects.map(obj => obj.id);
      managerObjectNames = managerObjects.map(obj => obj.name).filter((name): name is string => Boolean(name));
      
      if (managerObjects.length > 0) {
        // Если передан objectId, проверяем что он принадлежит менеджеру
        if (objectId) {
          if (managerObjectIds.includes(objectId)) {
            whereClause.objectId = objectId;
          } else {
            // Объект не принадлежит менеджеру - возвращаем пустой результат
            return NextResponse.json({ photos: [] });
          }
        } else {
          // Фильтруем только по объектам менеджера
          whereClause.objectId = {
            in: managerObjectIds
          };
        }
      } else {
        // Если у менеджера нет объектов, возвращаем пустой результат
        return NextResponse.json({ photos: [] });
      }
    } else {
      // Для админов и других ролей - применяем фильтры как есть
      if (objectId) whereClause.objectId = objectId;
    }

    if (taskId) whereClause.taskId = taskId;
    if (techCardId) whereClause.techCardId = techCardId;

    // Сначала проверяем фотоотчеты из таблицы photoReport
    const photos = await prisma.photoReport.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    console.log('🔍 API фотоотчетов: найдено в photoReport:', photos.length);

    // Также проверяем завершенные задачи с фотографиями
    // Для менеджеров фильтруем по их объектам
    let tasksWithPhotos: any[] = [];
    
    if (user.role === 'MANAGER') {
      // Для менеджеров - только задачи их объектов
      if (managerObjects.length > 0) {
        tasksWithPhotos = await prisma.task.findMany({
          where: {
            status: 'COMPLETED',
            completionPhotos: {
              isEmpty: false
            },
            OR: [
              {
                checklist: {
                  objectId: {
                    in: managerObjectIds
                  }
                }
              },
              {
                objectName: {
                  in: managerObjectNames
                }
              }
            ]
          },
          select: {
            id: true,
            description: true,
            completionPhotos: true,
            completedAt: true,
            completedById: true,
            checklistId: true,
            roomId: true
          },
          orderBy: {
            completedAt: 'desc'
          },
          take: 20
        });
      }
    } else {
      // Для админов - все задачи
      tasksWithPhotos = await prisma.task.findMany({
        where: {
          status: 'COMPLETED',
          completionPhotos: {
            isEmpty: false
          }
        },
        select: {
          id: true,
          description: true,
          completionPhotos: true,
          completedAt: true,
          completedById: true,
          checklistId: true,
          roomId: true
        },
        orderBy: {
          completedAt: 'desc'
        },
        take: 20
      });
    }

    console.log('🔍 API фотоотчетов: найдено завершенных задач с фото:', tasksWithPhotos.length);

    // Получаем связанные данные для photoReport
    const enrichedPhotos = await Promise.all(
      photos.map(async (photo) => {
        const [uploader, object, task] = await Promise.all([
          photo.uploaderId ? prisma.user.findUnique({
            where: { id: photo.uploaderId },
            select: { id: true, name: true }
          }) : null,
          photo.objectId ? prisma.cleaningObject.findUnique({
            where: { id: photo.objectId },
            select: { id: true, name: true }
          }) : null,
          photo.taskId ? prisma.task.findUnique({
            where: { id: photo.taskId },
            select: { id: true, description: true }
          }) : null
        ]);

        return {
          id: photo.id,
          url: photo.url,
          comment: photo.comment,
          createdAt: photo.createdAt,
          uploader,
          object,
          task
        };
      })
    );

    console.log('🔍 API фотоотчетов: обработано фото из photoReport:', enrichedPhotos.length);

    // Преобразуем фотографии из завершенных задач
    const taskPhotos = await Promise.all(
      tasksWithPhotos.map(async (task) => {
        const uploader = task.completedById ? await prisma.user.findUnique({
          where: { id: task.completedById },
          select: { id: true, name: true }
        }) : null;

        // Получаем полную иерархию через чек-лист
        console.log(`🔍 Задача ${task.id}: checklistId =`, task.checklistId);
        
        const checklist = task.checklistId ? await prisma.checklist.findUnique({
          where: { id: task.checklistId },
          select: {
            id: true,
            object: {
              select: { 
                id: true, 
                name: true,
                address: true
              }
            }
          }
        }) : null;

        console.log(`🔍 Задача ${task.id}: checklist найден =`, !!checklist);
        console.log(`🔍 Задача ${task.id}: объект =`, checklist?.object?.name);

        // Если через чек-лист не получилось, попробуем напрямую через объекты
        let objectInfo = checklist?.object;
        if (!objectInfo) {
          // Попробуем найти объект другим способом
          const allObjects = await prisma.cleaningObject.findMany({
            select: { id: true, name: true, address: true },
            take: 1
          });
          objectInfo = allObjects[0] || null;
          console.log(`🔍 Задача ${task.id}: fallback объект =`, objectInfo?.name);
        }

        // Получаем информацию о помещении
        let room = null;
        if (task.roomId) {
          room = await prisma.room.findUnique({
            where: { id: task.roomId },
            select: {
              name: true,
              area: true
            }
          });
        }

        return task.completionPhotos.map((url, index) => ({
          id: `task-${task.id}-${index}`,
          url,
          comment: task.description,
          createdAt: task.completedAt,
          uploader,
          object: objectInfo || null,
          room: room || null,
          task: {
            id: task.id,
            description: task.description
          },
          hierarchy: {
            object: objectInfo?.name || null,
            address: objectInfo?.address || null,
            room: room?.name || null,
            area: room?.area || null
          }
        }));
      })
    );

    const flatTaskPhotos = taskPhotos.flat();
    console.log('🔍 API фотоотчетов: преобразовано фото из задач:', flatTaskPhotos.length);

    // Объединяем все фотографии
    const allPhotos = [...enrichedPhotos, ...flatTaskPhotos];

    const uniquePhotosMap = new Map<string, any>();
    for (const photo of allPhotos) {
      if (!uniquePhotosMap.has(photo.url)) {
        uniquePhotosMap.set(photo.url, photo);
      }
    }
    const uniquePhotos = Array.from(uniquePhotosMap.values());

    return NextResponse.json({
      photos: uniquePhotos
    });

  } catch (error) {
    console.error('Ошибка получения фотоотчетов:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
