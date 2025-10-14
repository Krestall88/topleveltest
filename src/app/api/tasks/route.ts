import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTaskSchema = z.object({
  description: z.string().min(1, 'Описание обязательно'),
  checklistId: z.string().optional(),
  roomId: z.string().optional(),
  requestId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const checklistId = searchParams.get('checklistId');
    const roomId = searchParams.get('roomId');
    const requestId = searchParams.get('requestId');

    const where: any = {};
    if (checklistId) where.checklistId = checklistId;
    if (roomId) where.roomId = roomId;
    if (requestId) where.requestId = requestId;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        checklist: {
          select: { date: true, object: { select: { name: true } } }
        },
        room: {
          select: { name: true }
        },
        request: {
          select: { title: true }
        },
        completedBy: {
          select: { name: true }
        },
        expenses: {
          include: {
            item: { select: { name: true } }
          }
        },
        photoReports: {
          select: { url: true, comment: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Ошибка при получении задач:', error);
    return NextResponse.json(
      { error: 'Не удалось загрузить задачи' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createTaskSchema.parse(body);

    const task = await prisma.task.create({
      data: {
        ...validatedData,
        status: 'NEW'
      },
      include: {
        checklist: {
          select: { date: true, object: { select: { name: true } } }
        },
        room: {
          select: { name: true }
        },
        request: {
          select: { title: true }
        }
      }
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Ошибка при создании задачи:', error);
    return NextResponse.json(
      { error: 'Не удалось создать задачу' },
      { status: 500 }
    );
  }
}
