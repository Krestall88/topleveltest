import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateRequestSchema } from '@/lib/validators/request';
import { ZodError } from 'zod';

interface Params {
  params: { id: string };
}

// PATCH /api/requests/[id] - Обновить статус заявки
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const { status, title, description } = updateRequestSchema.parse(body);

    const updateData: any = {};
    if (status) updateData.status = status;
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    
    updateData.updatedAt = new Date();

    const updatedRequest = await prisma.request.update({
      where: { id: params.id },
      data: updateData,
      include: {
        object: {
          select: { name: true, address: true }
        },
        creator: {
          select: { name: true, email: true }
        },
        photoReports: {
          select: { id: true, url: true, comment: true }
        }
      }
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Ошибка валидации', details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Не удалось обновить заявку' }, { status: 500 });
  }
}

// DELETE /api/requests/[id] - Удалить заявку
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await prisma.request.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Заявка удалена' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Не удалось удалить заявку' }, { status: 500 });
  }
}
