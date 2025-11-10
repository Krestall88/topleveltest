import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

async function getUserFromToken(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    return { 
      id: payload.userId as string, 
      role: payload.role as string 
    };
  } catch (error) {
    return null;
  }
}

// GET /api/objects/[id]/structures - Получить структуры объекта
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { id: objectId } = await params;

    const structures = await prisma.objectStructure.findMany({
      where: { objectId },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ structures });
  } catch (error) {
    console.error('Ошибка при получении структур:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/objects/[id]/structures - Создать новую структуру
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { id: objectId } = await params;
    const body = await req.json();
    const { objectName, techCardName, frequency, siteName, zoneName, roomGroupName, roomName, cleaningObjectName, notes, workType, description } = body;

    // Проверяем права доступа
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId }
    });

    if (!object) {
      return NextResponse.json({ message: 'Объект не найден' }, { status: 404 });
    }

    const canEdit = user.role === 'ADMIN' || 
                   user.role === 'DEPUTY' || 
                   (user.role === 'MANAGER' && object.managerId === user.id);

    if (!canEdit) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const structure = await prisma.objectStructure.create({
      data: {
        objectName: objectName || object.name,
        objectAddress: object.address,
        techCardName,
        frequency,
        siteName,
        zoneName,
        roomGroupName,
        roomName,
        cleaningObjectName,
        notes,
        workType,
        description,
        objectId,
        techCardId: 'temp-id' // Временный ID, нужно будет связать с реальной техкартой
      }
    });

    return NextResponse.json({ structure }, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании структуры:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// PUT /api/objects/[id]/structures/[structureId] - Обновить структуру
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { structureId, objectName, techCardName, frequency, siteName, zoneName, roomGroupName, roomName, cleaningObjectName, notes, workType, description } = body;

    // Проверяем права доступа
    const structure = await prisma.objectStructure.findUnique({
      where: { id: structureId },
      include: { 
        object: {
          select: { id: true, name: true, managerId: true }
        }
      }
    });

    if (!structure) {
      return NextResponse.json({ message: 'Структура не найдена' }, { status: 404 });
    }

    const canEdit = user.role === 'ADMIN' || 
                   user.role === 'DEPUTY' || 
                   (user.role === 'MANAGER' && structure.object.managerId === user.id);

    if (!canEdit) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const updatedStructure = await prisma.objectStructure.update({
      where: { id: structureId },
      data: {
        objectName: objectName || structure.objectName,
        techCardName: techCardName || structure.techCardName,
        frequency: frequency || structure.frequency,
        siteName,
        zoneName,
        roomGroupName,
        roomName,
        cleaningObjectName,
        notes,
        workType,
        description
      }
    });

    return NextResponse.json({ structure: updatedStructure });
  } catch (error) {
    console.error('Ошибка при обновлении структуры:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/objects/[id]/structures/[structureId] - Удалить структуру
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const structureId = searchParams.get('structureId');

    if (!structureId) {
      return NextResponse.json({ message: 'ID структуры не указан' }, { status: 400 });
    }

    // Проверяем права доступа
    const structure = await prisma.objectStructure.findUnique({
      where: { id: structureId },
      include: { object: true }
    });

    if (!structure) {
      return NextResponse.json({ message: 'Структура не найдена' }, { status: 404 });
    }

    const canDelete = user.role === 'ADMIN' || 
                     user.role === 'DEPUTY' || 
                     (user.role === 'MANAGER' && structure.object.managerId === user.id);

    if (!canDelete) {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    await prisma.objectStructure.delete({
      where: { id: structureId }
    });

    return NextResponse.json({ message: 'Структура удалена' });
  } catch (error) {
    console.error('Ошибка при удалении структуры:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}
