import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

async function getUserFromToken(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string }
    });
    
    return user;
  } catch (error) {
    return null;
  }
}

// GET /api/tasks/[id]/admin-comments - Получение комментариев (пока пустой массив)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Пока возвращаем пустой массив комментариев
    return NextResponse.json([]);

  } catch (error) {
    console.error('Ошибка получения комментариев:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/admin-comments - Добавление комментария (пока заглушка)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем права администратора
    if (!['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await request.json();
    const { content, type } = body;

    // Пока просто возвращаем успех без сохранения
    return NextResponse.json({ 
      message: 'Комментарий добавлен',
      comment: {
        id: 'temp-id',
        content,
        type,
        createdAt: new Date(),
        admin: {
          name: user.name
        }
      }
    });

  } catch (error) {
    console.error('Ошибка добавления комментария:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
