'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function SetupTelegramPage() {
  const [botToken, setBotToken] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSetup = async () => {
    if (!botToken || !appUrl) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/setup-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, appUrl })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Ошибка настройки webhook');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const checkWebhook = async () => {
    if (!botToken) {
      setError('Введите токен бота');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Ошибка проверки webhook');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Настройка Telegram бота</CardTitle>
          <CardDescription>
            Установите webhook для вашего Telegram бота
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="botToken">Токен бота</Label>
            <Input
              id="botToken"
              type="text"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Получите токен у @BotFather в Telegram
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appUrl">URL приложения</Label>
            <Input
              id="appUrl"
              type="text"
              placeholder="https://your-app.vercel.app"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              URL вашего приложения на Vercel (без слеша в конце)
            </p>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={handleSetup} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Настройка...' : 'Установить Webhook'}
            </Button>
            <Button 
              onClick={checkWebhook} 
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              Проверить Webhook
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">❌ {error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium mb-2">✅ Результат:</p>
              <pre className="text-xs bg-white p-3 rounded border overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm font-medium mb-2">📝 Инструкция:</p>
            <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
              <li>Получите токен бота у @BotFather</li>
              <li>Добавьте токен в переменные окружения Vercel (TELEGRAM_BOT_TOKEN)</li>
              <li>Укажите URL вашего приложения на Vercel</li>
              <li>Нажмите "Установить Webhook"</li>
              <li>Проверьте работу бота командой /start</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
