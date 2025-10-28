import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// PUT /api/admin/users/[id] - обновить пользователя
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { name, email, phone } = body;

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json({ message: 'Пользователь не найден' }, { status: 404 });
    }

    // Проверяем, не занят ли email другим пользователем
    if (email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return NextResponse.json(
          { message: 'Пользователь с таким email уже существует' },
          { status: 400 }
        );
      }
    }

    // Обновляем пользователя
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        phone: phone || null
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      message: 'Пользователь успешно обновлен',
      user: updatedUser
    });

  } catch (error) {
    console.error('Ошибка обновления пользователя:', error);
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - удалить пользователя
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req);
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const { id } = params;

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        deputyAdminAssignments: true,
        managedObjects: true,
        completedTasks: true,
        auditLogs: true
      }
    });

    if (!existingUser) {
      return NextResponse.json({ message: 'Пользователь не найден' }, { status: 404 });
    }

    // Нельзя удалить главного администратора
    if (existingUser.role === 'ADMIN') {
      return NextResponse.json(
        { message: 'Нельзя удалить главного администратора' },
        { status: 400 }
      );
    }

    // Нельзя удалить самого себя
    if (existingUser.id === user.id) {
      return NextResponse.json(
        { message: 'Нельзя удалить самого себя' },
        { status: 400 }
      );
    }

    // Проверяем связанные данные
    const hasRelatedData = existingUser.managedObjects.length > 0 ||
                          existingUser.completedTasks.length > 0 ||
                          existingUser.auditLogs.length > 0;

    if (hasRelatedData) {
      return NextResponse.json(
        { 
          message: 'Нельзя удалить пользователя с связанными данными. Сначала переназначьте объекты и очистите историю.' 
        },
        { status: 400 }
      );
    }

    // Удаляем назначения заместителя (если есть)
    if (existingUser.deputyAdminAssignments.length > 0) {
      await prisma.deputyAdminAssignment.deleteMany({
        where: { deputyAdminId: id }
      });
    }

    // Удаляем пользователя
    const deletedUser = await prisma.user.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    return NextResponse.json({
      message: `Пользователь ${deletedUser.name} успешно удален`,
      user: deletedUser
    });

  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { message: 'Нельзя удалить пользователя из-за связанных данных' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
