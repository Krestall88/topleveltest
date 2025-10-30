'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';

export default function ResetOverduePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/tasks/reset-overdue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || 'Ошибка при сбросе');
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Сброс просроченных задач
        </h1>
        <p className="text-gray-600">
          Сброс счетчиков просроченных задач и установка новой точки отсчета
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Внимание
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>Что произойдет:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Все просроченные задачи (до сегодня) будут помечены как отмененные</li>
              <li>Новая точка отсчета будет установлена на сегодня ({new Date().toLocaleDateString('ru-RU')})</li>
              <li>Сегодня будут только текущие задачи</li>
              <li>Завтра появятся просроченные, если сегодняшние не закрыть</li>
            </ul>
            <p className="text-orange-600 font-medium">
              ⚠️ Это действие нельзя отменить!
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Выполнить сброс</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleReset}
            disabled={loading}
            className="w-full"
            variant={result ? "outline" : "default"}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Выполняется сброс...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Сбросить просроченные задачи
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Ошибка</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              Сброс выполнен успешно
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-green-700 font-medium">{result.message}</p>
              
              {result.data && (
                <div className="bg-white p-4 rounded border">
                  <h4 className="font-medium mb-2">Детали:</h4>
                  <ul className="space-y-1 text-sm">
                    <li><strong>Сброшено задач:</strong> {result.data.resetCount}</li>
                    <li><strong>Новая точка отсчета:</strong> {result.data.newStartDate}</li>
                  </ul>
                  
                  {result.data.resetTasks && result.data.resetTasks.length > 0 && (
                    <div className="mt-3">
                      <h5 className="font-medium mb-2">Примеры сброшенных задач:</h5>
                      <div className="space-y-1 text-xs">
                        {result.data.resetTasks.map((task: any, index: number) => (
                          <div key={index} className="bg-gray-50 p-2 rounded">
                            <div><strong>{task.description}</strong></div>
                            <div className="text-gray-600">
                              {task.objectName} • {task.scheduledDate}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-blue-700 text-sm">
                  💡 Теперь можно вернуться к календарю и проверить, что просроченных задач нет.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
