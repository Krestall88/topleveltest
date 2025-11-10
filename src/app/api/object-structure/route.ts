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
    processSite(site, tree);
  });

  // Добавляем техкарты без помещений (привязаны напрямую к объекту)
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

// Вспомогательная функция для обработки участка
function processSite(site: any, parentChildren: any[]) {
  // Пропускаем виртуальные участки - показываем их зоны напрямую
  if (site.name === '__VIRTUAL__') {
    site.zones?.forEach((zone: any) => {
      processZone(zone, parentChildren);
    });
    return;
  }

  const siteNode: any = {
    type: 'site',
    name: site.name,
    id: site.id,
    children: []
  };

  // Добавляем зоны участка
  site.zones?.forEach((zone: any) => {
    processZone(zone, siteNode.children);
  });

  parentChildren.push(siteNode);
}

// Вспомогательная функция для обработки зоны
function processZone(zone: any, parentChildren: any[]) {
  // Пропускаем виртуальные зоны
  if (zone.name === '__VIRTUAL__') {
    // Для виртуальной зоны показываем её детей напрямую
    zone.roomGroups?.forEach((roomGroup: any) => {
      processRoomGroup(roomGroup, parentChildren);
    });
    return;
  }

  const zoneNode: any = {
    type: 'zone',
    name: zone.name,
    id: zone.id,
    children: []
  };

  // Добавляем группы помещений зоны
  zone.roomGroups?.forEach((roomGroup: any) => {
    processRoomGroup(roomGroup, zoneNode.children);
  });

  parentChildren.push(zoneNode);
}

// Вспомогательная функция для обработки группы помещений
function processRoomGroup(roomGroup: any, parentChildren: any[]) {
  // Пропускаем виртуальные группы - показываем их помещения напрямую
  if (roomGroup.name === '__VIRTUAL__') {
    roomGroup.rooms?.forEach((room: any) => {
      processRoom(room, parentChildren);
    });
    return;
  }

  const roomGroupNode: any = {
    type: 'roomGroup',
    name: roomGroup.name,
    id: roomGroup.id,
    children: []
  };

  // Обрабатываем помещения группы
  roomGroup.rooms?.forEach((room: any) => {
    processRoom(room, roomGroupNode.children);
  });

  parentChildren.push(roomGroupNode);
}

// Вспомогательная функция для обработки помещения
function processRoom(room: any, parentChildren: any[]) {
  // Если помещение виртуальное - показываем его содержимое напрямую
  if (room.name === '__VIRTUAL__') {
    // Показываем объекты уборки
    room.cleaningObjects?.forEach((cleaningObj: any) => {
      const cleaningObjNode: any = {
        type: 'cleaningObject',
        name: cleaningObj.name,
        id: cleaningObj.id,
        children: []
      };
      
      // Добавляем техкарты объекта уборки
      cleaningObj.techCards?.forEach((techCard: any) => {
        cleaningObjNode.children.push({
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
      
      parentChildren.push(cleaningObjNode);
    });
    
    // Показываем ТОЛЬКО техкарты БЕЗ объектов уборки (cleaningObjectItemId === null)
    room.techCards?.forEach((techCard: any) => {
      if (!techCard.cleaningObjectItemId) {
        parentChildren.push({
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
      }
    });
    return;
  }

  // Реальное помещение - показываем его
  const roomNode: any = {
    type: 'room',
    name: room.name,
    id: room.id,
    children: []
  };

  // Добавляем объекты уборки помещения
  room.cleaningObjects?.forEach((cleaningObj: any) => {
    const cleaningObjNode: any = {
      type: 'cleaningObject',
      name: cleaningObj.name,
      id: cleaningObj.id,
      children: []
    };
    
    // Добавляем техкарты объекта уборки
    cleaningObj.techCards?.forEach((techCard: any) => {
      cleaningObjNode.children.push({
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
    
    roomNode.children.push(cleaningObjNode);
  });

  // Добавляем ТОЛЬКО техкарты БЕЗ объектов уборки (cleaningObjectItemId === null)
  room.techCards?.forEach((techCard: any) => {
    if (!techCard.cleaningObjectItemId) {
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
    }
  });

  parentChildren.push(roomNode);
}
