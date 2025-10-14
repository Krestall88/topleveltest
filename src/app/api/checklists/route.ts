import { NextRequest, NextResponse } from 'next/server';
import { createChecklistSchema } from '@/lib/validators/checklist';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { jwtVerify } from 'jose';

async function getUserFromToken(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    return payload;
  } catch (error) {
    return null;
  }
}

// GET /api/checklists?objectId=... - Получить список чек-листов
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const objectId = searchParams.get('objectId');
  const date = searchParams.get('date');
  const limit = searchParams.get('limit');

  try {
    const where: any = {};
    if (objectId) where.objectId = objectId;
    if (date) where.date = new Date(date);

    const checklists = await prisma.checklist.findMany({
      where,
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' },
          include: {
            room: {
              select: { name: true }
            },
            completedBy: {
              select: { name: true }
            }
          }
        },
        room: {
          select: { name: true }
        },
        creator: {
          select: { name: true, email: true }
        },
        object: {
          select: { name: true, address: true }
        },
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: { date: 'desc' },
      take: limit ? parseInt(limit) : undefined,
    });
    return NextResponse.json(checklists);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/checklists - Создать новый чек-лист на основе техкарт
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { objectId, roomId, date } = body;

    if (!objectId) {
      return NextResponse.json({ message: 'objectId обязателен' }, { status: 400 });
    }

    console.log('🏗️ Создание чек-листа:', { objectId, roomId, date, userId: user.userId });

    // Создать чек-листы с задачами на основе техкарт (группировка по помещениям и периодичности)
    const result = await prisma.$transaction(async (tx) => {
      // Получить техкарты для создания задач
      const whereClause: any = { objectId };
      if (roomId) whereClause.roomId = roomId;

      const techCards = await tx.techCard.findMany({
        where: whereClause,
        include: {
          room: { select: { id: true, name: true } }
        }
      });

      console.log('📝 Найдено техкарт:', techCards.length);

      // ЗАПРЕТ: Нельзя создавать чек-листы без техкарт
      if (techCards.length === 0) {
        throw new Error('Невозможно создать чек-лист: не найдено техкарт для данного объекта/помещения. Сначала создайте техкарты.');
      }

      // Группируем техкарты по помещениям и периодичности
      const groupedTechCards = techCards.reduce((groups, techCard) => {
        const key = `${techCard.roomId || 'no-room'}_${techCard.frequency}`;
        if (!groups[key]) {
          groups[key] = {
            roomId: techCard.roomId,
            roomName: techCard.room?.name || 'Общие работы',
            frequency: techCard.frequency,
            techCards: []
          };
        }
        groups[key].techCards.push(techCard);
        return groups;
      }, {} as Record<string, any>);

      console.log('📊 Группы чек-листов:', Object.keys(groupedTechCards).length);

      const createdChecklists = [];

      // Создаем отдельный чек-лист для каждой группы
      for (const [groupKey, group] of Object.entries(groupedTechCards)) {
        const checklistName = roomId 
          ? `${group.roomName} - ${group.frequency}`
          : `${group.roomName} - ${group.frequency}`;

        const checklist = await tx.checklist.create({
          data: { 
            objectId, 
            roomId: group.roomId,
            date: new Date(date || new Date()),
            creatorId: user.userId as string,
            name: checklistName // Добавляем название чек-листа
          },
          include: {
            object: { select: { name: true, address: true } },
            room: { select: { name: true } },
            creator: { select: { name: true, email: true } }
          }
        });

        console.log(`✅ Создан чек-лист: ${checklist.id} для ${checklistName}`);

        // Создать задачи на основе техкарт группы
        for (const techCard of group.techCards) {
          // Разбиваем описание техкарты на отдельные задачи
          const descriptions = (techCard.description || '')
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.trim());

          for (const description of descriptions) {
            if (description) {
              await tx.task.create({
                data: {
                  description: `${techCard.name}: ${description}`,
                  checklistId: checklist.id,
                  roomId: techCard.roomId,
                  status: 'NEW',
                }
              });
            }
          }
        }

        createdChecklists.push(checklist);
      }

      return createdChecklists;
    });

    // Получить полные чек-листы с задачами
    const fullChecklists = await Promise.all(
      result.map(async (checklist) => {
        return await prisma.checklist.findUnique({
          where: { id: checklist.id },
          include: {
            tasks: {
              orderBy: { createdAt: 'asc' },
              include: {
                room: { select: { name: true } }
              }
            },
            room: { select: { name: true } },
            creator: { select: { name: true, email: true } },
            object: { select: { name: true, address: true } },
            _count: { select: { tasks: true } }
          }
        });
      })
    );

    const totalTasks = fullChecklists.reduce((sum, checklist) => sum + (checklist?._count?.tasks || 0), 0);
    console.log(`✅ Создано ${fullChecklists.length} чек-листов с ${totalTasks} задачами`);

    return NextResponse.json({
      checklists: fullChecklists,
      count: fullChecklists.length,
      totalTasks: totalTasks
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Ошибка создания чек-листа:', error);
    return NextResponse.json({ message: 'Не удалось создать чек-лист' }, { status: 500 });
  }
}
