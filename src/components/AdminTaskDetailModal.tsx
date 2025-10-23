'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Camera, 
  Plus,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings,
  Clock,
  User,
  Reply
} from 'lucide-react';
import Image from 'next/image';
import TaskLocationBreadcrumb from '@/components/TaskLocationBreadcrumb';

interface AdminTaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  onTaskUpdate?: (completedTask?: any) => void;
  userRole: string;
}

interface TaskComment {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  admin: {
    id: string;
    name: string;
    role: string;
  };
  parentComment?: {
    id: string;
    content: string;
    admin: {
      name: string;
    };
  };
  replies?: TaskComment[];
}

interface TaskData {
  id: string;
  description: string;
  status: string;
  completionType?: string;
  completionComment?: string;
  completionPhotos?: string[];
  completedAt?: string;
  completedBy?: {
    id: string;
    name: string;
  };
  checklist?: {
    object?: {
      id: string;
      name: string;
      address?: string;
    };
    room?: {
      id: string;
      name: string;
      area?: number;
    };
  };
}

export default function AdminTaskDetailModal({ 
  isOpen, 
  onClose, 
  taskId, 
  onTaskUpdate,
  userRole 
}: AdminTaskDetailModalProps) {
  const [task, setTask] = useState<TaskData | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'admin_note' | 'completion_feedback' | 'instruction' | 'quality_check'>('admin_note');
  const [addingComment, setAddingComment] = useState(false);
  const [photoGalleryOpen, setPhotoGalleryOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  // Проверяем права администратора
  const isAdmin = ['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(userRole);

  // Загрузка деталей задачи
  const loadTaskDetails = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks/${taskId}/details-new`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTask(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки деталей задачи:', error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка комментариев администраторов
  const loadComments = async () => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/admin-comments`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки комментариев:', error);
    }
  };

  // Добавление комментария администратора
  const handleAddComment = async () => {
    if (!taskId || !newComment.trim()) return;

    try {
      setAddingComment(true);
      const response = await fetch(`/api/tasks/${taskId}/admin-comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: newComment.trim(),
          type: commentType,
          parentCommentId: replyingTo
        }),
      });

      if (response.ok) {
        setNewComment('');
        setReplyingTo(null);
        loadComments();
        onTaskUpdate?.();
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

  // Получение иконки и цвета для типа комментария
  const getCommentTypeInfo = (type: string) => {
    switch (type) {
      case 'admin_note':
        return { icon: Info, color: 'text-blue-600', label: 'Заметка' };
      case 'completion_feedback':
        return { icon: MessageSquare, color: 'text-green-600', label: 'Отзыв о выполнении' };
      case 'instruction':
        return { icon: AlertTriangle, color: 'text-orange-600', label: 'Указание' };
      case 'quality_check':
        return { icon: CheckCircle, color: 'text-purple-600', label: 'Проверка качества' };
      default:
        return { icon: MessageSquare, color: 'text-gray-600', label: 'Комментарий' };
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
      loadComments();
    }
  }, [isOpen, taskId]);

  if (!isOpen || !taskId) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Детали задачи</span>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : task ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Детали задачи</TabsTrigger>
                <TabsTrigger value="comments" className="relative">
                  Комментарии
                  {comments.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                      {comments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history">История</TabsTrigger>
              </TabsList>

              {/* Детали задачи */}
              <TabsContent value="details" className="space-y-4">
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
                  <CardContent>
                    <TaskLocationBreadcrumb task={task} showFullPath={true} />
                  </CardContent>
                </Card>

                {/* Информация о выполнении */}
                {task.status === 'COMPLETED' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Информация о выполнении</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {task.completedBy && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span><strong>Исполнитель:</strong> {task.completedBy.name}</span>
                        </div>
                      )}
                      
                      {task.completedAt && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span><strong>Время выполнения:</strong> {new Date(task.completedAt).toLocaleString('ru-RU')}</span>
                        </div>
                      )}

                      {task.completionComment && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="font-medium text-green-800">Комментарий при выполнении:</p>
                          <p className="text-green-700 mt-1">{task.completionComment}</p>
                        </div>
                      )}

                      {task.completionPhotos && task.completionPhotos.length > 0 && (
                        <div>
                          <p className="font-medium mb-2">Фотоотчеты ({task.completionPhotos.length}):</p>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            {task.completionPhotos.map((photo, index) => (
                              <div 
                                key={index}
                                className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80"
                                onClick={() => openPhotoGallery(index)}
                              >
                                <Image
                                  src={photo}
                                  alt={`Фото ${index + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Комментарии администраторов */}
              <TabsContent value="comments" className="space-y-4">
                {/* Форма добавления комментария */}
                {isAdmin && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Добавить комментарий</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {replyingTo && (
                        <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-700">Ответ на комментарий</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setReplyingTo(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}

                      <Select value={commentType} onValueChange={(value: any) => setCommentType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin_note">📝 Заметка</SelectItem>
                          <SelectItem value="completion_feedback">💬 Отзыв о выполнении</SelectItem>
                          <SelectItem value="instruction">⚠️ Указание</SelectItem>
                          <SelectItem value="quality_check">✅ Проверка качества</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Textarea
                        placeholder="Введите комментарий..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                      />
                      
                      <Button 
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || addingComment}
                        className="flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {addingComment ? 'Добавление...' : 'Добавить комментарий'}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Список комментариев */}
                <div className="space-y-4">
                  {comments.length > 0 ? (
                    comments.map((comment) => {
                      const typeInfo = getCommentTypeInfo(comment.type);
                      const IconComponent = typeInfo.icon;
                      
                      return (
                        <Card key={comment.id} className="border-l-4 border-l-blue-200">
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              {/* Заголовок комментария */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <IconComponent className={`h-4 w-4 ${typeInfo.color}`} />
                                  <span className="font-medium">{comment.admin.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {typeInfo.label}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">
                                    {new Date(comment.createdAt).toLocaleString('ru-RU')}
                                  </span>
                                  {isAdmin && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setReplyingTo(comment.id)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Reply className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Родительский комментарий (если это ответ) */}
                              {comment.parentComment && (
                                <div className="p-2 bg-gray-50 rounded border-l-2 border-gray-300">
                                  <p className="text-xs text-gray-600">
                                    Ответ на: {comment.parentComment.admin.name}
                                  </p>
                                  <p className="text-sm text-gray-700 truncate">
                                    {comment.parentComment.content}
                                  </p>
                                </div>
                              )}

                              {/* Содержимое комментария */}
                              <p className="text-gray-800">{comment.content}</p>

                              {/* Ответы на комментарий */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="ml-4 space-y-2 border-l-2 border-gray-200 pl-4">
                                  {comment.replies.map((reply) => (
                                    <div key={reply.id} className="p-2 bg-gray-50 rounded">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium">{reply.admin.name}</span>
                                        <span className="text-xs text-gray-500">
                                          {new Date(reply.createdAt).toLocaleString('ru-RU')}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-700">{reply.content}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Комментариев пока нет</p>
                        {isAdmin && (
                          <p className="text-sm text-gray-400 mt-2">
                            Добавьте первый комментарий к этой задаче
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* История действий */}
              <TabsContent value="history">
                <Card>
                  <CardContent className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">История действий будет доступна в следующих версиях</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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

// Утилита для получения цвета статуса (дублируется из task-details-utils)
function getTaskStatusColor(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'text-green-600 bg-green-50';
    case 'OVERDUE':
      return 'text-red-600 bg-red-50';
    case 'IN_PROGRESS':
      return 'text-blue-600 bg-blue-50';
    case 'FAILED':
      return 'text-orange-600 bg-orange-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}
