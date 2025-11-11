import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentTimeInTimezone } from '@/lib/timezone-utils';
import { sendTelegramMessage } from '@/lib/telegram-notifications';

/**
 * Cron endpoint для проверки просроченных задач
 * Запускается каждый час через Vercel Cron Jobs
 * 
 * Отправляет напоминания менеджерам о незакрытых задачах:
 * - За 3 часа до конца рабочего дня (15:00 при окончании в 18:00)
 * - За 1 час до конца рабочего дня (17:00 при окончании в 18:00)
 */
export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации (защита от несанкционированного доступа)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ Неавторизованная попытка доступа к cron endpoint');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('⏰ Запуск проверки просроченных задач...');

    const now = new Date();
    let notificationsSent = 0;
    let objectsChecked = 0;

    // Получаем все объекты с менеджерами, у которых привязан Telegram
    const objects = await prisma.cleaningObject.findMany({
      where: {
        managerId: { not: null },
        manager: {
          telegramId: { not: null }
        }
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            telegramId: true
          }
        }
      }
    });

    console.log(`📊 Найдено объектов для проверки: ${objects.length}`);

    for (const object of objects) {
      objectsChecked++;

      // Определяем текущее время в часовом поясе объекта
      const objectTime = getCurrentTimeInTimezone(object.timezone || 'Europe/Moscow');
      const currentHour = objectTime.getHours();
      const currentMinute = objectTime.getMinutes();

      // Парсим время окончания рабочего дня
      const [endHour] = object.workEndTime.split(':').map(Number);

      // Проверяем, нужно ли отправлять напоминание
      // Отправляем только в начале часа (минута 0-5)
      if (currentMinute > 5) continue;

      const shouldSend3HourReminder = currentHour === endHour - 3;
      const shouldSend1HourReminder = currentHour === endHour - 1;

      if (!shouldSend3HourReminder && !shouldSend1HourReminder) continue;

      // Получаем незакрытые задачи на сегодня
      const startOfDay = new Date(objectTime);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(objectTime);
      endOfDay.setHours(23, 59, 59, 999);

      // Получаем незакрытые задачи
      const overdueTasks = await prisma.task.findMany({
        where: {
          objectId: object.id,
          status: { not: 'COMPLETED' },
          scheduledDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          techCard: {
            select: {
              name: true,
              frequency: true
            }
          }
        },
        orderBy: { scheduledDate: 'asc' }
      });

      // Если есть незакрытые задачи, отправляем напоминание
      if (overdueTasks.length > 0 && object.manager?.telegramId) {
        const hoursLeft = shouldSend3HourReminder ? 3 : 1;
        
        await sendOverdueReminder(
          object.manager.telegramId,
          object.name,
          overdueTasks,
          hoursLeft
        );

        notificationsSent++;
        console.log(`📱 Отправлено напоминание для объекта "${object.name}" (${hoursLeft}ч до конца дня)`);
      }
    }

    console.log(`✅ Проверка завершена. Объектов проверено: ${objectsChecked}, уведомлений отправлено: ${notificationsSent}`);

    return NextResponse.json({
      success: true,
      objectsChecked,
      notificationsSent,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('❌ Ошибка при проверке просроченных задач:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Отправка напоминания о незакрытых задачах
 */
async function sendOverdueReminder(
  telegramId: string,
  objectName: string,
  tasks: any[],
  hoursLeft: number
): Promise<boolean> {
  const hoursText = hoursLeft === 1 ? 'час' : hoursLeft === 3 ? 'часа' : 'часов';
  
  const message = `
⚠️ <b>Напоминание о задачах</b>

🏢 <b>Объект:</b> ${objectName}
⏰ <b>До конца рабочего дня:</b> ${hoursLeft} ${hoursText}

📋 <b>Незакрытые задачи (${tasks.length}):</b>
${tasks.slice(0, 10).map((task, i) => {
  const freq = task.techCard?.frequency || '';
  const freqText = freq === 'DAILY' ? '(ежедневная)' : freq === 'WEEKLY' ? '(еженедельная)' : '';
  return `${i + 1}. ${task.techCard?.name || task.description} ${freqText}`;
}).join('\n')}${tasks.length > 10 ? `\n... и еще ${tasks.length - 10} задач(и)` : ''}

<i>Пожалуйста, завершите задачи до конца рабочего дня.</i>
  `.trim();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return sendTelegramMessage(telegramId, message, {
    parseMode: 'HTML',
    buttons: [
      [
        {
          text: '📱 Открыть задачи',
          url: `${appUrl}/tasks`,
        },
      ],
    ],
  });
}
