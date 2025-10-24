'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Building2,
  Home,
  MapPin,
  Camera,
  FileText,
  Eye,
  Settings
} from 'lucide-react';
import TaskLocationBreadcrumb from './TaskLocationBreadcrumb';
import TaskCompletionModal from './TaskCompletionModal';
import TaskCommentsDialog from './TaskCommentsDialog';

interface PeriodTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  managerId: string;
  managerName: string;
  frequency: string;
  tasks: any[];
  onAddComment: (taskId: string, comment: string, type: string) => void;
  userRole?: string;
  onTaskAction?: (taskId: string, action: string) => void;
  onOpenTaskDetail?: (taskId: string) => void;
  onTaskUpdate?: (completedTask?: any) => void;
  onTaskCompletion?: (task: any) => void;
}

const PeriodTasksModal: React.FC<PeriodTasksModalProps> = ({
  isOpen,
  onClose,
  managerId,
  managerName,
  frequency,
  tasks,
  onAddComment,
  userRole,
  onTaskAction,
  onOpenTaskDetail,
  onTaskUpdate,
  onTaskCompletion
}) => {
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState('admin_note');
  const [taskCompletionModal, setTaskCompletionModalState] = useState<any>(null);
  
  // 🔥 ЛОКАЛЬНОЕ СОСТОЯНИЕ ЗАДАЧ - обновляется при завершении
  const [localTasks, setLocalTasks] = useState<any[]>(tasks);
  
  // Обновляем локальные задачи при изменении пропса tasks
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);
  
  const setTaskCompletionModal = (task: any) => {
    setTaskCompletionModalState(task);
  };
  const [commentsDialog, setCommentsDialog] = useState<{taskId: string, description: string} | null>(null);

  const getFrequencyLabel = (freq: string) => {
    const lowerFreq = freq?.toLowerCase();
    switch (lowerFreq) {
      case 'daily': return 'Ежедневные задачи';
      case 'weekly': return 'Еженедельные задачи';
      case 'monthly': return 'Ежемесячные задачи';
      case 'quarterly': return 'Ежеквартальные задачи';
      case 'yearly': return 'Ежегодные задачи';
      case 'annual': return 'Ежегодные задачи';
      case 'biweekly': return 'Задачи раз в две недели';
      case 'bimonthly': return 'Задачи раз в два месяца';
      case 'semiannual': return 'Полугодовые задачи';
      case 'hourly': return 'Ежечасные задачи';
      case 'minute': return 'Поминутные задачи';
      case 'once': return 'Однократные задачи';
      case 'as_needed': return 'Задачи по необходимости';
      case 'on_demand': return 'Задачи по требованию';
      default: return `Задачи: ${freq}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50';
      case 'OVERDUE': return 'text-red-600 bg-red-50';
      case 'TODAY': return 'text-blue-600 bg-blue-50';
      case 'AVAILABLE': return 'text-blue-600 bg-blue-50';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Выполнено';
      case 'OVERDUE': return 'Просрочено';
      case 'TODAY': return 'На сегодня';
      case 'AVAILABLE': return 'Доступно';
      case 'IN_PROGRESS': return 'В работе';
      case 'PENDING': return 'Ожидает';
      case 'NEW': return 'Новая';
      case 'UPCOMING': return 'Предстоящая';
      default: return status;
    }
  };

  const handleAddComment = async () => {
    if (selectedTask && commentText.trim()) {
      try {
        const response = await fetch(`/api/tasks/${selectedTask.id}/admin-comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            content: commentText,
            type: commentType
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Комментарий добавлен:', result);
          
          // Вызываем callback если есть
          if (onAddComment) {
            onAddComment(selectedTask.id, commentText, commentType);
          }
          
          // Очищаем форму
          setCommentText('');
          setSelectedTask(null);
          
          // Показываем уведомление об успехе
          alert('Комментарий успешно добавлен!');
        } else {
          const error = await response.json();
          console.error('Ошибка добавления комментария:', error);
          alert(`Ошибка: ${error.message || 'Не удалось добавить комментарий'}`);
        }
      } catch (error) {
        console.error('Ошибка сети:', error);
        alert('Ошибка сети. Проверьте подключение к интернету.');
      }
    }
  };

  // Группируем задачи по статусу
  const overdueTasks = localTasks.filter(task => task.status === 'OVERDUE');
  const todayTasks = localTasks.filter(task => task.status === 'TODAY' || task.status === 'AVAILABLE');
  const completedTasks = localTasks.filter(task => task.status === 'COMPLETED');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span>{getFrequencyLabel(frequency)}</span>
              <div className="text-sm font-normal text-gray-600 mt-1">
                Менеджер: {managerName} • Всего задач: {localTasks.length}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overdue" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overdue">Просрочено ({overdueTasks.length})</TabsTrigger>
            <TabsTrigger value="today">Текущие ({todayTasks.length})</TabsTrigger>
            <TabsTrigger value="completed">Выполнено ({completedTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overdue" className="space-y-4">
            {overdueTasks.map((task: any) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onSelectForComment={setSelectedTask}
                selectedTask={selectedTask}
                userRole={userRole}
                onTaskAction={onTaskAction}
                onTaskCompletion={setTaskCompletionModal}
                onOpenTaskDetail={onOpenTaskDetail}
                onOpenComments={(task) => setCommentsDialog({taskId: task.id, description: task.description})}
              />
            ))}
          </TabsContent>

          <TabsContent value="today" className="space-y-4">
            {todayTasks.map((task: any) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onSelectForComment={setSelectedTask}
                selectedTask={selectedTask}
                userRole={userRole}
                onTaskAction={onTaskAction}
                onTaskCompletion={setTaskCompletionModal}
                onOpenTaskDetail={onOpenTaskDetail}
                onOpenComments={(task) => setCommentsDialog({taskId: task.id, description: task.description})}
              />
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedTasks.map((task: any) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onSelectForComment={setSelectedTask}
                selectedTask={selectedTask}
                showCompletionDetails={true}
                userRole={userRole}
                onTaskAction={onTaskAction}
                onTaskCompletion={setTaskCompletionModal}
                onOpenTaskDetail={onOpenTaskDetail}
                onOpenComments={(task) => setCommentsDialog({taskId: task.id, description: task.description})}
              />
            ))}
          </TabsContent>
        </Tabs>


        {/* Модальное окно завершения задачи */}
        {taskCompletionModal && (
          <TaskCompletionModal
            task={taskCompletionModal}
            isOpen={!!taskCompletionModal}
            onClose={() => setTaskCompletionModalState(null)}
            onComplete={(completedTask) => {
              console.log('🔍 ДИАГНОСТИКА: PeriodTasksModal получил completedTask:', completedTask);
              setTaskCompletionModalState(null);
              
              // 🔥 ОБНОВЛЯЕМ ЛОКАЛЬНОЕ СОСТОЯНИЕ ЗАДАЧ
              setLocalTasks(prevTasks => 
                prevTasks.map(task => 
                  task.id === completedTask.id 
                    ? {
                        ...task,
                        ...completedTask,
                        status: 'COMPLETED',
                        completionComment: completedTask.completionComment,
                        completionPhotos: completedTask.completionPhotos || [],
                        completedAt: completedTask.completedAt,
                        completedBy: completedTask.completedBy || { name: 'Текущий пользователь' }
                      }
                    : task
                )
              );
              
              // Передаем данные о завершенной задаче для мгновенного обновления
              console.log('🔍 ДИАГНОСТИКА: Вызываем onTaskUpdate с:', completedTask);
              onTaskUpdate && onTaskUpdate(completedTask);
            }}
          />
        )}

        {/* Диалог комментариев */}
        {commentsDialog && (
          <TaskCommentsDialog
            isOpen={!!commentsDialog}
            onClose={() => setCommentsDialog(null)}
            taskId={commentsDialog.taskId}
            taskDescription={commentsDialog.description}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

// Компонент карточки задачи
const TaskCard: React.FC<{
  task: any;
  onSelectForComment: (task: any) => void;
  selectedTask: any;
  showCompletionDetails?: boolean;
  userRole?: string;
  onTaskAction?: (taskId: string, action: string) => void;
  onTaskCompletion?: (task: any) => void;
  onOpenTaskDetail?: (taskId: string) => void;
  onOpenComments?: (task: any) => void;
}> = ({ task, onSelectForComment, selectedTask, showCompletionDetails = false, userRole, onTaskAction, onTaskCompletion, onOpenTaskDetail, onOpenComments }) => {
  
  // Логируем данные для отладки
  console.log('TaskCard data:', {
    taskId: task.id,
    userRole: userRole,
    taskStatus: task.status,
    showAdminButton: ['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(userRole || ''),
    showManagerButtons: userRole === 'MANAGER' && task.status !== 'COMPLETED'
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-200';
      case 'OVERDUE': return 'text-red-600 bg-red-50 border-red-200';
      case 'TODAY': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'AVAILABLE': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Выполнено';
      case 'OVERDUE': return 'Просрочено';
      case 'TODAY': return 'На сегодня';
      case 'AVAILABLE': return 'Доступно';
      case 'IN_PROGRESS': return 'В работе';
      case 'PENDING': return 'Ожидает';
      case 'NEW': return 'Новая';
      case 'UPCOMING': return 'Предстоящая';
      default: return status;
    }
  };

  return (
    <div className={`p-4 border rounded-lg ${selectedTask?.id === task.id ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-2">{task.description}</h4>
          
          {/* Иерархия местоположения */}
          <TaskLocationBreadcrumb task={task} showFullPath={true} compact={true} />
          
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`${getStatusColor(task.status)} border`}>
              {getStatusLabel(task.status)}
            </Badge>
            {task.scheduledFor && (
              <span className="text-xs text-gray-500">
                {new Date(task.scheduledFor).toLocaleDateString('ru-RU')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 ml-4">
          {/* Кнопка комментариев для всех */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenComments && onOpenComments(task)}
            className="text-blue-600 hover:bg-blue-50"
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Комментарии
          </Button>

          {/* Кнопки для администратора */}
          {(['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(userRole || '')) && (
            <>
              {/* Администратор может закрывать задачи как менеджер */}
              {task.status !== 'COMPLETED' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (onTaskCompletion) {
                        onTaskCompletion(task);
                      }
                    }}
                    className="text-green-600 hover:bg-green-50"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Завершить как менеджер
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenTaskDetail && onOpenTaskDetail(task.id)}
                    className="text-purple-600 hover:bg-purple-50"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Детали с комментариями
                  </Button>
                </>
              )}
            </>
          )}
          
          {/* Кнопки для менеджера */}
          {(userRole === 'MANAGER' && task.status !== 'COMPLETED') && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTaskCompletion && onTaskCompletion(task)}
                className="text-green-600 hover:bg-green-50"
              >
                <Settings className="w-4 h-4 mr-1" />
                Завершить
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTaskAction && onTaskAction(task.id, 'view')}
                className="text-blue-600 hover:bg-blue-50"
              >
                <Eye className="w-4 h-4 mr-1" />
                Открыть
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Детали выполнения для завершенных задач */}
      {showCompletionDetails && task.status === 'COMPLETED' && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <h5 className="text-sm font-medium text-green-800 mb-2">Детали выполнения:</h5>
          
          {task.completionComment && (
            <div className="mb-2">
              <div className="flex items-center gap-1 mb-1">
                <FileText className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-700">Комментарий:</span>
              </div>
              <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                {task.completionComment}
              </p>
            </div>
          )}
          
          {task.completionPhotos && task.completionPhotos.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Camera className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-700">
                  Фото ({task.completionPhotos.length}):
                </span>
              </div>
              <div className="flex gap-2">
                {task.completionPhotos.slice(0, 3).map((photo: string, index: number) => (
                  <div key={index} className="w-16 h-16 bg-gray-200 rounded border">
                    <img 
                      src={photo} 
                      alt={`Фото ${index + 1}`}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                ))}
                {task.completionPhotos.length > 3 && (
                  <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                    <span className="text-xs text-gray-600">+{task.completionPhotos.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PeriodTasksModal;
