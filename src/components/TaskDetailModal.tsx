'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Clock, 
  User, 
  MessageSquare, 
  Camera, 
  Plus,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  Home,
  Layers
} from 'lucide-react';
import Image from 'next/image';
import { TaskDetails, formatTaskLocation, getTaskStatusIcon, getTaskStatusColor } from '@/lib/task-details-utils';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  onTaskUpdate?: () => void;
}

export default function TaskDetailModal({ isOpen, onClose, taskId, onTaskUpdate }: TaskDetailModalProps) {
  const [task, setTask] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'admin_note' | 'completion_reason' | 'feedback'>('admin_note');
  const [addingComment, setAddingComment] = useState(false);
  const [photoGalleryOpen, setPhotoGalleryOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Загрузка деталей задачи
  const loadTaskDetails = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks/${taskId}/details`);
      if (response.ok) {
        const data = await response.json();
        setTask(data);
      } else {
        console.error('Ошибка загрузки деталей задачи');
      }
    } catch (error) {
      console.error('Ошибка загрузки деталей задачи:', error);
    } finally {
      setLoading(false);
    }
  };

  // Добавление комментария администратора
  const handleAddComment = async () => {
    if (!taskId || !newComment.trim()) return;

    try {
      setAddingComment(true);
      const response = await fetch(`/api/tasks/${taskId}/admin-comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
          type: commentType
        }),
      });

      if (response.ok) {
        setNewComment('');
        loadTaskDetails(); // Перезагружаем детали
        onTaskUpdate?.(); // Уведомляем родительский компонент
      } else {
        console.error('Ошибка добавления комментария');
      }
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
    } finally {
      setAddingComment(false);
    }
  };

  // Открытие галереи фотографий
  const openPhotoGallery = (index: number = 0) => {
    setCurrentPhotoIndex(index);
    setPhotoGalleryOpen(true);
  };

  // Навигация по фотографиям
  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!task?.completionPhotos) return;
    
    if (direction === 'prev') {
      setCurrentPhotoIndex(prev => 
        prev > 0 ? prev - 1 : task.completionPhotos!.length - 1
      );
    } else {
      setCurrentPhotoIndex(prev => 
        prev < task.completionPhotos!.length - 1 ? prev + 1 : 0
      );
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
    }
  }, [isOpen, taskId]);

  if (!isOpen || !taskId) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{task ? getTaskStatusIcon(task.status, task.completionType) : '📋'}</span>
              Детали задачи
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : task ? (
            <div className="space-y-6">
              {/* Основная информация */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{task.description}</span>
                    <Badge className={getTaskStatusColor(task.status)}>
                      {task.status === 'COMPLETED' ? 'Выполнено' : 
                       task.status === 'OVERDUE' ? 'Просрочено' :
                       task.status === 'IN_PROGRESS' ? 'В работе' : 
                       task.status === 'FAILED' ? 'Не выполнено' : 'Новая'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Местоположение */}
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Местоположение:</p>
                      <div className="text-sm text-gray-600 space-y-1">
                        {task.object && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>Объект: {task.object.name}</span>
                          </div>
                        )}
                        {task.site && (
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            <span>Участок: {task.site.name}</span>
                          </div>
                        )}
                        {task.zone && (
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            <span>Зона: {task.zone.name}</span>
                          </div>
                        )}
                        {task.room && (
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4" />
                            <span>Помещение: {task.room.name} ({task.room.area} м²)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Техкарта */}
                  {task.techCard && (
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Техническая карта:</p>
                        <div className="text-sm text-gray-600">
                          <p><strong>Название:</strong> {task.techCard.name}</p>
                          <p><strong>Тип работ:</strong> {task.techCard.workType}</p>
                          <p><strong>Периодичность:</strong> {task.techCard.frequency}</p>
                          {task.techCard.description && (
                            <p><strong>Описание:</strong> {task.techCard.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Информация о выполнении */}
                  {task.status === 'COMPLETED' && task.completedBy && (
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Выполнено:</p>
                        <div className="text-sm text-gray-600">
                          <p><strong>Исполнитель:</strong> {task.completedBy.name}</p>
                          {task.completedAt && (
                            <p><strong>Время:</strong> {new Date(task.completedAt).toLocaleString('ru-RU')}</p>
                          )}
                          {task.completionType && (
                            <p><strong>Тип завершения:</strong> 
                              {task.completionType === 'photo' ? ' С фотоотчетом' :
                               task.completionType === 'comment' ? ' С комментарием' : ' Простое'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Комментарий при выполнении */}
              {task.completionComment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Комментарий при выполнении</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{task.completionComment}</p>
                  </CardContent>
                </Card>
              )}

              {/* Фотоотчеты */}
              {task.completionPhotos && task.completionPhotos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Фотоотчеты ({task.completionPhotos.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {task.completionPhotos.map((photo, index) => (
                        <div 
                          key={index}
                          className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => openPhotoGallery(index)}
                        >
                          <Image
                            src={photo}
                            alt={`Фото ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 transition-all">
                            <Eye className="h-6 w-6 text-white opacity-0 hover:opacity-100" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Комментарии администраторов */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Комментарии администраторов</span>
                    <Button
                      size="sm"
                      onClick={() => setAddingComment(!addingComment)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Добавить
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Форма добавления комментария */}
                  {addingComment && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex gap-3">
                        <Select value={commentType} onValueChange={(value: any) => setCommentType(value)}>
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin_note">Заметка</SelectItem>
                            <SelectItem value="completion_reason">Причина невыполнения</SelectItem>
                            <SelectItem value="feedback">Отзыв о выполнении</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Textarea
                        placeholder="Введите комментарий..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                      />
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || addingComment}
                          size="sm"
                        >
                          {addingComment ? 'Добавление...' : 'Добавить комментарий'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setAddingComment(false);
                            setNewComment('');
                          }}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Список комментариев */}
                  {task.adminComments && task.adminComments.length > 0 ? (
                    <div className="space-y-3">
                      {task.adminComments.map((comment) => (
                        <div key={comment.id} className="p-3 bg-white border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{comment.createdBy.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {comment.type === 'admin_note' ? 'Заметка' :
                                 comment.type === 'completion_reason' ? 'Причина' : 'Отзыв'}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.createdAt).toLocaleString('ru-RU')}
                            </span>
                          </div>
                          <p className="text-gray-700">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Комментариев пока нет</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Задача не найдена</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Галерея фотографий */}
      {photoGalleryOpen && task?.completionPhotos && (
        <Dialog open={photoGalleryOpen} onOpenChange={setPhotoGalleryOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                onClick={() => setPhotoGalleryOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              
              <div className="relative aspect-video bg-black">
                <Image
                  src={task.completionPhotos[currentPhotoIndex]}
                  alt={`Фото ${currentPhotoIndex + 1}`}
                  fill
                  className="object-contain"
                />
                
                {task.completionPhotos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                      onClick={() => navigatePhoto('prev')}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                      onClick={() => navigatePhoto('next')}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}
              </div>
              
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Фото {currentPhotoIndex + 1} из {task.completionPhotos.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(task.completionPhotos![currentPhotoIndex], '_blank')}
                  >
                    Открыть в новой вкладке
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
