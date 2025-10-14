import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { isRead } = body;

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: isRead ?? true,
        readAt: isRead ? new Date() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error('Ошибка при обновлении уведомления:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении уведомления' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении уведомления:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении уведомления' },
      { status: 500 }
    );
  }
}
