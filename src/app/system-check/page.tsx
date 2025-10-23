'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SystemStatus {
  database: boolean;
  telegram: boolean;
  auth: boolean;
  environment: string;
}

export default function SystemCheckPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const checkSystem = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/system-check');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking system:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebhook = async () => {
    const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || 
                    prompt('Введите токен Telegram бота:');
    const appUrl = window.location.origin;

    if (!botToken) return;

    try {
      const response = await fetch('/api/setup-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, appUrl })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Webhook настроен успешно!');
        checkSystem();
      } else {
        alert(`❌ Ошибка: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Ошибка: ${error}`);
    }
  };

  useEffect(() => {
    checkSystem();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">🔧 Проверка системы</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Статус системы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={checkSystem} disabled={loading}>
                {loading ? 'Проверка...' : '🔄 Проверить систему'}
              </Button>
              
              {status && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={status.database ? '✅' : '❌'}></span>
                    <span>База данных: {status.database ? 'Подключена' : 'Ошибка'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={status.telegram ? '✅' : '❌'}></span>
                    <span>Telegram бот: {status.telegram ? 'Настроен' : 'Не настроен'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={status.auth ? '✅' : '❌'}></span>
                    <span>Аутентификация: {status.auth ? 'Работает' : 'Ошибка'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🌍</span>
                    <span>Окружение: {status.environment}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Настройка Telegram бота</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Настройте webhook для получения сообщений от Telegram бота
              </p>
              <Button onClick={setupWebhook}>
                🤖 Настроить Telegram webhook
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Данные для входа</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Администратор:</strong></p>
              <p>Email: admin@cleaning.com</p>
              <p>Пароль: admin123</p>
              <p className="text-amber-600 mt-2">
                ⚠️ Обязательно смените пароль после первого входа!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
