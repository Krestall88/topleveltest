// Серверные функции для работы с уведомлениями
import { prisma } from '@/lib/prisma';

export interface CreateServerNotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
}

export async function createServerNotification(data: CreateServerNotificationData) {
  try {
    // Создаем уведомление в БД
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        isRead: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            telegramId: true,
          },
        },
      },
    });

    // Отправляем уведомление в Telegram, если у пользователя есть telegramId
    if (notification.user.telegramId) {
      try {
        const telegramMessage = `🔔 *${data.title}*\n\n${data.message}`;
        
        const response = await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: notification.user.telegramId,
              text: telegramMessage,
              parse_mode: 'Markdown',
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Telegram API error:', errorData);
        } else {
          console.log('✅ Уведомление отправлено в Telegram:', notification.user.telegramId);
        }
      } catch (telegramError) {
        console.error('❌ Ошибка отправки в Telegram:', telegramError);
        // Не прерываем создание уведомления
      }
    } else {
      console.log('⚠️ У пользователя нет telegramId:', data.userId);
    }

    return notification;
  } catch (error) {
    console.error('Ошибка при создании уведомления:', error);
    throw error;
  }
}

export async function notifyReportingTaskCreated(
  userId: string,
  taskId: string,
  title: string,
  objectName: string
) {
  return createServerNotification({
    userId,
    type: 'REPORTING_TASK_CREATED',
    title: `Новая задача: ${title}`,
    message: `Вам назначена новая задача по объекту "${objectName}"`,
  });
}
