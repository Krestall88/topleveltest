'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { UnifiedTask } from '@/lib/unified-task-system';

interface SimpleTaskListModalProps {
  isOpen: boolean;
  onClose: () => void;
  managerId: string;
  managerName: string;
  frequency: string;
  tasks: UnifiedTask[];
  onTaskComplete?: (task: UnifiedTask) => void;
}

const SimpleTaskListModal: React.FC<SimpleTaskListModalProps> = ({
  isOpen,
  onClose,
  managerId,
  managerName,
  frequency,
  tasks,
  onTaskComplete
}) => {
  const getFrequencyLabel = (freq: string) => {
    const lowerFreq = freq?.toLowerCase();
    switch (lowerFreq) {
      case 'daily': return 'Ежедневные задачи';
      case 'weekly': return 'Еженедельные задачи';
      case 'monthly': return 'Ежемесячные задачи';
      case 'quarterly': return 'Ежеквартальные задачи';
      case 'yearly': return 'Ежегодные задачи';
      case 'ежедневно': return 'Ежедневные задачи';
      case 'еженедельно': return 'Еженедельные задачи';
      case 'ежемесячно': return 'Ежемесячные задачи';
      default: return `Задачи: ${freq}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-200';
      case 'OVERDUE': return 'text-red-600 bg-red-50 border-red-200';
      case 'AVAILABLE': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'PENDING': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Выполнено';
      case 'OVERDUE': return 'Просрочено';
      case 'AVAILABLE': return 'На сегодня';
      case 'PENDING': return 'Предстоящая';
      default: return status;
    }
  };

  // Группируем задачи по статусу
  const overdueTasks = tasks.filter(task => task.status === 'OVERDUE');
  const todayTasks = tasks.filter(task => task.status === 'AVAILABLE');
  const completedTasks = tasks.filter(task => task.status === 'COMPLETED');
  const pendingTasks = tasks.filter(task => task.status === 'PENDING');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span>{getFrequencyLabel(frequency)}</span>
              <div className="text-sm font-normal text-gray-600 mt-1">
                Менеджер: {managerName} • Всего задач: {tasks.length}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overdue" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overdue" className="text-red-600">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Просроченные ({overdueTasks.length})
            </TabsTrigger>
            <TabsTrigger value="today" className="text-blue-600">
              <Clock className="h-4 w-4 mr-2" />
              Текущие ({todayTasks.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-green-600">
              <CheckCircle className="h-4 w-4 mr-2" />
              Выполненные ({completedTasks.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              Предстоящие ({pendingTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overdue" className="space-y-4 mt-4">
            {overdueTasks.length > 0 ? (
              <div className="space-y-2">
                {overdueTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onTaskComplete={onTaskComplete} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium mb-2">Нет просроченных задач</div>
                <p className="text-sm">Отличная работа! Все задачи выполняются вовремя</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="today" className="space-y-4 mt-4">
            {todayTasks.length > 0 ? (
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onTaskComplete={onTaskComplete} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium mb-2">Нет задач на сегодня</div>
                <p className="text-sm">Все текущие задачи выполнены или запланированы на другие дни</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedTasks.length > 0 ? (
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} showCompletionDetails={true} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium mb-2">Нет выполненных задач</div>
                <p className="text-sm">Выполненные задачи появятся здесь после завершения</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingTasks.length > 0 ? (
              <div className="space-y-2">
                {pendingTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium mb-2">Нет предстоящих задач</div>
                <p className="text-sm">Предстоящие задачи появятся здесь по расписанию</p>
              </div>
            )}
          </TabsContent>

          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-500 mt-4">
              <div className="text-lg font-medium mb-2">Нет задач</div>
              <p className="text-sm">Задачи появятся здесь после их создания</p>
            </div>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Компонент карточки задачи
const TaskCard: React.FC<{
  task: UnifiedTask;
  showCompletionDetails?: boolean;
  onTaskComplete?: (task: UnifiedTask) => void;
}> = ({ task, showCompletionDetails = false, onTaskComplete }) => {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-200';
      case 'OVERDUE': return 'text-red-600 bg-red-50 border-red-200';
      case 'AVAILABLE': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'PENDING': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Выполнено';
      case 'OVERDUE': return 'Просрочено';
      case 'AVAILABLE': return 'На сегодня';
      case 'PENDING': return 'Предстоящая';
      default: return status;
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-2">{task.description}</h4>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{task.objectName}</span>
            </div>
            {task.roomName && (
              <div className="flex items-center gap-1">
                <span>•</span>
                <span>{task.roomName}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(task.scheduledDate).toLocaleDateString('ru-RU')}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`${getStatusColor(task.status)} border`}>
              {getStatusLabel(task.status)}
            </Badge>
            {task.frequency && task.frequency !== 'unknown' && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{task.frequency}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 ml-4">
          {task.status !== 'COMPLETED' && onTaskComplete && (
            <Button
              size="sm"
              variant={task.status === 'OVERDUE' ? 'destructive' : 'default'}
              onClick={() => onTaskComplete(task)}
            >
              Завершить
            </Button>
          )}
        </div>
      </div>

      {/* Детали выполнения для завершенных задач */}
      {showCompletionDetails && task.status === 'COMPLETED' && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <h5 className="text-sm font-medium text-green-800 mb-2">Детали выполнения:</h5>
          
          {task.completedAt && (
            <div className="text-sm text-gray-700 mb-1">
              <strong>Выполнено:</strong> {new Date(task.completedAt).toLocaleString('ru-RU')}
            </div>
          )}
          
          {task.completedBy && (
            <div className="text-sm text-gray-700 mb-1">
              <strong>Исполнитель:</strong> {task.completedBy.name}
            </div>
          )}
          
          {task.completionComment && (
            <div className="text-sm text-gray-700 mb-1">
              <strong>Комментарий:</strong> {task.completionComment}
            </div>
          )}
          
          {task.completionPhotos && task.completionPhotos.length > 0 && (
            <div className="text-sm text-gray-700">
              <strong>Фото:</strong> {task.completionPhotos.length} шт.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleTaskListModal;
