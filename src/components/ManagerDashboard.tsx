'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  CheckSquare, 
  MessageSquare, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  RefreshCw
} from 'lucide-react';
import ManagerTaskInterface from '@/components/ManagerTaskInterface';
import AdditionalTaskCard from '@/components/AdditionalTaskCard';

interface AdditionalTask {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceDetails: any;
  attachments: string[];
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED';
  receivedAt: string;
  takenAt?: string;
  completedAt?: string;
  completionNote?: string;
  object: {
    id: string;
    name: string;
    address: string;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  };
  completedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ManagerDashboard() {
  const [additionalTasks, setAdditionalTasks] = useState<AdditionalTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchAdditionalTasks();
    
    // Автообновление каждые 30 секунд
    const interval = setInterval(() => {
      fetchAdditionalTasks();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchAdditionalTasks = async () => {
    try {
      const response = await fetch('/api/additional-tasks?myTasks=true');
      if (response.ok) {
        const tasks = await response.json();
        setAdditionalTasks(tasks);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Ошибка загрузки дополнительных заданий:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdditionalTaskStatusChange = async (taskId: string, action: 'take' | 'complete', note?: string) => {
    try {
      const response = await fetch(`/api/additional-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, completionNote: note })
      });

      if (response.ok) {
        await fetchAdditionalTasks();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Ошибка обновления задания');
      }
    } catch (error) {
      console.error('Ошибка обновления задания:', error);
      alert('Ошибка соединения с сервером');
    }
  };

  // Группировка дополнительных заданий по статусам
  const additionalTasksByStatus = {
    NEW: additionalTasks.filter(task => task.status === 'NEW'),
    IN_PROGRESS: additionalTasks.filter(task => task.status === 'IN_PROGRESS'),
    COMPLETED: additionalTasks.filter(task => task.status === 'COMPLETED')
  };

  const additionalTasksStats = {
    total: additionalTasks.length,
    new: additionalTasksByStatus.NEW.length,
    inProgress: additionalTasksByStatus.IN_PROGRESS.length,
    completed: additionalTasksByStatus.COMPLETED.length
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Мои задачи</h1>
          <p className="text-gray-600 mt-1">
            Управление чек-листами и дополнительными заданиями
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}</span>
          </div>
          <button
            onClick={fetchAdditionalTasks}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Статистика дополнительных заданий */}
      {additionalTasksStats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Всего заданий</p>
                  <p className="text-2xl font-bold">{additionalTasksStats.total}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Новые</p>
                  <p className="text-2xl font-bold text-red-600">{additionalTasksStats.new}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">В работе</p>
                  <p className="text-2xl font-bold text-yellow-600">{additionalTasksStats.inProgress}</p>
                </div>
                <PlayCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Выполнено</p>
                  <p className="text-2xl font-bold text-green-600">{additionalTasksStats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Вкладки */}
      <Tabs defaultValue="checklists" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="checklists" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Чек-листы
          </TabsTrigger>
          <TabsTrigger value="additional" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Дополнительные задания
            {additionalTasksStats.new > 0 && (
              <Badge variant="destructive" className="ml-1">
                {additionalTasksStats.new}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Чек-листы */}
        <TabsContent value="checklists" className="mt-6">
          <ManagerTaskInterface />
        </TabsContent>

        {/* Дополнительные задания */}
        <TabsContent value="additional" className="mt-6">
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Загрузка дополнительных заданий...</p>
              </div>
            ) : additionalTasks.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Дополнительных заданий нет
                  </h3>
                  <p className="text-gray-500">
                    Задания от клиентов будут появляться здесь автоматически
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Новые задания */}
                {additionalTasksByStatus.NEW.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Новые задания ({additionalTasksByStatus.NEW.length})
                    </h3>
                    <div className="space-y-4">
                      {additionalTasksByStatus.NEW.map((task) => (
                        <AdditionalTaskCard
                          key={task.id}
                          task={task}
                          onStatusChange={handleAdditionalTaskStatusChange}
                          showActions={true}
                          isCurrentUser={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Задания в работе */}
                {additionalTasksByStatus.IN_PROGRESS.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-600 mb-4 flex items-center gap-2">
                      <PlayCircle className="h-5 w-5" />
                      В работе ({additionalTasksByStatus.IN_PROGRESS.length})
                    </h3>
                    <div className="space-y-4">
                      {additionalTasksByStatus.IN_PROGRESS.map((task) => (
                        <AdditionalTaskCard
                          key={task.id}
                          task={task}
                          onStatusChange={handleAdditionalTaskStatusChange}
                          showActions={true}
                          isCurrentUser={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Выполненные задания (последние 5) */}
                {additionalTasksByStatus.COMPLETED.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-green-600 mb-4 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Недавно выполненные
                    </h3>
                    <div className="space-y-4">
                      {additionalTasksByStatus.COMPLETED.slice(0, 5).map((task) => (
                        <AdditionalTaskCard
                          key={task.id}
                          task={task}
                          showActions={false}
                          isCurrentUser={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
