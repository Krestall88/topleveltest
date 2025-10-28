import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function getUserFromToken(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) return null;
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, role: true, name: true, email: true }
    });
    
    return user;
  } catch (error) {
    return null;
  }
}

// PATCH /api/objects/[id]/manager-edit - Обновление разрешения редактирования для менеджера
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });
    }

    // Только админы могут изменять разрешения
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Недостаточно прав' }, { status: 403 });
    }

    const { allowManagerEdit } = await req.json();
    const objectId = params.id;

    // Проверяем, существует ли объект
    const existingObject = await prisma.cleaningObject.findUnique({
      where: { id: objectId }
    });

    if (!existingObject) {
      return NextResponse.json({ message: 'Объект не найден' }, { status: 404 });
    }

    // Обновляем разрешение редактирования через raw SQL (пока Prisma не обновился)
    await prisma.$executeRaw`
      UPDATE "CleaningObject" 
      SET "allowManagerEdit" = ${Boolean(allowManagerEdit)}
      WHERE id = ${objectId}
    `;

    // Получаем обновленный объект с allowManagerEdit через raw SQL
    const updatedObjectRaw = await prisma.$queryRaw`
      SELECT id, name, address, "createdAt", "allowManagerEdit"
      FROM "CleaningObject" 
      WHERE id = ${objectId}
    `;

    if (!updatedObjectRaw || (updatedObjectRaw as any[]).length === 0) {
      return NextResponse.json({ message: 'Объект не найден после обновления' }, { status: 404 });
    }

    const objectData = (updatedObjectRaw as any[])[0];

    // Получаем связанные данные отдельно
    const updatedObject = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true
          }
        },
        rooms: {
          include: {
            techCards: true
          }
        },
        sites: {
          include: {
            manager: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            rooms: true,
            techCards: true,
            checklists: true,
            requests: true
          }
        }
      }
    });

    if (!updatedObject) {
      return NextResponse.json({ message: 'Объект не найден' }, { status: 404 });
    }

    // Объединяем данные из raw SQL и Prisma
    const result = {
      ...updatedObject,
      allowManagerEdit: objectData.allowManagerEdit
    };

    console.log(`🔧 Разрешение редактирования для объекта ${result.name} ${allowManagerEdit ? 'включено' : 'отключено'} пользователем ${user.name}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Ошибка обновления разрешения редактирования:', error);
    return NextResponse.json(
      { message: 'Ошибка обновления разрешения редактирования' },
      { status: 500 }
    );
  }
}
