import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  params: { id: string };
}

// GET /api/objects/[id]/hierarchy - Получить иерархию объекта (упрощенная версия)
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    
    // Получаем объект с базовой информацией
    const object = await prisma.cleaningObject.findUnique({
      where: { id },
      include: {
        manager: { 
          select: { id: true, name: true, email: true } 
        },
        creator: { 
          select: { id: true, name: true } 
        }
      }
    });

    if (!object) {
      return NextResponse.json({ message: 'Объект не найден' }, { status: 404 });
    }

    // Получаем техкарты напрямую к объекту
    const directTechCards = await prisma.techCard.findMany({
      where: { 
        objectId: id,
        roomId: null
      },
      orderBy: { name: 'asc' }
    });

    // Получаем помещения с техкартами
    const directRooms = await prisma.room.findMany({
      where: { 
        objectId: id,
        NOT: { name: { contains: '__VIRTUAL__' } }
      },
      include: {
        techCards: true,
        cleaningObjects: {
          include: {
            techCards: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Получаем участки с полной иерархией (исключаем виртуальные)
    const sites = await prisma.site.findMany({
      where: { 
        objectId: id,
        NOT: { name: { contains: '__VIRTUAL__' } }
      },
      include: {
        zones: {
          where: {
            NOT: { name: { contains: '__VIRTUAL__' } }
          },
          include: {
            roomGroups: {
              where: {
                NOT: { name: { contains: '__VIRTUAL__' } }
              },
              include: {
                rooms: {
                  where: {
                    NOT: { name: { contains: '__VIRTUAL__' } }
                  },
                  include: {
                    techCards: true,
                    cleaningObjects: {
                      include: {
                        techCards: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const hierarchyData = {
      ...object,
      sites,
      directRooms,
      directTechCards
    };

    return NextResponse.json(hierarchyData);
  } catch (error) {
    console.error('Ошибка получения иерархии объекта:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
