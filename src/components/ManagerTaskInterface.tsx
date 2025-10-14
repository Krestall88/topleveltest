'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface Task {
  id: string;
  description: string;
  status: string;
  objectName?: string;
  roomName?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  timeWindow?: {
    start: string;
    end: string;
    isActive: boolean;
    isOverdue: boolean;
  };
  checklist?: {
    object?: { name: string };
    room?: { name: string };
  };
}

interface GroupedTasks {
  available: Task[];
  upcoming: Task[];
  inProgress: Task[];
  overdue: Task[];
}

interface FailureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  taskDescription: string;
}

const FailureModal = ({ isOpen, onClose, onSubmit, taskDescription }: FailureModalProps) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (reason.trim()) {
      onSubmit(reason.trim());
      setReason('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Почему не можете выполнить задачу?</h3>
        <p className="text-sm text-gray-600 mb-4">{taskDescription}</p>
        
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Укажите причину (обязательно)"
          className="w-full p-3 border rounded-lg resize-none h-24 mb-4"
          required
        />
        
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            Отправить
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
};

const TaskCard = ({ task, onAction }: { task: Task; onAction: (taskId: string, action: string, data?: any) => void }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge className="bg-green-100 text-green-800">🟢 Доступна</Badge>;
      case 'OVERDUE':
        return <Badge className="bg-red-100 text-red-800">🔴 Просрочена</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-100 text-blue-800">🔵 В работе</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">⚪ Ожидает</Badge>;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-1">{task.description}</h4>
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{task.objectName || task.checklist?.object?.name}</span>
              {(task.roomName || task.checklist?.room?.name) && (
                <>
                  <span className="mx-1">•</span>
                  <span>{task.roomName || task.checklist?.room?.name}</span>
                </>
              )}
            </div>
            {task.timeWindow && (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                <span>
                  {formatTime(task.timeWindow.start)} - {formatTime(task.timeWindow.end)}
                </span>
              </div>
            )}
          </div>
          <div className="ml-4">
            {getStatusBadge(task.status)}
          </div>
        </div>

        {/* Кнопки действий для доступных и просроченных задач */}
        {(task.status === 'AVAILABLE' || task.status === 'OVERDUE') && (
          <div className="space-y-2 mt-3">
            {task.status === 'OVERDUE' && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">
                  🟡 ПРОСРОЧЕНА - время вышло, но можно выполнить с объяснением
                </span>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={() => onAction(task.id, 'complete-with-photo')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
                size="sm"
              >
                <Camera className="w-4 h-4 mr-1" />
                📷 Выполнить с фото
              </Button>
              <Button
                onClick={() => onAction(task.id, 'complete')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                ✅ Выполнено
              </Button>
              <Button
                onClick={() => onAction(task.id, 'fail')}
                className="flex-1 bg-red-600 hover:bg-red-700 text-sm"
                size="sm"
              >
                <XCircle className="w-4 h-4 mr-1" />
                ❌ Не могу выполнить
              </Button>
            </div>
          </div>
        )}

        {/* Информация для других статусов */}
        {task.status === 'NEW' && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-gray-50 rounded">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">
              ⚪ Ожидает начала временного окна
            </span>
          </div>
        )}

        {task.status === 'IN_PROGRESS' && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-blue-50 rounded">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">
              🔵 В работе
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function ManagerTaskInterface() {
  const [tasks, setTasks] = useState<GroupedTasks>({
    available: [],
    upcoming: [],
    inProgress: [],
    overdue: []
  });
  const [loading, setLoading] = useState(true);
  const [failureModal, setFailureModal] = useState<{
    isOpen: boolean;
    taskId: string;
    taskDescription: string;
  }>({
    isOpen: false,
    taskId: '',
    taskDescription: ''
  });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks/my-current');
      const data = await response.json();
      
      if (response.ok) {
        setTasks(data.tasks);
      } else {
        console.error('Ошибка загрузки задач:', data.message);
      }
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // Обновляем задачи каждые 30 секунд
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTaskAction = async (taskId: string, action: string, data?: any) => {
    try {
      let endpoint = '';
      let method = 'POST';
      let body: any = {};

      switch (action) {
        case 'complete':
          endpoint = `/api/tasks/${taskId}/complete`;
          body = { status: 'COMPLETED' };
          break;
        case 'complete-with-photo':
          endpoint = `/api/tasks/${taskId}/complete`;
          body = { status: 'CLOSED_WITH_PHOTO' };
          break;
        case 'fail':
          const task = [...tasks.available, ...tasks.overdue].find(t => t.id === taskId);
          if (task) {
            setFailureModal({
              isOpen: true,
              taskId,
              taskDescription: task.description
            });
          }
          return;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchTasks(); // Обновляем список задач
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Ошибка выполнения действия:', error);
      alert('Произошла ошибка при выполнении действия');
    }
  };

  const handleFailureSubmit = async (reason: string) => {
    try {
      const response = await fetch(`/api/tasks/${failureModal.taskId}/fail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureReason: reason })
      });

      if (response.ok) {
        await fetchTasks();
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Ошибка отправки причины:', error);
      alert('Произошла ошибка при отправке причины');
    }
  };

  const totalTasks = tasks.available.length + tasks.upcoming.length + tasks.inProgress.length + tasks.overdue.length;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Загрузка задач...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и статистика */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Мои задачи</h1>
        <div className="flex gap-4">
          <Badge variant="outline" className="text-green-600">
            Доступно: {tasks.available.length}
          </Badge>
          <Badge variant="outline" className="text-red-600">
            Просрочено: {tasks.overdue.length}
          </Badge>
          <Button onClick={fetchTasks} size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-1" />
            Обновить
          </Button>
        </div>
      </div>

      {totalTasks === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium mb-2">Все задачи выполнены!</h3>
            <p className="text-gray-600">У вас нет активных задач на данный момент.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Критические просроченные задачи - показываем первыми */}
          {tasks.overdue.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-red-700 bg-red-50 p-3 rounded">
                🚨 КРИТИЧЕСКИЕ ПРОСРОЧКИ ({tasks.overdue.length})
                <span className="text-sm font-normal ml-2">- требуется объяснение</span>
              </h2>
              {tasks.overdue.map(task => (
                <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
              ))}
            </div>
          )}

          {/* Доступные задачи - основной фокус */}
          {tasks.available.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-green-700 bg-green-50 p-3 rounded">
                🟢 ДОСТУПНЫ СЕЙЧАС ({tasks.available.length})
                <span className="text-sm font-normal ml-2">- можно выполнить</span>
              </h2>
              {tasks.available.map(task => (
                <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
              ))}
            </div>
          )}

          {/* Задачи в работе */}
          {tasks.inProgress.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-blue-700">
                🔵 В работе ({tasks.inProgress.length})
              </h2>
              {tasks.inProgress.map(task => (
                <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
              ))}
            </div>
          )}

          {/* Предстоящие задачи - показываем последними */}
          {tasks.upcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-700">
                ⚪ Предстоящие ({tasks.upcoming.length})
                <span className="text-sm font-normal ml-2">- ожидают временного окна</span>
              </h2>
              {tasks.upcoming.map(task => (
                <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Модальное окно для причины невыполнения */}
      <FailureModal
        isOpen={failureModal.isOpen}
        onClose={() => setFailureModal({ isOpen: false, taskId: '', taskDescription: '' })}
        onSubmit={handleFailureSubmit}
        taskDescription={failureModal.taskDescription}
      />
    </div>
  );
}
