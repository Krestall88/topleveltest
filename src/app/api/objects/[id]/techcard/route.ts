import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createTechCardSchema, updateTechCardSchema } from '@/lib/validators/techcard';

interface Params {
  params: { id: string }; // objectId
}

// GET /api/objects/[id]/techcard - Получить техкарту для объекта
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const techCard = await prisma.techCard.findUnique({
      where: { objectId: params.id },
    });

    if (!techCard) {
      return NextResponse.json({ message: 'Техкарта не найдена' }, { status: 404 });
    }

    return NextResponse.json(techCard);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/objects/[id]/techcard - Создать техкарту для объекта
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const existingCard = await prisma.techCard.findUnique({ where: { objectId: params.id } });
    if (existingCard) {
      return NextResponse.json({ message: 'Техкарта для этого объекта уже существует' }, { status: 409 });
    }

    const body = await req.json();
    // Manually add objectId from params for validation
    const validatedData = createTechCardSchema.parse({ ...body, objectId: params.id });

    const newTechCard = await prisma.techCard.create({
      data: validatedData,
    });

    return NextResponse.json(newTechCard, { status: 201 });
  } catch (error) {
     if (error instanceof Error && 'issues' in error) {
      return NextResponse.json({ message: 'Ошибка валидации', details: (error as any).issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Не удалось создать техкарту' }, { status: 500 });
  }
}

// PATCH /api/objects/[id]/techcard - Обновить техкарту
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const dataToUpdate = updateTechCardSchema.parse(body);

    const updatedTechCard = await prisma.techCard.update({
      where: { objectId: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedTechCard);
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return NextResponse.json({ message: 'Ошибка валидации', details: (error as any).issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Не удалось обновить техкарту' }, { status: 500 });
  }
}

// DELETE /api/objects/[id]/techcard - Удалить техкарту
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await prisma.techCard.delete({
      where: { objectId: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Не удалось удалить техкарту' }, { status: 500 });
  }
}
