'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Camera, 
  MessageSquare, 
  X,
  Upload,
  Eye,
  Calendar
} from 'lucide-react';

interface ManagerTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  manager: {
    id: string;
    name: string;
  };
  tasks: any[];
  onTaskComplete: (taskId: string, data: any) => void;
}

interface TaskCompletionData {
  type: 'simple' | 'comment' | 'photo';
  comment?: string;
  photos?: File[];
}

export default function ManagerTasksModal({ 
  isOpen, 
  onClose, 
  manager, 
  tasks, 
  onTaskComplete 
}: ManagerTasksModalProps) {
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [completionType, setCompletionType] = useState<'simple' | 'comment' | 'photo'>('simple');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);

  // Группируем задачи по статусам
  const overdueTasks = tasks.filter(task => task.status === 'OVERDUE');
  const todayTasks = tasks.filter(task => task.status === 'TODAY');
  const upcomingTasks = tasks.filter(task => task.status === 'UPCOMING');
  const completedTasks = tasks.filter(task => task.status === 'COMPLETED');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleTaskCompletion = async () => {
    if (!selectedTask) return;

    setIsCompleting(true);
    try {
      const completionData: TaskCompletionData = {
        type: completionType,
        comment: completionType === 'comment' ? comment : undefined,
        photos: completionType === 'photo' ? photos : undefined
      };

      await onTaskComplete(selectedTask.id, completionData);
      
      // Сброс формы
      setSelectedTask(null);
      setComment('');
      setPhotos([]);
      setCompletionType('simple');
      
    } catch (error) {
      console.error('Ошибка выполнения задачи:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const TaskCard = ({ task, showActions = true }: { task: any; showActions?: boolean }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-sm">{task.techCard?.name || 'Задача'}</h4>
            <p className="text-xs text-gray-600 mt-1">{task.object.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              Запланировано: {new Date(task.scheduledFor).toLocaleString('ru-RU')}
            </p>
            {task.comment && (
              <p className="text-xs text-blue-600 mt-1 italic">💬 {task.comment}</p>
            )}
            {task.photos && task.photos.length > 0 && (
              <p className="text-xs text-green-600 mt-1">📷 {task.photos.length} фото</p>
            )}
          </div>
          
          {showActions && task.status !== 'COMPLETED' && (
            <div className="flex gap-1 ml-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedTask(task);
                  setCompletionType('simple');
                }}
                className="h-8 w-8 p-0"
                title="Быстрое выполнение"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedTask(task);
                  setCompletionType('comment');
                }}
                className="h-8 w-8 p-0"
                title="Выполнить с комментарием"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedTask(task);
                  setCompletionType('photo');
                }}
                className="h-8 w-8 p-0"
                title="Выполнить с фотоотчетом"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {/* Основное модальное окно со списком задач */}
      <Dialog open={isOpen && !selectedTask} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              👤 Задачи менеджера: {manager.name}
              <Badge variant="outline">{tasks.length} задач</Badge>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="overdue" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overdue" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Просрочено ({overdueTasks.length})
              </TabsTrigger>
              <TabsTrigger value="today" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Сегодня ({todayTasks.length})
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Предстоящие ({upcomingTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Выполнено ({completedTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overdue" className="mt-4">
              <div className="space-y-2">
                {overdueTasks.length > 0 ? (
                  overdueTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">Нет просроченных задач</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="today" className="mt-4">
              <div className="space-y-2">
                {todayTasks.length > 0 ? (
                  todayTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">Нет задач на сегодня</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="upcoming" className="mt-4">
              <div className="space-y-2">
                {upcomingTasks.length > 0 ? (
                  upcomingTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">Нет предстоящих задач</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <div className="space-y-2">
                {completedTasks.length > 0 ? (
                  completedTasks.map(task => (
                    <TaskCard key={task.id} task={task} showActions={false} />
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">Нет выполненных задач</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Модальное окно выполнения задачи */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Выполнение задачи
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTask(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-medium">{selectedTask.techCard?.name}</h4>
                <p className="text-sm text-gray-600">{selectedTask.object.name}</p>
              </div>

              {completionType === 'simple' && (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p>Отметить задачу как выполненную?</p>
                </div>
              )}

              {completionType === 'comment' && (
                <div className="space-y-2">
                  <Label htmlFor="comment">Комментарий к выполнению</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Опишите как была выполнена задача..."
                    rows={3}
                  />
                </div>
              )}

              {completionType === 'photo' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="photos">Фотоотчет</Label>
                    <Input
                      id="photos"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="mt-1"
                    />
                  </div>

                  {photos.length > 0 && (
                    <div className="space-y-2">
                      <Label>Выбранные фото ({photos.length})</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {photos.map((photo, index) => (
                          <div key={index} className="relative">
                            <div className="aspect-square bg-gray-100 rounded border flex items-center justify-center">
                              <Camera className="h-8 w-8 text-gray-400" />
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-6 w-6 p-0"
                              onClick={() => removePhoto(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <p className="text-xs text-center mt-1 truncate">
                              {photo.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="photoComment">Комментарий к фото (необязательно)</Label>
                    <Textarea
                      id="photoComment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Дополнительные пояснения к фотоотчету..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleTaskCompletion}
                  disabled={isCompleting || (completionType === 'photo' && photos.length === 0)}
                  className="flex-1"
                >
                  {isCompleting ? 'Выполняется...' : 'Выполнить задачу'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTask(null)}
                  disabled={isCompleting}
                >
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
