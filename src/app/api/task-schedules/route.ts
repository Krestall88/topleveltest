import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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

const createScheduleSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']),
  timeSlots: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
    days: z.array(z.number().min(0).max(6)).optional()
  })),
  reminderSettings: z.object({
    enabled: z.boolean(),
    beforeMinutes: z.array(z.number()),
    overdueMinutes: z.array(z.number())
  }),
  isActive: z.boolean(),
  objectIds: z.array(z.string()).optional(),
  roomIds: z.array(z.string()).optional()
});

// GET /api/task-schedules - Получить расписания
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    if (!['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const objectId = searchParams.get('objectId');
    const roomId = searchParams.get('roomId');

    // В реальной системе здесь была бы модель TaskSchedule
    // Пока возвращаем пример данных
    const mockSchedules = [
      {
        id: 'schedule-1',
        name: 'Ежедневная уборка офиса',
        description: 'Основная уборка офисных помещений в рабочие дни',
        frequency: 'DAILY',
        timeSlots: [
          {
            startTime: '08:00',
            endTime: '10:00',
            days: [1, 2, 3, 4, 5] // Пн-Пт
          }
        ],
        reminderSettings: {
          enabled: true,
          beforeMinutes: [30, 60],
          overdueMinutes: [15, 60, 240]
        },
        isActive: true,
        objectIds: objectId ? [objectId] : [],
        roomIds: roomId ? [roomId] : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'schedule-2',
        name: 'Еженедельная генеральная уборка',
        description: 'Глубокая уборка всех помещений по пятницам',
        frequency: 'WEEKLY',
        timeSlots: [
          {
            startTime: '18:00',
            endTime: '22:00',
            days: [5] // Пятница
          }
        ],
        reminderSettings: {
          enabled: true,
          beforeMinutes: [120, 240],
          overdueMinutes: [60, 240]
        },
        isActive: true,
        objectIds: objectId ? [objectId] : [],
        roomIds: roomId ? [roomId] : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    return NextResponse.json({
      schedules: mockSchedules,
      total: mockSchedules.length
    });

  } catch (error) {
    console.error('Ошибка получения расписаний:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении расписаний' },
      { status: 500 }
    );
  }
}

// POST /api/task-schedules - Создать расписание
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    if (!['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = createScheduleSchema.parse(body);

    // В реальной системе здесь было бы создание в базе данных
    const newSchedule = {
      id: `schedule-${Date.now()}`,
      ...validatedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Логируем создание расписания
    await prisma.auditLog.create({
      data: {
        action: 'TASK_SCHEDULE_CREATED',
        entity: 'TASK_SCHEDULE',
        entityId: newSchedule.id,
        userId: user.id,
        details: {
          scheduleName: validatedData.name,
          frequency: validatedData.frequency,
          objectIds: validatedData.objectIds,
          roomIds: validatedData.roomIds,
          createdBy: user.name
        }
      }
    });

    return NextResponse.json({
      schedule: newSchedule,
      message: 'Расписание успешно создано'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Ошибка создания расписания:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании расписания' },
      { status: 500 }
    );
  }
}
