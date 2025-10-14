import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { telegramId, objectId } = await request.json();

    if (!telegramId || !objectId) {
      return NextResponse.json({ error: 'Missing telegramId or objectId' }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN не настроен');
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    // Получаем информацию об объекте и привязке
    const binding = await prisma.clientBinding.findFirst({
      where: { telegramId },
      include: {
        object: {
          include: {
            manager: {
              select: { name: true, email: true }
            }
          }
        }
      }
    });

    if (!binding) {
      return NextResponse.json({ error: 'Binding not found' }, { status: 404 });
    }

    // Отправляем подтверждение в Telegram
    const message = `✅ **Объект выбран успешно!**

🏢 **${binding.object.name}**
📍 ${binding.object.address}
${binding.object.manager ? `👤 Менеджер: ${binding.object.manager.name}` : ''}

Теперь вы можете отправлять сообщения, фото, голосовые сообщения или документы - они автоматически будут переданы менеджеру как дополнительные задания.

💬 Просто напишите ваше сообщение!`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) {
      console.error('❌ Ошибка отправки подтверждения в Telegram:', await response.text());
      return NextResponse.json({ error: 'Failed to send confirmation' }, { status: 500 });
    }

    console.log('✅ Подтверждение выбора объекта отправлено:', telegramId);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Ошибка в notify-selection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
