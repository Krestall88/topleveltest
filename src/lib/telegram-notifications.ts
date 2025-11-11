/**
 * Сервис для отправки Telegram уведомлений менеджерам
 */

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
  disable_web_page_preview?: boolean;
  reply_markup?: {
    inline_keyboard?: Array<Array<{
      text: string;
      callback_data?: string;
      url?: string;
    }>>;
  };
}

/**
 * Отправка сообщения в Telegram
 */
export async function sendTelegramMessage(
  telegramId: string,
  message: string,
  options?: {
    parseMode?: 'HTML' | 'Markdown';
    disablePreview?: boolean;
    buttons?: Array<Array<{ text: string; url?: string; callbackData?: string }>>;
  }
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN не установлен');
    return false;
  }

  try {
    const payload: TelegramMessage = {
      chat_id: telegramId,
      text: message,
      parse_mode: options?.parseMode || 'HTML',
      disable_web_page_preview: options?.disablePreview || false,
    };

    // Добавляем кнопки если есть
    if (options?.buttons && options.buttons.length > 0) {
      payload.reply_markup = {
        inline_keyboard: options.buttons.map(row =>
          row.map(btn => ({
            text: btn.text,
            ...(btn.url && { url: btn.url }),
            ...(btn.callbackData && { callback_data: btn.callbackData }),
          }))
        ),
      };
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Ошибка отправки Telegram сообщения:', error);
      return false;
    }

    console.log(`✅ Telegram сообщение отправлено: ${telegramId}`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка при отправке Telegram сообщения:', error);
    return false;
  }
}

/**
 * Уведомление о новой задаче
 */
export async function notifyNewTask(
  telegramId: string,
  taskData: {
    title: string;
    objectName: string;
    description?: string;
    taskId: string;
  }
): Promise<boolean> {
  const message = `
🔔 <b>Новая задача!</b>

📋 <b>Задача:</b> ${taskData.title}
🏢 <b>Объект:</b> ${taskData.objectName}
${taskData.description ? `\n📝 <b>Описание:</b> ${taskData.description}` : ''}

⏰ Пожалуйста, примите задачу в работу.
  `.trim();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return sendTelegramMessage(telegramId, message, {
    parseMode: 'HTML',
    buttons: [
      [
        {
          text: '📱 Открыть задачу',
          url: `${appUrl}/additional-tasks`,
        },
      ],
    ],
  });
}

/**
 * Уведомление о назначении на объект
 */
export async function notifyObjectAssignment(
  telegramId: string,
  objectData: {
    objectName: string;
    address: string;
  }
): Promise<boolean> {
  const message = `
✅ <b>Вы назначены на объект!</b>

🏢 <b>Объект:</b> ${objectData.objectName}
📍 <b>Адрес:</b> ${objectData.address}

Теперь вы можете управлять этим объектом.
  `.trim();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return sendTelegramMessage(telegramId, message, {
    parseMode: 'HTML',
    buttons: [
      [
        {
          text: '🏢 Открыть объекты',
          url: `${appUrl}/objects`,
        },
      ],
    ],
  });
}

/**
 * Уведомление о назначении на участок
 */
export async function notifySiteAssignment(
  telegramId: string,
  siteData: {
    siteName: string;
    objectName: string;
    isSeniorManager: boolean;
  }
): Promise<boolean> {
  const role = siteData.isSeniorManager ? 'старшим менеджером' : 'менеджером';
  
  const message = `
✅ <b>Вы назначены ${role} на участок!</b>

🗺️ <b>Участок:</b> ${siteData.siteName}
🏢 <b>Объект:</b> ${siteData.objectName}

Теперь вы можете управлять этим участком.
  `.trim();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return sendTelegramMessage(telegramId, message, {
    parseMode: 'HTML',
    buttons: [
      [
        {
          text: '🏢 Открыть объекты',
          url: `${appUrl}/objects`,
        },
      ],
    ],
  });
}

/**
 * Уведомление о просроченной задаче
 */
export async function notifyOverdueTask(
  telegramId: string,
  taskData: {
    title: string;
    objectName: string;
    daysOverdue: number;
  }
): Promise<boolean> {
  const message = `
⚠️ <b>Просроченная задача!</b>

📋 <b>Задача:</b> ${taskData.title}
🏢 <b>Объект:</b> ${taskData.objectName}
⏰ <b>Просрочено:</b> ${taskData.daysOverdue} дн.

Пожалуйста, завершите задачу как можно скорее.
  `.trim();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return sendTelegramMessage(telegramId, message, {
    parseMode: 'HTML',
    buttons: [
      [
        {
          text: '📱 Открыть задачи',
          url: `${appUrl}/additional-tasks`,
        },
      ],
    ],
  });
}

/**
 * Уведомление о комментарии к задаче
 */
export async function notifyTaskComment(
  telegramId: string,
  commentData: {
    taskTitle: string;
    authorName: string;
    comment: string;
  }
): Promise<boolean> {
  const message = `
💬 <b>Новый комментарий к задаче</b>

📋 <b>Задача:</b> ${commentData.taskTitle}
👤 <b>Автор:</b> ${commentData.authorName}

<i>${commentData.comment}</i>
  `.trim();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return sendTelegramMessage(telegramId, message, {
    parseMode: 'HTML',
    buttons: [
      [
        {
          text: '📱 Открыть задачу',
          url: `${appUrl}/additional-tasks`,
        },
      ],
    ],
  });
}

/**
 * Уведомление о смене роли
 */
export async function notifyRoleChange(
  telegramId: string,
  roleData: {
    oldRole: string;
    newRole: string;
  }
): Promise<boolean> {
  const roleNames: Record<string, string> = {
    MANAGER: 'Менеджер',
    SENIOR_MANAGER: 'Старший менеджер',
    ACCOUNTANT: 'Бухгалтер',
    ADMIN: 'Администратор',
    DEPUTY_ADMIN: 'Заместитель администратора',
  };

  const message = `
🔄 <b>Изменение роли</b>

Ваша роль изменена:
${roleNames[roleData.oldRole] || roleData.oldRole} → ${roleNames[roleData.newRole] || roleData.newRole}
  `.trim();

  return sendTelegramMessage(telegramId, message, {
    parseMode: 'HTML',
  });
}
