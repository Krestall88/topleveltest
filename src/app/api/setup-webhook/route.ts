import { NextRequest, NextResponse } from 'next/server';

// GET /api/setup-webhook - Проверка текущего webhook
export async function GET(req: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return NextResponse.json({ 
        error: 'TELEGRAM_BOT_TOKEN не настроен в переменных окружения' 
      }, { status: 400 });
    }
    
    // Получаем информацию о webhook
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      webhookInfo: result
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения информации о webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/setup-webhook - Установка webhook
export async function POST(req: NextRequest) {
  try {
    const { botToken, appUrl } = await req.json();
    
    if (!botToken || !appUrl) {
      return NextResponse.json({ 
        error: 'botToken and appUrl are required' 
      }, { status: 400 });
    }
    
    // Устанавливаем webhook
    const webhookUrl = `${appUrl}/api/webhooks/telegram`;
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      return NextResponse.json({
        success: true,
        message: 'Webhook установлен успешно',
        webhookUrl,
        result
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Ошибка установки webhook',
        result
      }, { status: 400 });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
