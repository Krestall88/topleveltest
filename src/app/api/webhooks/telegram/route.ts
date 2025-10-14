import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
    voice?: {
      file_id: string;
      file_unique_id: string;
      duration: number;
      mime_type?: string;
      file_size?: number;
    };
    photo?: Array<{
      file_id: string;
      file_unique_id: string;
      width: number;
      height: number;
      file_size?: number;
    }>;
    document?: {
      file_id: string;
      file_unique_id: string;
      file_name?: string;
      mime_type?: string;
      file_size?: number;
    };
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
        type: string;
      };
    };
    data?: string;
  };
}

// POST /api/webhooks/telegram - Webhook для Telegram бота
export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();
    
    console.log('📱 Получено обновление от Telegram:', {
      updateId: update.update_id,
      messageId: update.message?.message_id,
      callbackQueryId: update.callback_query?.id,
      fromId: update.message?.from?.id || update.callback_query?.from?.id,
      text: update.message?.text?.substring(0, 50) + '...' || 'callback_query'
    });

    // Обработка callback_query (нажатие на inline кнопки)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return NextResponse.json({ ok: true });
    }

    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const telegramId = message.from.id.toString();
    const userName = `${message.from.first_name} ${message.from.last_name || ''}`.trim();

    // Проверяем команду /start
    if (message.text === '/start') {
      await sendObjectSelectionMessage(telegramId, userName);
      return NextResponse.json({ ok: true });
    }

    // Проверяем привязку клиента к объекту
    const binding = await prisma.clientBinding.findFirst({
      where: { telegramId },
      include: {
        object: {
          include: {
            manager: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!binding) {
      // Клиент не привязан - отправляем ссылку для выбора объекта
      await sendObjectSelectionMessage(telegramId, userName);
      return NextResponse.json({ ok: true });
    }

    // Обрабатываем сообщение как дополнительное задание
    await processAdditionalTask(message, binding, telegramId, userName);

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('❌ Ошибка обработки Telegram webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function sendObjectSelectionMessage(telegramId: string, userName: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN не настроен');
    return;
  }

  try {
    // Получаем список объектов из базы данных
    console.log('🔍 Запрашиваем объекты из базы данных...');
    
    const objects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        manager: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log('📊 Найдено объектов:', objects.length);
    console.log('📋 Объекты:', objects.map(obj => ({ id: obj.id, name: obj.name })));

    if (objects.length === 0) {
      const message = `Привет, ${userName}! 👋

К сожалению, в системе пока нет доступных объектов для выбора. Обратитесь к администратору.`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: message
        })
      });
      return;
    }

    // Создаем кнопку для открытия веб-приложения выбора объекта
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    const webAppUrl = `${baseUrl}/choose-object?telegramId=${telegramId}`;
    
    const keyboard = {
      inline_keyboard: [[{
        text: '🏢 Выбрать объект',
        web_app: { url: webAppUrl }
      }]]
    };

    const message = `Привет, ${userName}! 👋

Для отправки заданий по уборке, сначала выберите объект, с которого вы пишете.

👇 Нажмите кнопку ниже, чтобы выбрать объект из удобного списка:`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        reply_markup: keyboard
      })
    });

    if (!response.ok) {
      console.error('❌ Ошибка отправки сообщения в Telegram:', await response.text());
    } else {
      console.log('✅ Сообщение с выбором объекта отправлено:', telegramId);
    }
  } catch (error) {
    console.error('❌ Ошибка в sendObjectSelectionMessage:', error);
    
    // Отправляем сообщение об ошибке пользователю
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: `❌ Произошла ошибка при загрузке списка объектов. Попробуйте позже или обратитесь к администратору.\n\nОшибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
        })
      });
    } catch (sendError) {
      console.error('❌ Ошибка отправки сообщения об ошибке:', sendError);
    }
  }
}

async function handleCallbackQuery(callbackQuery: any) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN не настроен');
    return;
  }

  const telegramId = callbackQuery.from.id.toString();
  const userName = `${callbackQuery.from.first_name} ${callbackQuery.from.last_name || ''}`.trim();
  const data = callbackQuery.data;

  try {
    // Отвечаем на callback_query (убирает "загрузку" на кнопке)
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQuery.id,
        text: 'Обрабатываем ваш выбор...'
      })
    });

    // Обрабатываем выбор объекта
    if (data?.startsWith('select_object_')) {
      const objectId = data.replace('select_object_', '');
      
      // Получаем информацию об объекте
      const object = await prisma.cleaningObject.findUnique({
        where: { id: objectId },
        include: {
          manager: {
            select: { name: true, email: true }
          }
        }
      });

      if (!object) {
        await sendTelegramMessage(telegramId, '❌ Объект не найден. Попробуйте еще раз.');
        return;
      }

      if (!object.managerId) {
        await sendTelegramMessage(telegramId, '❌ У выбранного объекта не назначен менеджер. Обратитесь к администратору.');
        return;
      }

      // Создаем или обновляем привязку клиента к объекту
      await prisma.clientBinding.upsert({
        where: { 
          telegramId_objectId: { 
            telegramId, 
            objectId 
          } 
        },
        update: { objectId },
        create: { 
          telegramId, 
          objectId 
        }
      });

      // Редактируем исходное сообщение
      if (callbackQuery.message) {
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: callbackQuery.message.chat.id,
            message_id: callbackQuery.message.message_id,
            text: `✅ Отлично! Вы выбрали объект:

🏢 **${object.name}**
📍 ${object.address}
👤 Менеджер: ${object.manager?.name || 'Не назначен'}

Теперь все ваши сообщения (текст, фото, голосовые) будут автоматически направляться ответственному менеджеру.

Можете отправлять задания! 📝`,
            parse_mode: 'Markdown'
          })
        });
      }

      console.log('✅ Клиент привязан к объекту:', {
        telegramId,
        userName,
        objectName: object.name
      });
    }

  } catch (error) {
    console.error('❌ Ошибка обработки callback_query:', error);
    await sendTelegramMessage(telegramId, '❌ Произошла ошибка. Попробуйте еще раз или обратитесь к администратору.');
  }
}

async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      })
    });
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error);
  }
}

async function processAdditionalTask(
  message: any, 
  binding: any, 
  telegramId: string, 
  userName: string
) {
  try {
    let content = '';
    let attachments: string[] = [];
    let title = '';

    // Обрабатываем текстовое сообщение
    if (message.text) {
      content = message.text;
      title = content.length > 50 ? content.substring(0, 50) + '...' : content;
    }

    // Обрабатываем голосовое сообщение
    if (message.voice) {
      content = '[Голосовое сообщение]';
      title = 'Голосовое сообщение от ' + userName;
      
      // Здесь можно добавить скачивание файла
      const fileUrl = await getFileUrl(message.voice.file_id);
      if (fileUrl) {
        attachments.push(fileUrl);
      }
    }

    // Обрабатываем фото
    if (message.photo && message.photo.length > 0) {
      const photo = message.photo[message.photo.length - 1]; // Берем самое большое фото
      content = message.caption || '[Фотография]';
      title = 'Фото от ' + userName;
      
      const fileUrl = await getFileUrl(photo.file_id);
      if (fileUrl) {
        attachments.push(fileUrl);
      }
    }

    // Обрабатываем документ
    if (message.document) {
      content = message.caption || '[Документ: ' + (message.document.file_name || 'файл') + ']';
      title = 'Документ от ' + userName;
      
      const fileUrl = await getFileUrl(message.document.file_id);
      if (fileUrl) {
        attachments.push(fileUrl);
      }
    }

    if (!content) {
      console.log('⚠️ Неподдерживаемый тип сообщения');
      return;
    }

    // Создаем дополнительное задание
    const task = await prisma.additionalTask.create({
      data: {
        title,
        content,
        source: 'TELEGRAM',
        sourceDetails: {
          telegramId,
          userName,
          messageId: message.message_id,
          chatId: message.chat.id
        },
        attachments,
        objectId: binding.object.id,
        assignedToId: binding.object.managerId!,
        receivedAt: new Date(message.date * 1000)
      }
    });

    console.log('✅ Дополнительное задание создано из Telegram:', {
      taskId: task.id,
      objectName: binding.object.name,
      managerName: binding.object.manager?.name
    });

    // Отправляем подтверждение клиенту
    await sendConfirmationMessage(telegramId, binding.object.name, task.id);

    // Здесь можно добавить уведомление менеджера

  } catch (error) {
    console.error('❌ Ошибка создания дополнительного задания:', error);
  }
}

async function getFileUrl(fileId: string): Promise<string | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return null;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const data = await response.json();
    
    if (data.ok && data.result.file_path) {
      return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
    }
  } catch (error) {
    console.error('❌ Ошибка получения файла:', error);
  }
  
  return null;
}

async function sendConfirmationMessage(telegramId: string, objectName: string, taskId: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const message = `✅ Ваше задание получено!

📍 Объект: ${objectName}
🆔 Номер задания: ${taskId.substring(0, 8)}

Задание передано ответственному менеджеру. Вы получите уведомление о выполнении.`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message
      })
    });
  } catch (error) {
    console.error('❌ Ошибка отправки подтверждения:', error);
  }
}
