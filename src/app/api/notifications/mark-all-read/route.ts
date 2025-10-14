import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Обязательное поле: userId' },
        { status: 400 }
      );
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error('Ошибка при отметке всех уведомлений как прочитанных:', error);
    return NextResponse.json(
      { error: 'Ошибка при отметке уведомлений' },
      { status: 500 }
    );
  }
}
