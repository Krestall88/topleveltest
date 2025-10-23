'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarTask, TaskGroup, groupTasksByPriority, groupTasksByFrequency, formatTaskTime, formatTaskDate, getStatusColor, getStatusIcon } from '@/lib/task-calendar-utils';
import { Camera, MessageSquare, CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react';

interface TaskCalendarViewProps {
  managerId?: string;
  objectId?: string;
  date?: Date;
  view?: 'day' | 'week' | 'month';
  onTaskComplete?: () => void;
}

interface ExecuteTaskModalProps {
  task: CalendarTask | null;
  isOpen: boolean;
  onClose: () => void;
  onExecute: (taskId: string, status: 'COMPLETED' | 'SKIPPED', comment?: string, photos?: string[]) => void;
}

function ExecuteTaskModal({ task, isOpen, onClose, onExecute }: ExecuteTaskModalProps) {
  const [status, setStatus] = useState<'COMPLETED' | 'SKIPPED'>('COMPLETED');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!task) return;
    
    if (status === 'SKIPPED' && !comment.trim()) {
      alert('Комментарий обязателен при пропуске задачи');
      return;
    }

    setLoading(true);
    try {
      await onExecute(task.id, status, comment.trim() || undefined, photos.length > 0 ? photos : undefined);
      onClose();
      setComment('');
      setPhotos([]);
      setStatus('COMPLETED');
    } catch (error) {
      console.error('Ошибка выполнения задачи:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Выполнение задачи</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm">{task.techCard.name}</h4>
            <p className="text-xs text-gray-600">{task.object.name}</p>
            <p className="text-xs text-gray-500">
              {formatTaskDate(task.scheduledFor)} {formatTaskTime(task.scheduledFor, task.dueDate)}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={status === 'COMPLETED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus('COMPLETED')}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Выполнено
            </Button>
            <Button
              variant={status === 'SKIPPED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus('SKIPPED')}
              className="flex-1"
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Пропустить
            </Button>
          </div>

          {(status === 'SKIPPED' || status === 'COMPLETED') && (
            <div>
              <Label htmlFor="comment">
                Комментарий {status === 'SKIPPED' && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={status === 'SKIPPED' ? 'Укажите причину пропуска...' : 'Дополнительные заметки...'}
                rows={3}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskCard({ task, onExecute }: { task: CalendarTask; onExecute: (task: CalendarTask) => void }) {
  const statusColor = getStatusColor(task.status);
  const statusIcon = getStatusIcon(task.status);

  return (
    <Card className={`mb-3 border-l-4 ${task.status === 'OVERDUE' ? 'border-l-red-500' : task.status === 'PENDING' ? 'border-l-orange-500' : 'border-l-blue-500'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{statusIcon}</span>
              <h4 className="font-medium text-sm">{task.techCard.name}</h4>
              <Badge variant="outline" className={`text-xs ${statusColor}`}>
                {task.status === 'OVERDUE' ? 'Просрочено' : 
                 task.status === 'PENDING' ? 'К выполнению' : 
                 task.status === 'COMPLETED' ? 'Выполнено' : 'Предстоящее'}
              </Badge>
            </div>
            
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex items-center gap-1">
                <span>📍</span>
                <span>{task.object.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTaskTime(task.scheduledFor, task.dueDate)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🔄</span>
                <span>{task.techCard.frequency}</span>
              </div>
            </div>

            {task.techCard.description && (
              <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                {task.techCard.description}
              </p>
            )}
          </div>

          {task.status !== 'COMPLETED' && (
            <div className="flex flex-col gap-1 ml-3">
              <Button
                size="sm"
                onClick={() => onExecute(task)}
                className="text-xs px-2 py-1 h-auto"
              >
                <Camera className="h-3 w-3 mr-1" />
                С отчетом
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onExecute(task)}
                className="text-xs px-2 py-1 h-auto"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Выполнено
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskGroup({ group, onExecute }: { group: TaskGroup; onExecute: (task: CalendarTask) => void }) {
  if (group.count === 0) return null;

  const getPriorityColor = (priority: TaskGroup['priority']) => {
    switch (priority) {
      case 'overdue': return 'text-red-600';
      case 'today': return 'text-orange-600';
      case 'weekly': return 'text-blue-600';
      case 'monthly': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityIcon = (priority: TaskGroup['priority']) => {
    switch (priority) {
      case 'overdue': return '🔥';
      case 'today': return '⚡';
      case 'weekly': return '📅';
      case 'monthly': return '📆';
      default: return '📋';
    }
  };

  return (
    <div className="mb-6">
      <div className={`flex items-center gap-2 mb-3 ${getPriorityColor(group.priority)}`}>
        <span className="text-lg">{getPriorityIcon(group.priority)}</span>
        <h3 className="font-semibold text-lg">{group.title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {group.count}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {group.tasks.map((task) => (
          <TaskCard key={task.id} task={task} onExecute={onExecute} />
        ))}
      </div>
    </div>
  );
}

export default function TaskCalendarView({ 
  managerId, 
  objectId, 
  date = new Date(), 
  view = 'day',
  onTaskComplete 
}: TaskCalendarViewProps) {
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('priority');

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: date.toISOString().split('T')[0],
        view
      });
      
      if (managerId) params.append('managerId', managerId);
      if (objectId) params.append('objectId', objectId);

      const response = await fetch(`/api/tasks/calendar?${params}`);
      if (response.ok) {
        const data = await response.json();
        const allTasks = [
          ...data.overdue,
          ...data.today,
          ...data.upcoming,
          ...data.weekly,
          ...data.monthly
        ];
        setTasks(allTasks);
      }
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [managerId, objectId, date, view]);

  const handleExecuteTask = async (taskId: string, status: 'COMPLETED' | 'SKIPPED', comment?: string, photos?: string[]) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const response = await fetch('/api/tasks/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          techCardId: task.techCard.id,
          objectId: task.object.id,
          scheduledFor: task.scheduledFor.toISOString(),
          status,
          comment,
          photos
        })
      });

      if (response.ok) {
        await loadTasks(); // Перезагружаем задачи
        onTaskComplete?.();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка выполнения задачи');
      }
    } catch (error) {
      console.error('Ошибка выполнения задачи:', error);
      alert('Ошибка выполнения задачи');
    }
  };

  const openExecuteModal = (task: CalendarTask) => {
    setSelectedTask(task);
    setExecuteModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Загрузка задач...</p>
        </div>
      </div>
    );
  }

  const priorityGroups = groupTasksByPriority(tasks);
  const frequencyGroups = groupTasksByFrequency(tasks);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Календарь задач</h2>
          <p className="text-sm text-gray-600">
            {formatTaskDate(date)} • Всего задач: {tasks.length}
          </p>
        </div>
        <Button onClick={loadTasks} variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-1" />
          Обновить
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="priority">По приоритету</TabsTrigger>
          <TabsTrigger value="frequency">По периодичности</TabsTrigger>
        </TabsList>

        <TabsContent value="priority" className="mt-6">
          {priorityGroups.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Нет задач на выбранную дату</p>
              </CardContent>
            </Card>
          ) : (
            priorityGroups.map((group) => (
              <TaskGroup key={group.title} group={group} onExecute={openExecuteModal} />
            ))
          )}
        </TabsContent>

        <TabsContent value="frequency" className="mt-6">
          {frequencyGroups.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Нет задач на выбранную дату</p>
              </CardContent>
            </Card>
          ) : (
            frequencyGroups.map((group) => (
              <TaskGroup key={group.title} group={group} onExecute={openExecuteModal} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <ExecuteTaskModal
        task={selectedTask}
        isOpen={executeModalOpen}
        onClose={() => setExecuteModalOpen(false)}
        onExecute={handleExecuteTask}
      />
    </div>
  );
}
