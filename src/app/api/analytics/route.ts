import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // дни
    const objectId = searchParams.get('objectId');

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Базовые фильтры
    const dateFilter = {
      createdAt: {
        gte: startDate,
      },
    };

    const objectFilter = objectId ? { objectId } : {};

    // Статистика по чек-листам
    const checklistStats = await prisma.checklist.groupBy({
      by: ['objectId'],
      where: {
        ...dateFilter,
        ...objectFilter,
      },
      _count: {
        id: true,
      },
    });

    // Статистика по заявкам
    const requestStats = await prisma.request.groupBy({
      by: ['status', 'objectId'],
      where: {
        ...dateFilter,
        ...objectFilter,
      },
      _count: {
        id: true,
      },
    });

    // Статистика по фотоотчётам
    const photoStats = await prisma.photoReport.groupBy({
      by: ['objectId'],
      where: {
        ...dateFilter,
        ...objectFilter,
      },
      _count: {
        id: true,
      },
    });

    // Статистика по задачам
    const taskStats = await prisma.task.groupBy({
      by: ['status'],
      where: {
        checklist: {
          ...dateFilter,
          ...objectFilter,
        },
      },
      _count: {
        id: true,
      },
    });

    // Статистика по пользователям (менеджерам)
    const userStats = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            createdChecklists: {
              where: {
                ...dateFilter,
                ...objectFilter,
              },
            },
            createdRequests: {
              where: {
                ...dateFilter,
                ...objectFilter,
              },
            },
          },
        },
      },
    });

    // Отдельно получаем статистику по фотографиям
    const photoUserStats = await prisma.photoReport.groupBy({
      by: ['uploaderId'],
      where: {
        ...dateFilter,
        ...objectFilter,
      },
      _count: {
        id: true,
      },
    });

    // Получаем информацию об объектах
    const objects = await prisma.cleaningObject.findMany({
      where: objectId ? { id: objectId } : {},
      select: {
        id: true,
        name: true,
        address: true,
      },
    });

    // Динамика по дням (последние 30 дней)
    const dailyStats = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayFilter = {
        createdAt: {
          gte: date,
          lt: nextDate,
        },
        ...objectFilter,
      };

      const [checklists, requests, photos] = await Promise.all([
        prisma.checklist.count({ where: dayFilter }),
        prisma.request.count({ where: dayFilter }),
        prisma.photoReport.count({ where: dayFilter }),
      ]);

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        checklists,
        requests,
        photos,
      });
    }

    // Объединяем статистику пользователей с фотографиями
    const combinedUserStats = userStats.map(user => {
      const photoStat = photoUserStats.find(p => p.uploaderId === user.id);
      return {
        ...user,
        _count: {
          ...user._count,
          uploadedPhotos: photoStat?._count.id || 0,
        },
      };
    });

    return NextResponse.json({
      period: periodDays,
      objects,
      checklistStats,
      requestStats,
      photoStats,
      taskStats,
      userStats: combinedUserStats,
      dailyStats,
    });
  } catch (error) {
    console.error('Ошибка при получении аналитики:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении аналитики' },
      { status: 500 }
    );
  }
}
