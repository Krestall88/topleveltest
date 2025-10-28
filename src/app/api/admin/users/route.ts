import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth-middleware';
import bcrypt from 'bcryptjs';

// GET /api/admin/users - Получить всех пользователей (только для ADMIN)
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        deputyAdminAssignments: {
          include: {
            object: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        managedObjects: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/admin/users - Создать нового пользователя
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await req.json();
    const { email, name, password, role, phone, assignedObjectIds } = body;

    // Валидация
    if (!email || !name || !password || !role) {
      return NextResponse.json({ 
        message: 'Email, имя, пароль и роль обязательны' 
      }, { status: 400 });
    }

    // Проверяем, что email уникален
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ 
        message: 'Пользователь с таким email уже существует' 
      }, { status: 400 });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        phone: phone || null
      }
    });

    // Если это заместитель администратора, назначаем объекты
    if (role === 'DEPUTY_ADMIN' && assignedObjectIds && assignedObjectIds.length > 0) {
      const assignments = assignedObjectIds.map((objectId: string) => ({
        deputyAdminId: newUser.id,
        objectId,
        assignedById: user.id
      }));

      await prisma.deputyAdminAssignment.createMany({
        data: assignments
      });
    }

    // Возвращаем созданного пользователя без пароля
    const { password: _, ...userWithoutPassword } = newUser;
    
    return NextResponse.json({ 
      user: userWithoutPassword,
      message: 'Пользователь успешно создан'
    }, { status: 201 });

  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
