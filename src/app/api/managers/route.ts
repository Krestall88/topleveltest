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
        managedObjects: {
          select: {
            id: true,
            name: true,
          }
        },
        managedSites: {
          select: {
            id: true,
            name: true,
            comment: true,
            object: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Получаем информацию об участках для каждого менеджера
    const managersWithSites = managers.map((manager) => {
      const sites = manager.managedSites.map(site => ({
        name: site.name,
        objectName: site.object.name,
        comment: site.comment
      }));

      // Формируем информацию о комментариях для отображения
      const commentsInfo = sites.length > 0 
        ? sites
            .filter(site => site.comment) // Только участки с комментариями
            .map(site => site.comment)
            .join(', ')
        : '';

      // Считаем уникальные объекты: прямо назначенные + через участки
      const directObjects = manager.managedObjects.map(obj => obj.name);
      const siteObjects = sites.map(site => site.objectName);
      const allUniqueObjects = [...new Set([...directObjects, ...siteObjects])];

      return {
        id: manager.id,
        name: manager.name,
        email: manager.email,
        phone: manager.phone,
        createdAt: manager.createdAt,
        objectsCount: allUniqueObjects.length, // Считаем все уникальные объекты
        sitesInfo: commentsInfo, // Теперь показываем комментарии вместо названий участков
        sites: sites,
        objectNames: allUniqueObjects.join(', ') // Добавляем названия объектов для отображения
      };
    });

    return NextResponse.json(managersWithSites);
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
