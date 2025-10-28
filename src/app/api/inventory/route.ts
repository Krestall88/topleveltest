import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/inventory - получить список инвентаря
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;

    const { searchParams } = new URL(request.url);
    const objectId = searchParams.get('objectId');
    const lowStock = searchParams.get('lowStock') === 'true';

    // Фильтры в зависимости от роли
    let whereClause: any = {};

    if (user.role === 'MANAGER') {
      // Менеджер видит только инвентарь своих объектов
      const managedObjects = await prisma.cleaningObject.findMany({
        where: { managerId: user.id },
        select: { id: true }
      });
      whereClause.objectId = { in: managedObjects.map(obj => obj.id) };
    } else if (user.role === 'DEPUTY_ADMIN') {
      // Заместитель администратора видит только инвентарь назначенных ему объектов
      const assignedObjects = await prisma.deputyAdminAssignment.findMany({
        where: { deputyAdminId: user.id },
        select: { objectId: true }
      });
      whereClause.objectId = { in: assignedObjects.map(assignment => assignment.objectId) };
    }

    if (objectId) {
      whereClause.objectId = objectId;
    }

    if (lowStock) {
      whereClause.quantity = { lte: prisma.inventoryItem.fields.minQuantity };
    }

    const inventory = await prisma.inventoryItem.findMany({
      where: whereClause,
      include: {
        object: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      },
      orderBy: [
        { object: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    // Добавляем флаг низкого остатка
    const inventoryWithFlags = inventory.map(item => ({
      ...item,
      isLowStock: item.quantity <= (item.minQuantity || 0)
    }));

    return NextResponse.json(inventoryWithFlags);

  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/inventory - создать новую позицию инвентаря
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;

    const body = await request.json();
    const { name, description, quantity, unit, pricePerUnit, minQuantity, objectId } = body;

    // Проверяем права доступа к объекту
    if (user.role === 'MANAGER') {
      const object = await prisma.cleaningObject.findFirst({
        where: { id: objectId, managerId: user.id }
      });
      if (!object) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Вычисляем общую стоимость
    const totalValue = quantity * pricePerUnit;

    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        name,
        description,
        quantity: parseInt(quantity),
        unit,
        pricePerUnit: parseFloat(pricePerUnit),
        totalValue,
        minQuantity: parseInt(minQuantity) || 0,
        objectId
      },
      include: {
        object: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    // Логируем действие
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_INVENTORY_ITEM',
        entity: 'InventoryItem',
        entityId: inventoryItem.id,
        details: `Добавлена позиция инвентаря: ${name} (${quantity} ${unit}) для объекта ${inventoryItem.object.name}`,
        userId: user.id
      }
    });

    return NextResponse.json({
      ...inventoryItem,
      isLowStock: inventoryItem.quantity <= (inventoryItem.minQuantity || 0)
    });

  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
