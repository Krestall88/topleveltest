'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Camera, CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react';
import TaskReportModal from './TaskReportModal';

interface Task {
  id: string;
  description: string;
  status: string;
  objectName?: string;
  roomName?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  checklist?: {
    id: string;
    date: string;
    object: {
      id: string;
      name: string;
      requirePhotoForCompletion: boolean;
    };
  };
}

interface MobileManagerInterfaceProps {
  userId: string;
}

export default function MobileManagerInterface({ userId }: MobileManagerInterfaceProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Автообновление каждые 30 секунд
  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      setError(null);
      const response = await fetch('/api/tasks/my-current');
      
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
        setLastUpdate(new Date());
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Ошибка при загрузке задач');
      }
    } catch (error) {
      console.error('Ошибка при загрузке задач:', error);
      setError('Ошибка при загрузке задач');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string, data: { comment?: string; photos?: string[] }) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete-with-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchTasks(); // Обновить список задач
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при завершении задачи');
      }
    } catch (error) {
      console.error('Ошибка при завершении задачи:', error);
      throw error;
    }
  };

  const handleQuickComplete = async (task: Task) => {
    const requirePhoto = task.checklist?.object.requirePhotoForCompletion || false;
    
    if (requirePhoto) {
      // Открыть модальное окно для обязательного фото
      setSelectedTask(task);
      setShowReportModal(true);
    } else {
      // Быстрое завершение без фото
      try {
        await handleCompleteTask(task.id, {});
      } catch (error) {
        setError('Ошибка при завершении задачи');
      }
    }
  };

  const handleCompleteWithReport = (task: Task) => {
    setSelectedTask(task);
    setShowReportModal(true);
  };

  // Группировка задач по статусам
  const availableTasks = tasks.filter(task => task.status === 'AVAILABLE');
  const inProgressTasks = tasks.filter(task => task.status === 'IN_PROGRESS');
  const overdueTasks = tasks.filter(task => task.status === 'OVERDUE');
  const upcomingTasks = tasks.filter(task => task.status === 'NEW');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      case 'NEW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'Доступна';
      case 'IN_PROGRESS': return 'В работе';
      case 'OVERDUE': return 'Просрочена';
      case 'NEW': return 'Предстоящая';
      default: return status;
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const requirePhoto = task.checklist?.object.requirePhotoForCompletion || false;
    
    return (
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Заголовок и статус */}
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-2">
                <div className="font-medium text-sm mb-1">{task.description}</div>
                <div className="text-xs text-gray-600">
                  {task.objectName}
                  {task.roomName && ` • ${task.roomName}`}
                </div>
              </div>
              <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                {getStatusText(task.status)}
              </Badge>
            </div>

            {/* Время выполнения */}
            {(task.scheduledStart || task.scheduledEnd) && (
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                {task.scheduledStart && formatTime(task.scheduledStart)}
                {task.scheduledStart && task.scheduledEnd && ' - '}
                {task.scheduledEnd && formatTime(task.scheduledEnd)}
              </div>
            )}

            {/* Индикаторы */}
            <div className="flex items-center space-x-2">
              {requirePhoto && (
                <Badge variant="outline" className="text-xs">
                  <Camera className="w-3 h-3 mr-1" />
                  Фото обязательно
                </Badge>
              )}
              {task.status === 'OVERDUE' && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Просрочена
                </Badge>
              )}
            </div>

            {/* Кнопки действий */}
            {(task.status === 'AVAILABLE' || task.status === 'IN_PROGRESS' || task.status === 'OVERDUE') && (
              <div className="flex space-x-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCompleteWithReport(task)}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-1" />
                  С отчетом
                </Button>
                {!requirePhoto && (
                  <Button
                    size="sm"
                    onClick={() => handleQuickComplete(task)}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Выполнено
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
          <div className="text-gray-600">Загрузка задач...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Мои задачи</h1>
            <div className="text-xs text-gray-500">
              Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchTasks}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Статистика */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{availableTasks.length}</div>
              <div className="text-xs text-gray-600">Доступно</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
              <div className="text-xs text-gray-600">Просрочено</div>
            </CardContent>
          </Card>
        </div>

        {/* Вкладки с задачами */}
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="available" className="text-xs">
              Доступные ({availableTasks.length})
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-xs">
              В работе ({inProgressTasks.length})
            </TabsTrigger>
            <TabsTrigger value="overdue" className="text-xs">
              Просрочено ({overdueTasks.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs">
              Предстоящие ({upcomingTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-4">
            {availableTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <div>Нет доступных задач</div>
                </CardContent>
              </Card>
            ) : (
              availableTasks.map(task => <TaskCard key={task.id} task={task} />)
            )}
          </TabsContent>

          <TabsContent value="progress" className="mt-4">
            {inProgressTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <div>Нет задач в работе</div>
                </CardContent>
              </Card>
            ) : (
              inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)
            )}
          </TabsContent>

          <TabsContent value="overdue" className="mt-4">
            {overdueTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-300" />
                  <div>Нет просроченных задач</div>
                </CardContent>
              </Card>
            ) : (
              overdueTasks.map(task => <TaskCard key={task.id} task={task} />)
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-4">
            {upcomingTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <div>Нет предстоящих задач</div>
                </CardContent>
              </Card>
            ) : (
              upcomingTasks.map(task => <TaskCard key={task.id} task={task} />)
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Модальное окно отчета */}
      <TaskReportModal
        task={selectedTask}
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedTask(null);
        }}
        onComplete={handleCompleteTask}
        requirePhoto={selectedTask?.checklist?.object.requirePhotoForCompletion}
      />
    </div>
  );
}
