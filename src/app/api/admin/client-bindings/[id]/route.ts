import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE /api/admin/client-bindings/[id] - Удалить привязку
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.clientBinding.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка удаления привязки:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления привязки' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/client-bindings/[id] - Изменить объект привязки
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { objectId, telegramUsername, firstName, lastName } = await req.json();

    const binding = await prisma.clientBinding.update({
      where: { id },
      data: {
        objectId,
        telegramUsername,
        firstName,
        lastName
      },
      include: {
        object: {
          include: {
            manager: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    return NextResponse.json(binding);
  } catch (error) {
    console.error('❌ Ошибка обновления привязки:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления привязки' },
      { status: 500 }
    );
  }
}
