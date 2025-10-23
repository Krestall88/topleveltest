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

// GET /api/photo-reports/general - Получение общих фотоотчетов
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get('managerId');
    const objectId = searchParams.get('objectId');

    // Формируем условия поиска
    const whereClause: any = {
      type: 'GENERAL_CHECKLIST' // Тип для общих фотоотчетов
    };

    // Фильтры на основе роли
    if (user.role === 'MANAGER') {
      whereClause.createdById = user.id;
    } else if (managerId) {
      whereClause.createdById = managerId;
    }

    if (objectId) {
      whereClause.objectId = objectId;
    }

    console.log('📸 Запрос общих фотоотчетов:', {
      whereClause,
      userRole: user.role
    });

    // Получаем фотоотчеты
    const reports = await prisma.photoReport.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        object: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Преобразуем для фронтенда
    const formattedReports = reports.map(report => ({
      id: report.id,
      photos: report.photos || [],
      comment: report.comment || '',
      createdAt: report.createdAt.toISOString(),
      createdBy: {
        name: report.createdBy.name,
        role: report.createdBy.role
      },
      objectName: report.object?.name || 'Общий отчет'
    }));

    console.log(`✅ Найдено отчетов: ${formattedReports.length}`);

    return NextResponse.json({
      reports: formattedReports,
      total: formattedReports.length
    });

  } catch (error) {
    console.error('💥 Ошибка получения фотоотчетов:', error);
    return NextResponse.json({ 
      message: 'Ошибка сервера',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// POST /api/photo-reports/general - Создание общего фотоотчета
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Получаем данные из FormData
    const formData = await request.formData();
    const comment = formData.get('comment') as string;
    const objectId = formData.get('objectId') as string;

    // Собираем файлы
    const photos: string[] = [];
    let photoIndex = 0;
    
    while (true) {
      const file = formData.get(`photo_${photoIndex}`) as File;
      if (!file) break;
      
      // Здесь должна быть логика сохранения файла
      // Для демонстрации используем заглушку
      const photoUrl = `/uploads/photos/${Date.now()}_${photoIndex}.jpg`;
      photos.push(photoUrl);
      photoIndex++;
    }

    if (photos.length === 0) {
      return NextResponse.json({ 
        message: 'Не выбрано ни одного фото' 
      }, { status: 400 });
    }

    console.log('📸 Создание общего фотоотчета:', {
      userId: user.id,
      photosCount: photos.length,
      objectId,
      hasComment: !!comment
    });

    // Создаем фотоотчет
    const report = await prisma.photoReport.create({
      data: {
        type: 'GENERAL_CHECKLIST',
        photos: photos,
        comment: comment || null,
        createdById: user.id,
        objectId: objectId || null
      },
      include: {
        createdBy: {
          select: {
            name: true,
            role: true
          }
        },
        object: {
          select: {
            name: true
          }
        }
      }
    });

    // Логируем создание
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_PHOTO_REPORT',
        userId: user.id,
        details: `Создан общий фотоотчет с ${photos.length} фото`,
        metadata: {
          reportId: report.id,
          photosCount: photos.length,
          objectId: objectId || null,
          hasComment: !!comment
        }
      }
    });

    console.log(`✅ Создан фотоотчет: ${report.id}`);

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        photos: report.photos,
        comment: report.comment,
        createdAt: report.createdAt.toISOString(),
        createdBy: {
          name: report.createdBy.name,
          role: report.createdBy.role
        },
        objectName: report.object?.name || 'Общий отчет'
      },
      message: 'Фотоотчет успешно создан'
    });

  } catch (error) {
    console.error('💥 Ошибка создания фотоотчета:', error);
    return NextResponse.json({ 
      message: 'Ошибка сервера',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
