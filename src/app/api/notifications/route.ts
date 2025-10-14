import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'temp-user-id'; // TODO: Получать из авторизации
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const whereClause = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    // Временно возвращаем пустой массив, так как модель Notification не существует
    const notifications: any[] = [];
    
    // TODO: Добавить модель Notification в schema.prisma
    // const notifications = await prisma.notification.findMany({
    //   where: whereClause,
    //   orderBy: {
    //     createdAt: 'desc',
    //   },
    //   take: limit,
    //   include: {
    //     user: {
    //       select: {
    //         id: true,
    //         name: true,
    //         email: true,
    //       },
    //     },
    //   },
    // });

    // Временно возвращаем 0, так как модель Notification не существует
    const unreadCount = 0;
    
    // TODO: Добавить модель Notification в schema.prisma
    // const unreadCount = await prisma.notification.count({
    //   where: {
    //     userId,
    //     isRead: false,
    //   },
    // });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Ошибка при получении уведомлений:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении уведомлений' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, title, message, data, priority = 'MEDIUM' } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Обязательные поля: userId, type, title, message' },
        { status: 400 }
      );
    }

    // Временно возвращаем заглушку, так как модель Notification не существует
    const notification = {
      id: 'temp-notification-id',
      userId,
      type,
      title,
      message,
      data: data || {},
      priority,
      isRead: false,
      createdAt: new Date(),
      user: { id: userId, name: 'Пользователь', email: 'user@example.com' }
    };
    
    // TODO: Добавить модель Notification в schema.prisma
    // const notification = await prisma.notification.create({
    //   data: {
    //     userId,
    //     type,
    //     title,
    //     message,
    //     data: data || {},
    //     priority,
    //     isRead: false,
    //   },
    //   include: {
    //     user: {
    //       select: {
    //         id: true,
    //         name: true,
    //         email: true,
    //       },
    //     },
    //   },
    // });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании уведомления:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании уведомления' },
      { status: 500 }
    );
  }
}
