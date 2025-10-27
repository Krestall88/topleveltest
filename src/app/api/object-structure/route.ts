import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const objectId = searchParams.get('objectId');

    if (!objectId) {
      return NextResponse.json({ error: 'objectId is required' }, { status: 400 });
    }

    // Получаем объект с полной иерархической структурой
    const objectData = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      include: {
        sites: {
          include: {
            zones: {
              include: {
                roomGroups: {
                  include: {
                    rooms: {
                      include: {
                        techCards: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: { name: 'asc' }
        },
        rooms: {
          where: { roomGroupId: null }, // Помещения без группы
          include: {
            techCards: true
          },
          orderBy: { name: 'asc' }
        },
        techCards: {
          where: { 
            roomId: null
          }
        }
      }
    });

    if (!objectData) {
      return NextResponse.json({ error: 'Object not found' }, { status: 404 });
    }

    // Строим дерево из новой структуры
    const tree = buildHierarchicalTree(objectData);

    return NextResponse.json({
      success: true,
      data: tree,
      totalRecords: tree.length
    });

  } catch (error) {
    console.error('Error building hierarchical tree:', error);
    return NextResponse.json(
      { error: 'Failed to build hierarchical tree' },
      { status: 500 }
    );
  }
}

function buildHierarchicalTree(objectData: any) {
  const tree: any[] = [];

  // Добавляем участки
  objectData.sites?.forEach((site: any) => {
    const siteNode: any = {
      type: 'site',
      name: site.name,
      id: site.id,
      children: []
    };

    // Добавляем зоны участка
    site.zones?.forEach((zone: any) => {
      const zoneNode: any = {
        type: 'zone',
        name: zone.name,
        id: zone.id,
        children: []
      };

      // Добавляем группы помещений зоны
      zone.roomGroups?.forEach((roomGroup: any) => {
        const roomGroupNode: any = {
          type: 'roomGroup',
          name: roomGroup.name,
          id: roomGroup.id,
          children: []
        };

        // Добавляем помещения группы
        roomGroup.rooms?.forEach((room: any) => {
          const roomNode: any = {
            type: 'room',
            name: room.name,
            id: room.id,
            children: []
          };

          // Добавляем техкарты помещения
          room.techCards?.forEach((techCard: any) => {
            roomNode.children.push({
              type: 'techCard',
              name: techCard.name,
              id: techCard.id,
              frequency: techCard.frequency,
              workType: techCard.workType,
              description: techCard.description,
              notes: techCard.notes,
              period: techCard.period,
              children: []
            });
          });

          roomGroupNode.children.push(roomNode);
        });

        zoneNode.children.push(roomGroupNode);
      });

      siteNode.children.push(zoneNode);
    });

    tree.push(siteNode);
  });

  // Добавляем помещения без группы (старая структура)
  objectData.rooms?.forEach((room: any) => {
    const roomNode: any = {
      type: 'room',
      name: room.name,
      id: room.id,
      children: []
    };

    // Добавляем техкарты помещения
    room.techCards?.forEach((techCard: any) => {
      roomNode.children.push({
        type: 'techCard',
        name: techCard.name,
        id: techCard.id,
        frequency: techCard.frequency,
        workType: techCard.workType,
        description: techCard.description,
        notes: techCard.notes,
        period: techCard.period,
        children: []
      });
    });

    tree.push(roomNode);
  });

  // Добавляем техкарты без привязки к структуре
  objectData.techCards?.forEach((techCard: any) => {
    tree.push({
      type: 'techCard',
      name: techCard.name,
      id: techCard.id,
      frequency: techCard.frequency,
      workType: techCard.workType,
      description: techCard.description,
      notes: techCard.notes,
      period: techCard.period,
      children: []
    });
  });

  return tree;
}
