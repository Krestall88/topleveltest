import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();

// Схема валидации для техкарты
const TechCardSchema = z.object({
  name: z.string().min(1, 'Название техкарты обязательно'),
  description: z.string().optional(),
  frequency: z.string().min(1, 'Периодичность обязательна'),
  workType: z.string().min(1, 'Тип работ обязателен'),
  period: z.string().min(1, 'Период обязателен'),
  seasonality: z.string().optional().default('Общий'),
  notes: z.string().optional()
});

// Схема валидации для помещения
const RoomSchema = z.object({
  name: z.string().min(1, 'Название помещения обязательно'),
  area: z.number().positive('Площадь должна быть положительным числом'),
  description: z.string().optional(),
  zoneName: z.string().min(1, 'Название зоны обязательно'),
  roomGroupName: z.string().min(1, 'Группа помещений обязательна'),
  techCards: z.array(TechCardSchema).min(1, 'Необходимо добавить хотя бы одну техкарту')
});

// Схема валидации для объекта
const ObjectSchema = z.object({
  name: z.string().min(1, 'Название объекта обязательно'),
  address: z.string().min(1, 'Адрес объекта обязателен'),
  description: z.string().optional(),
  managerId: z.string().optional(),
  workingHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Неверный формат времени'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'Неверный формат времени')
  }).optional(),
  workingDays: z.array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])).optional(),
  autoChecklistEnabled: z.boolean().optional(),
  requirePhotoForCompletion: z.boolean().optional(),
  rooms: z.array(RoomSchema).min(1, 'Необходимо добавить хотя бы одно помещение')
});

export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    } catch (error) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 });
    }

    // Проверяем права доступа
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Недостаточно прав для создания объектов' }, { status: 403 });
    }

    // Валидируем данные
    const body = await request.json();
    const validatedData = ObjectSchema.parse(body);

    // Создаем объект в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Создаем основной объект
      const cleaningObject = await tx.cleaningObject.create({
        data: {
          name: validatedData.name,
          address: validatedData.address,
          description: validatedData.description || '',
          creatorId: user.id,
          managerId: validatedData.managerId || null,
          workingHours: validatedData.workingHours ? JSON.stringify(validatedData.workingHours) : null,
          workingDays: validatedData.workingDays || [],
          autoChecklistEnabled: validatedData.autoChecklistEnabled ?? true,
          requirePhotoForCompletion: validatedData.requirePhotoForCompletion ?? false,
          timezone: 'Europe/Moscow' // По умолчанию московское время
        }
      });

      // Создаем помещения и техкарты
      const createdRooms = [];
      const createdTechCards = [];

      for (const roomData of validatedData.rooms) {
        // Создаем помещение
        const room = await tx.room.create({
          data: {
            name: roomData.name,
            area: roomData.area,
            description: roomData.description || '',
            objectId: cleaningObject.id
          }
        });
        createdRooms.push(room);

        // Создаем техкарты для помещения
        for (const techCardData of roomData.techCards) {
          const techCard = await tx.objectStructure.create({
            data: {
              objectId: cleaningObject.id,
              objectName: cleaningObject.name,
              siteName: 'Основная территория',
              zoneName: roomData.zoneName,
              roomGroupName: roomData.roomGroupName,
              roomName: roomData.name,
              cleaningObjectName: roomData.name,
              techCardName: techCardData.name,
              frequency: techCardData.frequency,
              workType: techCardData.workType,
              description: techCardData.description || techCardData.name,
              notes: techCardData.notes || '',
              period: techCardData.period,
              seasonality: techCardData.seasonality || 'Общий',
              techCardId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }
          });
          createdTechCards.push(techCard);
        }
      }

      // Логируем создание объекта
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE_OBJECT',
          entityType: 'CleaningObject',
          entityId: cleaningObject.id,
          details: `Создан объект "${cleaningObject.name}" с ${createdRooms.length} помещениями и ${createdTechCards.length} техкартами`
        }
      });

      return {
        object: cleaningObject,
        rooms: createdRooms,
        techCards: createdTechCards
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Объект успешно создан',
      data: {
        objectId: result.object.id,
        objectName: result.object.name,
        roomsCount: result.rooms.length,
        techCardsCount: result.techCards.length
      }
    });

  } catch (error) {
    console.error('Ошибка при создании объекта:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Ошибка валидации данных',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
