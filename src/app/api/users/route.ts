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

const createUserSchema = z.object({
  name: z.string().min(1, 'Имя обязательно'),
  email: z.string().email('Некорректный email'),
  role: z.enum(['DEPUTY_ADMIN', 'DEPUTY', 'MANAGER'], { 
    errorMap: () => ({ message: 'Роль должна быть DEPUTY_ADMIN, DEPUTY или MANAGER' })
  }),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    // Получаем параметр фильтрации по роли
    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get('role');
    
    // Для получения списка менеджеров разрешаем всем авторизованным пользователям
    if (roleFilter === 'MANAGER') {
      if (!user) {
        return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
      }
    } else {
      // Для управления пользователями только админ
      if (!user || user.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
      }
    }

    // Получаем всех пользователей кроме клиентов
    const whereClause = roleFilter 
      ? { role: roleFilter as any }
      : { role: { in: ['ADMIN', 'DEPUTY_ADMIN', 'DEPUTY', 'MANAGER'] } };

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    // Получаем статистику для каждого пользователя
    const usersWithStats = await Promise.all(
      users.map(async (userData) => {
        const objectsCount = await prisma.cleaningObject.count({
          where: { managerId: userData.id }
        });

        const checklistsCount = await prisma.checklist.count({
          where: { 
            object: { managerId: userData.id }
          }
        });

        const requestsCount = await prisma.request.count({
          where: { 
            object: { managerId: userData.id }
          }
        });

        return {
          ...userData,
          stats: {
            objects: objectsCount,
            checklists: checklistsCount,
            requests: requestsCount,
          }
        };
      })
    );

    return NextResponse.json(usersWithStats);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: 'Ошибка при получении пользователей' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    
    // Только админ может создавать пользователей
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, role } = createUserSchema.parse(body);

    // Проверяем, что пользователь с таким email не существует
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Пользователь с таким email уже существует' },
        { status: 400 }
      );
    }

    // Генерируем временный пароль
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      user: newUser,
      tempPassword: tempPassword,
      message: 'Пользователь успешно создан'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Ошибка валидации', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating user:', error);
    return NextResponse.json(
      { message: 'Ошибка при создании пользователя' },
      { status: 500 }
    );
  }
}
