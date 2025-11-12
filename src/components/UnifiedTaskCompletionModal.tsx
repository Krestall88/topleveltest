'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, X, CheckCircle, AlertTriangle, Calendar, MapPin, FileText, Clock, MessageSquare, Send } from 'lucide-react';
import { UnifiedTask } from '@/lib/unified-task-system';

interface UnifiedTaskCompletionModalProps {
  task: UnifiedTask | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (completedTask: UnifiedTask) => void;
}

interface AdminComment {
  id: string;
  content: string;
  type: 'ADMIN_NOTE' | 'COMPLETION_FEEDBACK' | 'INSTRUCTION';
  createdAt: string;
  admin: {
    id: string;
    name: string;
    role: string;
  };
}

export default function UnifiedTaskCompletionModal({ 
  task, 
  isOpen, 
  onClose, 
  onComplete 
}: UnifiedTaskCompletionModalProps) {
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Настройки завершения
  const [photoRequired, setPhotoRequired] = useState(false);
  const [commentRequired, setCommentRequired] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // Комментарии администратора
  const [adminComments, setAdminComments] = useState<AdminComment[]>([]);
  const [newAdminComment, setNewAdminComment] = useState('');
  const [commentType, setCommentType] = useState<'ADMIN_NOTE' | 'COMPLETION_FEEDBACK' | 'INSTRUCTION'>('ADMIN_NOTE');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      setComment(task.completionComment || '');
      setPhotos([]);
      setError(null);
      setSettingsLoaded(false);
      loadAdminComments();
      loadObjectSettings();
    }
  }, [task, isOpen]);

  const loadObjectSettings = async () => {
    if (!task) return;
    
    try {
      console.log('🔍 MODAL: Загружаем настройки объекта:', task.objectId);
      const response = await fetch(`/api/objects/${task.objectId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 MODAL: Настройки объекта получены:', {
          requirePhotoForCompletion: data.requirePhotoForCompletion,
          requireCommentForCompletion: data.requireCommentForCompletion
        });
        setPhotoRequired(data.requirePhotoForCompletion || false);
        setCommentRequired(data.requireCommentForCompletion || false);
        setSettingsLoaded(true);
      } else {
        console.error('❌ MODAL: Ошибка загрузки настроек:', response.status);
        setSettingsLoaded(true); // Все равно разрешаем продолжить
      }
    } catch (error) {
      console.error('❌ MODAL: Ошибка загрузки настроек объекта:', error);
      setSettingsLoaded(true); // Все равно разрешаем продолжить
    }
  };

  const loadAdminComments = async () => {
    if (!task) return;
    
    setIsLoadingComments(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/admin-comments`);
      if (response.ok) {
        const data = await response.json();
        setAdminComments(data.comments || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки комментариев:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSendAdminComment = async () => {
    if (!task || !newAdminComment.trim()) return;
    
    setIsSendingComment(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/admin-comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newAdminComment,
          type: commentType
        })
      });
      
      if (response.ok) {
        setNewAdminComment('');
        await loadAdminComments();
      } else {
        const data = await response.json();
        setError(data.message || 'Ошибка добавления комментария');
      }
    } catch (error) {
      console.error('Ошибка отправки комментария:', error);
      setError('Ошибка отправки комментария');
    } finally {
      setIsSendingComment(false);
    }
  };

  const getCommentTypeLabel = (type: string) => {
    switch (type) {
      case 'ADMIN_NOTE': return 'Заметка';
      case 'COMPLETION_FEEDBACK': return 'Отзыв';
      case 'INSTRUCTION': return 'Указание';
      default: return type;
    }
  };

  if (!task) return null;

  const minPhotos = 1;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos(prev => [...prev, ...files].slice(0, 10)); // Максимум 10 фото
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setComment('');
      setPhotos([]);
      setError(null);
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!task) return;

    console.log('🔍 UNIFIED MODAL: Попытка завершить задачу:', {
      taskId: task.id,
      currentStatus: task.status,
      type: task.type
    });

    // Проверяем, не завершена ли задача уже
    if (task.status === 'COMPLETED') {
      console.log('❌ ОШИБКА: Попытка завершить уже завершенную задачу!');
      setError('Задача уже завершена');
      setIsSubmitting(false);
      return;
    }

    // Ждем загрузки настроек
    if (!settingsLoaded) {
      console.log('⏳ MODAL: Ожидание загрузки настроек...');
      setError('Загрузка настроек объекта...');
      // Ждем максимум 3 секунды
      let attempts = 0;
      while (!settingsLoaded && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (!settingsLoaded) {
        console.log('⚠️ MODAL: Настройки не загрузились, продолжаем без проверки');
      }
    }

    setIsSubmitting(true);
    setError('');
    
    console.log('🔍 MODAL: Проверка требований завершения:', {
      settingsLoaded,
      commentRequired,
      hasComment: !!comment.trim(),
      photoRequired,
      photosCount: photos.length,
      minPhotos
    });
    
    if (commentRequired && !comment.trim()) {
      console.log('❌ MODAL: Требуется комментарий');
      setError('Для завершения задачи требуется комментарий');
      setIsSubmitting(false);
      return;
    }

    if (photoRequired && photos.length < minPhotos) {
      console.log('❌ MODAL: Требуется фото');
      setError(`Требуется минимум ${minPhotos} фото для завершения задачи`);
      setIsSubmitting(false);
      return;
    }

    try {
      setError(null);

      // Загружаем фото
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const formData = new FormData();
        formData.append('file', photo);
        formData.append('type', 'task-completion');
        formData.append('taskId', task.id);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json();
          photoUrls.push(url);
        }
      }

      // Завершаем задачу через новый API
      console.log('🔍 UNIFIED MODAL: Отправляем запрос на завершение:', {
        taskId: task.id,
        status: 'COMPLETED',
        comment: comment.trim(),
        photosCount: photoUrls.length
      });

      const response = await fetch('/api/tasks/unified-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          taskId: task.id,
          status: 'COMPLETED',
          comment: comment.trim(),
          photos: photoUrls,
        }),
      });

      console.log('🔍 UNIFIED MODAL: Получен ответ:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Не удалось завершить задачу');
      }

      // Получаем обновленные данные с сервера
      const responseData = await response.json();
      console.log('🔍 UNIFIED MODAL: Ответ от API:', responseData);
      
      // Создаем объект завершенной задачи
      const completedTask: UnifiedTask = {
        ...task,
        status: 'COMPLETED',
        completionComment: comment.trim(),
        completionPhotos: photoUrls,
        completedAt: new Date(),
        completedBy: { id: 'current', name: 'Текущий пользователь' }
      };

      console.log('🔍 UNIFIED MODAL: Завершенная задача:', completedTask);
      console.log('🔍 UNIFIED MODAL: Вызываем onComplete...');
      onComplete(completedTask);
      console.log('🔍 UNIFIED MODAL: onComplete выполнен, модальное окно остается открытым');
      
      // Сбрасываем форму для следующей задачи
      setComment('');
      setPhotos([]);
      
    } catch (error) {
      console.error('❌ UNIFIED MODAL: Ошибка завершения задачи:', error);
      console.error('❌ UNIFIED MODAL: Детали ошибки:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="mobile-modal max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 mobile-text-base">
            <CheckCircle className="mobile-icon text-green-600" />
            Завершение задачи
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Информация о задаче */}
          <div className="mobile-card bg-gray-50 rounded-lg border">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-3">
              <div className="flex-1 w-full min-w-0">
                <h3 className="mobile-text-base font-semibold text-gray-900 break-words">{task.description}</h3>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 mobile-text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="mobile-icon-sm" />
                    <span>{task.objectName}</span>
                  </div>
                  {task.roomName && (
                    <div className="flex items-center gap-1">
                      <span>•</span>
                      <span>{task.roomName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="mobile-icon-sm" />
                    <span>{new Date(task.scheduledDate).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
              </div>
              <Badge 
                variant={task.status === 'OVERDUE' ? 'destructive' : 'default'}
                className="shrink-0 mobile-badge"
              >
                {task.status === 'OVERDUE' ? 'Просрочено' : 
                 task.status === 'AVAILABLE' ? 'На сегодня' : 
                 task.status === 'PENDING' ? 'Предстоящая' : task.status}
              </Badge>
            </div>
            
            <div className="mobile-text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="mobile-icon-sm" />
                <span>Периодичность: {task.frequency}</span>
              </div>
              {task.techCard.workType && (
                <div className="mt-1">
                  <span>Тип работы: {task.techCard.workType}</span>
                </div>
              )}
            </div>
          </div>

          {/* Информация о завершении (если задача завершена) */}
          {task.status === 'COMPLETED' && task.completedAt && (
            <div className="p-3 md:p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">Задача завершена</span>
              </div>
              <div className="space-y-1 text-sm text-gray-700">
                <div>
                  <span className="font-medium">Завершил:</span> {task.completedBy?.name || 'Неизвестно'}
                </div>
                <div>
                  <span className="font-medium">Дата завершения:</span>{' '}
                  {new Date(task.completedAt).toLocaleString('ru-RU')}
                </div>
                {task.completionComment && (
                  <div className="mt-2 pt-2 border-t border-green-300">
                    <span className="font-medium">Комментарий:</span>
                    <p className="mt-1 text-gray-800 whitespace-pre-wrap break-words">{task.completionComment}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Комментарий (только для незавершенных задач) */}
          {task.status !== 'COMPLETED' && (
            <div className="space-y-2">
              <Label htmlFor="comment" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Комментарий к выполнению
                {commentRequired && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Опишите как была выполнена задача..."
                rows={3}
                className="resize-none text-sm"
              />
              <p className="text-xs text-gray-500">
                Комментарий поможет другим понять, как была выполнена задача
              </p>
            </div>
          )}

          {/* Загрузка фото (только для незавершенных задач) */}
          {task.status !== 'COMPLETED' && (
            <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Фотоотчет
              {photoRequired && <span className="text-red-500">*</span>}
            </Label>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 md:p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Нажмите для загрузки фото или перетащите файлы сюда
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Максимум 10 фото, форматы: JPG, PNG, GIF
                </p>
              </label>
            </div>

            {/* Превью загруженных фото */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Фото ${index + 1}`}
                      className="w-full h-20 sm:h-24 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}

          {/* Комментарии администратора */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <MessageSquare className="w-5 h-5" />
                Комментарии администратора
              </Label>
              {adminComments.length > 0 && (
                <Badge variant="secondary">{adminComments.length}</Badge>
              )}
            </div>

            {/* Список комментариев */}
            {isLoadingComments ? (
              <div className="text-center py-4 text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto"></div>
                <p className="mt-2 text-sm">Загрузка комментариев...</p>
              </div>
            ) : adminComments.length > 0 ? (
              <div className="space-y-2 md:space-y-3 max-h-48 md:max-h-60 overflow-y-auto">
                {adminComments.map((comment) => (
                  <div key={comment.id} className="bg-blue-50 border border-blue-200 rounded-lg p-2 md:p-3">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-1 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getCommentTypeLabel(comment.type)}
                        </Badge>
                        <span className="text-xs font-medium text-gray-700">
                          {comment.admin.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-gray-800 whitespace-pre-wrap break-words">{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-3">
                Комментариев пока нет
              </p>
            )}

            {/* Форма добавления комментария */}
            <div className="space-y-2 pt-2">
              <div className="flex gap-2">
                <select
                  value={commentType}
                  onChange={(e) => setCommentType(e.target.value as any)}
                  className="w-full sm:w-auto px-2 md:px-3 py-2 border border-gray-300 rounded-md text-xs md:text-sm"
                >
                  <option value="ADMIN_NOTE">Заметка</option>
                  <option value="COMPLETION_FEEDBACK">Отзыв о выполнении</option>
                  <option value="INSTRUCTION">Указание</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Textarea
                  value={newAdminComment}
                  onChange={(e) => setNewAdminComment(e.target.value)}
                  placeholder="Добавить комментарий..."
                  rows={2}
                  className="resize-none flex-1 text-sm"
                />
                <Button
                  onClick={handleSendAdminComment}
                  disabled={isSendingComment || !newAdminComment.trim()}
                  size="sm"
                  className="self-end w-full sm:w-auto"
                >
                  {isSendingComment ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 border-t">
            <Button 
              onClick={handleClose} 
              variant="outline" 
              className="w-full sm:flex-1"
              disabled={isSubmitting}
            >
              {task.status === 'COMPLETED' ? 'Закрыть' : 'Отмена'}
            </Button>
            {task.status !== 'COMPLETED' && (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="w-full sm:flex-1 bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Завершение...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Завершить задачу
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
