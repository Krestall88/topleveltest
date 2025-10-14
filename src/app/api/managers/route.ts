import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

async function getUserFromToken(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, role: true }
    });

    return user;
  } catch (error) {
    return null;
  }
}

const createManagerSchema = z.object({
  name: z.string().min(1, 'Имя обязательно'),
  email: z.string().email('Некорректный email'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

// GET /api/managers - получить список менеджеров
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEPUTY')) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    // Получаем дополнительную статистику для каждого менеджера
    const managersWithStats = await Promise.all(
      managers.map(async (manager) => {
        const objectsCount = await prisma.cleaningObject.count({
          where: { managerId: manager.id }
        });

        const checklistsCount = await prisma.checklist.count({
          where: { 
            object: { managerId: manager.id }
          }
        });

        const requestsCount = await prisma.request.count({
          where: { 
            object: { managerId: manager.id }
          }
        });

        // Временно упрощаем до базовой статистики
        const roomsCount = 0; // Будет реализовано после обновления Prisma
        const totalExpenses = 0; // Будет реализовано после обновления Prisma

        return {
          ...manager,
          stats: {
            objects: objectsCount,
            checklists: checklistsCount,
            requests: requestsCount,
            rooms: roomsCount,
            totalExpenses: totalExpenses,
          }
        };
      })
    );

    return NextResponse.json(managersWithStats);
  } catch (error) {
    console.error('Error fetching managers:', error);
    return NextResponse.json(
      { message: 'Ошибка при получении списка менеджеров' },
      { status: 500 }
    );
  }
}

// POST /api/managers - создать нового менеджера
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEPUTY')) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = createManagerSchema.parse(body);

    // Проверяем, не существует ли пользователь с таким email
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Пользователь с таким email уже существует' },
        { status: 400 }
      );
    }

    // Хешируем пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(validatedData.password, salt);

    // Создаем нового менеджера
    const newManager = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        password: hashedPassword,
        role: 'MANAGER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        role: true,
      }
    });

    return NextResponse.json(newManager, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Ошибка валидации', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating manager:', error);
    return NextResponse.json(
      { message: 'Ошибка при создании менеджера' },
      { status: 500 }
    );
  }
}
