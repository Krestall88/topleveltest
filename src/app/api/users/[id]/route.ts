import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

async function getUserFromToken(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, role: true }
    });

    return user;
  } catch (error) {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const userId = params.id;

    // Получаем информацию о пользователе
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });

    if (!targetUser) {
      return NextResponse.json({ message: 'Пользователь не найден' }, { status: 404 });
    }

    // Получаем объекты пользователя
    const objects = await prisma.cleaningObject.findMany({
      where: { managerId: userId },
      include: {
        creator: {
          select: { name: true }
        }
      }
    });

    // Получаем чек-листы
    const checklists = await prisma.checklist.findMany({
      where: { 
        object: { managerId: userId }
      },
      include: {
        object: {
          select: { name: true }
        }
      }
    });

    // Получаем заявки
    const requests = await prisma.request.findMany({
      where: { 
        object: { managerId: userId }
      },
      include: {
        object: {
          select: { name: true }
        }
      }
    });

    // Получаем расходы
    const expenses = await prisma.expense.findMany({
      where: { userId: userId },
      include: {
        item: {
          select: { name: true }
        }
      }
    });

    // Получаем фотоотчеты
    const photoReports = await prisma.photoReport.findMany({
      where: { userId: userId },
      include: {
        object: {
          select: { name: true }
        }
      }
    });

    // Статистика
    const stats = {
      totalObjects: objects.length,
      totalChecklists: checklists.length,
      totalRequests: requests.length,
      totalExpenses: expenses.reduce((sum, expense) => {
        const amount = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount?.toString() || '0');
        return sum + amount;
      }, 0),
      totalPhotoReports: photoReports.length,
    };

    return NextResponse.json({
      user: targetUser,
      objects,
      checklists,
      requests,
      expenses,
      photoReports,
      stats
    });

  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { message: 'Ошибка при получении данных пользователя' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const userId = params.id;

    // Проверяем, что пользователь существует
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ message: 'Пользователь не найден' }, { status: 404 });
    }

    // Нельзя удалить админа
    if (targetUser.role === 'ADMIN') {
      return NextResponse.json({ message: 'Нельзя удалить администратора' }, { status: 400 });
    }

    // Проверяем, есть ли у пользователя назначенные объекты
    const objectsCount = await prisma.cleaningObject.count({
      where: { managerId: userId }
    });

    if (objectsCount > 0) {
      return NextResponse.json(
        { message: `Нельзя удалить пользователя с назначенными объектами (${objectsCount})` },
        { status: 400 }
      );
    }

    // Удаляем пользователя
    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ message: 'Пользователь успешно удален' });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { message: 'Ошибка при удалении пользователя' },
      { status: 500 }
    );
  }
}
