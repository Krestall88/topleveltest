import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRequestSchema } from '@/lib/validators/request';
import { ZodError } from 'zod';

// GET /api/requests - Получить список заявок
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const objectId = searchParams.get('objectId');
  const status = searchParams.get('status');

  try {
    const where: any = {};
    if (objectId) where.objectId = objectId;
    if (status) where.status = status;

    const requests = await prisma.request.findMany({
      where,
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/requests - Создать новую заявку
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, objectId, creatorId, source } = createRequestSchema.parse(body);

    const newRequest = await prisma.request.create({
      data: {
        title,
        description,
        objectId,
        creatorId,
        source: source || 'form',
        status: 'NEW'
      },
      include: {
        object: {
          select: { name: true, address: true }
        },
        creator: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Ошибка валидации', details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Не удалось создать заявку' }, { status: 500 });
  }
}
