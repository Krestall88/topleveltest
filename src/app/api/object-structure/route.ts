import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const objectId = searchParams.get('objectId');

    if (!objectId) {
      return NextResponse.json({ error: 'objectId is required' }, { status: 400 });
    }

    // Получаем все записи для объекта
    const records = await prisma.objectStructure.findMany({
      where: { objectId },
      orderBy: [
        { siteName: 'asc' },
        { zoneName: 'asc' },
        { roomGroupName: 'asc' },
        { roomName: 'asc' },
        { cleaningObjectName: 'asc' },
        { techCardName: 'asc' }
      ]
    });

    // Строим динамическое дерево
    const tree = buildDynamicTree(records);

    return NextResponse.json({
      success: true,
      data: tree,
      totalRecords: records.length
    });

  } catch (error) {
    console.error('Error building dynamic tree:', error);
    return NextResponse.json(
      { error: 'Failed to build dynamic tree' },
      { status: 500 }
    );
  }
}

function buildDynamicTree(records: any[]) {
  const tree: any = {};

  records.forEach(record => {
    // Определяем путь в дереве на основе заполненных полей
    const path = [];
    
    if (record.siteName) path.push({ type: 'site', name: record.siteName, id: record.siteId });
    if (record.zoneName) path.push({ type: 'zone', name: record.zoneName, id: record.zoneId });
    if (record.roomGroupName) path.push({ type: 'roomGroup', name: record.roomGroupName, id: record.roomGroupId });
    if (record.roomName) path.push({ type: 'room', name: record.roomName, id: record.roomId });
    if (record.cleaningObjectName) path.push({ type: 'cleaningObject', name: record.cleaningObjectName, id: record.cleaningObjectId });
    
    // Техкарта всегда есть
    path.push({ 
      type: 'techCard', 
      name: record.techCardName, 
      id: record.techCardId,
      frequency: record.frequency,
      workType: record.workType,
      description: record.description,
      notes: record.notes,
      period: record.period
    });

    // Строим дерево по пути
    let current = tree;
    
    path.forEach((node, index) => {
      const key = `${node.type}:${node.name}`;
      
      if (!current[key]) {
        current[key] = {
          type: node.type,
          name: node.name,
          id: node.id,
          children: {},
          // Дополнительные поля для техкарт
          ...(node.type === 'techCard' && {
            frequency: node.frequency,
            workType: node.workType,
            description: node.description,
            notes: node.notes,
            period: node.period
          })
        };
      }
      
      current = current[key].children;
    });
  });

  return convertTreeToArray(tree);
}

function convertTreeToArray(tree: any): any[] {
  return Object.values(tree).map((node: any) => ({
    ...node,
    children: node.children && Object.keys(node.children).length > 0 
      ? convertTreeToArray(node.children) 
      : []
  }));
}
