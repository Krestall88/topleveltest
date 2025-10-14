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

interface Params {
  params: { id: string };
}

const updateScheduleSchema = z.object({
  name: z.string().min(1, 'Название обязательно').optional(),
  description: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']).optional(),
  timeSlots: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
    days: z.array(z.number().min(0).max(6)).optional()
  })).optional(),
  reminderSettings: z.object({
    enabled: z.boolean(),
    beforeMinutes: z.array(z.number()),
    overdueMinutes: z.array(z.number())
  }).optional(),
  isActive: z.boolean().optional(),
  objectIds: z.array(z.string()).optional(),
  roomIds: z.array(z.string()).optional()
});

// GET /api/task-schedules/[id] - Получить расписание
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    if (!['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    // В реальной системе здесь был бы поиск в базе данных
    const mockSchedule = {
      id: params.id,
      name: 'Ежедневная уборка офиса',
      description: 'Основная уборка офисных помещений в рабочие дни',
      frequency: 'DAILY',
      timeSlots: [
        {
          startTime: '08:00',
          endTime: '10:00',
          days: [1, 2, 3, 4, 5]
        }
      ],
      reminderSettings: {
        enabled: true,
        beforeMinutes: [30, 60],
        overdueMinutes: [15, 60, 240]
      },
      isActive: true,
      objectIds: [],
      roomIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({ schedule: mockSchedule });

  } catch (error) {
    console.error('Ошибка получения расписания:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении расписания' },
      { status: 500 }
    );
  }
}

// PUT /api/task-schedules/[id] - Обновить расписание
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    if (!['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateScheduleSchema.parse(body);

    // В реальной системе здесь было бы обновление в базе данных
    const updatedSchedule = {
      id: params.id,
      ...validatedData,
      updatedAt: new Date().toISOString()
    };

    // Логируем обновление расписания
    await prisma.auditLog.create({
      data: {
        action: 'TASK_SCHEDULE_UPDATED',
        entity: 'TASK_SCHEDULE',
        entityId: params.id,
        userId: user.id,
        details: {
          scheduleId: params.id,
          updatedFields: Object.keys(validatedData),
          updatedBy: user.name
        }
      }
    });

    return NextResponse.json({
      schedule: updatedSchedule,
      message: 'Расписание успешно обновлено'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Ошибка обновления расписания:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении расписания' },
      { status: 500 }
    );
  }
}

// PATCH /api/task-schedules/[id] - Частичное обновление (например, активация/деактивация)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    if (!['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Поле isActive должно быть boolean' },
        { status: 400 }
      );
    }

    // В реальной системе здесь было бы обновление в базе данных
    const updatedSchedule = {
      id: params.id,
      isActive,
      updatedAt: new Date().toISOString()
    };

    // Логируем изменение статуса
    await prisma.auditLog.create({
      data: {
        action: isActive ? 'TASK_SCHEDULE_ACTIVATED' : 'TASK_SCHEDULE_DEACTIVATED',
        entity: 'TASK_SCHEDULE',
        entityId: params.id,
        userId: user.id,
        details: {
          scheduleId: params.id,
          newStatus: isActive ? 'active' : 'inactive',
          changedBy: user.name
        }
      }
    });

    return NextResponse.json({
      schedule: updatedSchedule,
      message: `Расписание ${isActive ? 'активировано' : 'деактивировано'}`
    });

  } catch (error) {
    console.error('Ошибка изменения статуса расписания:', error);
    return NextResponse.json(
      { error: 'Ошибка при изменении статуса расписания' },
      { status: 500 }
    );
  }
}

// DELETE /api/task-schedules/[id] - Удалить расписание
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    if (!['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    // В реальной системе здесь была бы проверка существования и удаление
    
    // Логируем удаление расписания
    await prisma.auditLog.create({
      data: {
        action: 'TASK_SCHEDULE_DELETED',
        entity: 'TASK_SCHEDULE',
        entityId: params.id,
        userId: user.id,
        details: {
          scheduleId: params.id,
          deletedBy: user.name,
          deletedAt: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      message: 'Расписание успешно удалено'
    });

  } catch (error) {
    console.error('Ошибка удаления расписания:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении расписания' },
      { status: 500 }
    );
  }
}
