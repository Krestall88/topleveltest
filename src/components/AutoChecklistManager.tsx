'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Play, 
  RotateCcw, 
  Calendar, 
  CheckSquare, 
  Trash2,
  AlertCircle,
  Settings
} from 'lucide-react';

interface SchedulerStatus {
  initialized: boolean;
  tasks: Array<{
    name: string;
    schedule: string;
    timezone: string;
    description: string;
  }>;
  serverTime: string;
  nextRun: {
    checklists: string;
    cleanup: string;
  };
}

interface AutoGenerateStats {
  date: string;
  checklistsToday: number;
  totalObjects: number;
  totalRoomsWithTechCards: number;
  isWeekday: boolean;
}

interface CleanupStats {
  thresholds: {
    archiveAfterDays: number;
    deleteAfterDays: number;
    logsRetentionMonths: number;
  };
  toCleanup: {
    checklistsToArchive: number;
    checklistsToDelete: number;
    tasksToDelete: number;
    logsToDelete: number;
  };
  dates: {
    archiveThreshold: string;
    deleteThreshold: string;
    logsThreshold: string;
  };
}

export default function AutoChecklistManager() {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [autoGenerateStats, setAutoGenerateStats] = useState<AutoGenerateStats | null>(null);
  const [cleanupStats, setCleanupStats] = useState<CleanupStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');

  const fetchSchedulerStatus = async () => {
    try {
      const response = await fetch('/api/scheduler');
      if (response.ok) {
        const data = await response.json();
        setSchedulerStatus(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса планировщика:', error);
    }
  };

  const fetchAutoGenerateStats = async () => {
    try {
      const response = await fetch('/api/checklists/auto-generate');
      if (response.ok) {
        const data = await response.json();
        setAutoGenerateStats(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики автогенерации:', error);
    }
  };

  const fetchCleanupStats = async () => {
    try {
      const response = await fetch('/api/checklists/cleanup');
      if (response.ok) {
        const data = await response.json();
        setCleanupStats(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики очистки:', error);
    }
  };

  useEffect(() => {
    fetchSchedulerStatus();
    fetchAutoGenerateStats();
    fetchCleanupStats();
  }, []);

  const handleAction = async (action: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const result = await response.json();
        setLastAction(`${action}: ${result.message}`);
        
        // Обновляем статистику
        await fetchSchedulerStatus();
        await fetchAutoGenerateStats();
        await fetchCleanupStats();
        
        alert(`✅ ${result.message}`);
      } else {
        const error = await response.json();
        alert(`❌ Ошибка: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка выполнения действия:', error);
      alert('❌ Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAutoGenerate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/checklists/auto-generate', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setLastAction(`Ручная автогенерация: ${result.message}`);
        await fetchAutoGenerateStats();
        
        alert(`✅ ${result.message}\n\n` +
              `📊 Создано: ${result.created}\n` +
              `⏭️ Пропущено: ${result.skipped}\n` +
              `🏢 Объектов: ${result.totalObjects}`);
      } else {
        const error = await response.json();
        alert(`❌ Ошибка: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка ручной автогенерации:', error);
      alert('❌ Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🤖 Планировщик задач</h2>
          <p className="text-gray-600">
            Управление автоматическим созданием чек-листов и очисткой данных
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleAction('initialize')}
            disabled={isLoading}
            variant="outline"
          >
            <Settings className="w-4 h-4 mr-2" />
            Инициализировать
          </Button>
        </div>
      </div>

      {/* Статус планировщика */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Статус планировщика
            {schedulerStatus?.initialized && (
              <Badge className="ml-2" variant="default">Активен</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedulerStatus ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Расписание задач:</h4>
                  <ul className="space-y-2 text-sm">
                    {schedulerStatus.tasks.map((task, index) => (
                      <li key={index} className="flex items-center">
                        <CheckSquare className="w-4 h-4 mr-2 text-green-500" />
                        <div>
                          <div className="font-medium">{task.name}</div>
                          <div className="text-gray-600">{task.description}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Следующие запуски:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                      <span>Чек-листы: {schedulerStatus.nextRun.checklists}</span>
                    </div>
                    <div className="flex items-center">
                      <Trash2 className="w-4 h-4 mr-2 text-orange-500" />
                      <span>Очистка: {schedulerStatus.nextRun.cleanup}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {schedulerStatus.serverTime && (
                <div className="text-xs text-gray-500 border-t pt-2">
                  Время сервера: {new Date(schedulerStatus.serverTime).toLocaleString('ru-RU')}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Загрузка статуса планировщика...
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Автогенерация чек-листов */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckSquare className="w-5 h-5 mr-2" />
              Автогенерация чек-листов
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {autoGenerateStats && (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {autoGenerateStats.checklistsToday}
                  </div>
                  <div className="text-sm text-gray-600">Сегодня создано</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {autoGenerateStats.totalRoomsWithTechCards}
                  </div>
                  <div className="text-sm text-gray-600">Помещений с техкартами</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Button 
                onClick={handleManualAutoGenerate}
                disabled={isLoading}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Создать чек-листы вручную
              </Button>
              
              <Button 
                onClick={() => handleAction('test-autogenerate')}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Тестовый запуск
              </Button>
            </div>

            {autoGenerateStats && !autoGenerateStats.isWeekday && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="flex items-center text-yellow-800">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    Сегодня выходной день - автогенерация не запускается
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Очистка данных */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trash2 className="w-5 h-5 mr-2" />
              Очистка данных
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cleanupStats && (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {cleanupStats.toCleanup.checklistsToArchive}
                  </div>
                  <div className="text-sm text-gray-600">К архивации</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {cleanupStats.toCleanup.checklistsToDelete}
                  </div>
                  <div className="text-sm text-gray-600">К удалению</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Button 
                onClick={() => handleAction('test-cleanup')}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Запустить очистку
              </Button>
            </div>

            {cleanupStats && (
              <div className="text-xs text-gray-600 space-y-1">
                <div>Архивация: старше {cleanupStats.thresholds.archiveAfterDays} дней</div>
                <div>Удаление: старше {cleanupStats.thresholds.deleteAfterDays} дней</div>
                <div>Логи: старше {cleanupStats.thresholds.logsRetentionMonths} месяцев</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Последнее действие */}
      {lastAction && (
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="text-sm">
              <strong>Последнее действие:</strong> {lastAction}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
