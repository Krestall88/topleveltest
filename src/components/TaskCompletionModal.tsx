'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, X, CheckCircle, AlertTriangle, Calendar, MapPin, FileText, Clock } from 'lucide-react';

interface Task {
  id: string;
  description: string;
  status: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  completionComment?: string;
  completionPhotos?: string[];
  completedAt?: string;
  checklist: {
    id: string;
    date: string;
    object: {
      id: string;
      name: string;
      address: string;
      requirePhotoForCompletion?: boolean;
      requireCommentForCompletion?: boolean;
      completionRequirements?: {
        photo: boolean;
        comment: boolean;
        minPhotos?: number;
        photoDescription?: string;
        commentDescription?: string;
      };
    };
    room?: {
      id: string;
      name: string;
    };
  };
}

interface TaskCompletionModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (completedTask: Task) => void;
}

export default function TaskCompletionModal({ 
  task, 
  isOpen, 
  onClose, 
  onComplete 
}: TaskCompletionModalProps) {
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task && isOpen) {
      setComment(task.completionComment || '');
      setPhotos([]);
      setError(null);
    }
  }, [task, isOpen]);

  if (!task) return null;

  const requirements = task.checklist.object.completionRequirements || {
    photo: task.checklist.object.requirePhotoForCompletion || false,
    comment: task.checklist.object.requireCommentForCompletion || false,
  };

  const photoRequired = requirements.photo;
  const commentRequired = requirements.comment;
  const minPhotos = requirements.minPhotos || 1;

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

    console.log('🔍 ДИАГНОСТИКА: Попытка завершить задачу:', {
      taskId: task.id,
      currentStatus: task.status,
      isAlreadyCompleted: task.status === 'COMPLETED',
      hasCompletedAt: !!task.completedAt,
      completedBy: task.completedBy
    });

    // Проверяем, не завершена ли задача уже
    if (task.status === 'COMPLETED') {
      console.log('❌ ОШИБКА: Попытка завершить уже завершенную задачу!');
      setError('Задача уже завершена');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    setError('');
    if (commentRequired && !comment.trim()) {
      setError('Для завершения задачи требуется комментарий');
      return;
    }

    try {
      setIsSubmitting(true);
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

      // Завершаем задачу (используем API с поддержкой виртуальных задач)
      const response = await fetch(`/api/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'COMPLETED',
          comment: comment.trim(),
          photos: photoUrls,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось завершить задачу');
      }

      // Получаем обновленные данные с сервера
      const responseData = await response.json();
      console.log('🔍 ДИАГНОСТИКА: Ответ от API:', responseData);
      
      // Создаем объект завершенной задачи с данными от сервера
      const completedTask: Task = {
        ...task!,
        ...responseData.task,
        status: 'COMPLETED',
        completionComment: comment.trim(),
        completionPhotos: photoUrls,
        completedAt: responseData.task.completedAt || new Date().toISOString()
      };

      console.log('🔍 ДИАГНОСТИКА: Исходная задача:', task);
      console.log('🔍 ДИАГНОСТИКА: Завершенная задача:', completedTask);
      console.log('🔍 ДИАГНОСТИКА: Вызываем onComplete...');
      onComplete(completedTask);
      handleClose();
    } catch (error) {
      console.error('Ошибка завершения задачи:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleted = task.status === 'COMPLETED' || task.status === 'CLOSED_WITH_PHOTO';
  const isOverdue = task.scheduledEnd && new Date(task.scheduledEnd) < new Date() && !isCompleted;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>Завершение задачи</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Информация о задаче */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{task.description}</h3>
                <div className="flex space-x-2">
                  {isCompleted && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Выполнено
                    </Badge>
                  )}
                  {isOverdue && (
                    <Badge variant="destructive">
                      Просрочено
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {task.checklist.object.name}
                </div>
                {task.checklist.room && (
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-1 flex items-center justify-center">🏠</div>
                    {task.checklist.room.name}
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(task.checklist.date).toLocaleDateString('ru-RU')}
                </div>
                {task.scheduledEnd && (
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    До {new Date(task.scheduledEnd).toLocaleString('ru-RU')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Требования */}
          {(photoRequired || commentRequired) && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-2">
                Требования к завершению:
              </div>
              <div className="space-y-1">
                {photoRequired && (
                  <div className="flex items-center text-orange-600">
                    <Camera className="w-3 h-3 mr-1" />
                    Обязательно: минимум {minPhotos} фото
                    {requirements.photoDescription && (
                      <span className="ml-2 text-xs text-gray-600">
                        ({requirements.photoDescription})
                      </span>
                    )}
                  </div>
                )}
                {commentRequired && (
                  <div className="flex items-center text-blue-600">
                    <FileText className="w-3 h-3 mr-1" />
                    Обязательно: комментарий
                    {requirements.commentDescription && (
                      <span className="ml-2 text-xs text-gray-600">
                        ({requirements.commentDescription})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Загрузка фото */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center">
              <Camera className="w-4 h-4 mr-2" />
              Фотографии выполненной работы
              {photoRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
                disabled={isSubmitting}
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Нажмите для загрузки фото или перетащите файлы сюда
                </span>
                <span className="text-xs text-gray-500">
                  Максимум 10 фото, форматы: JPG, PNG
                </span>
              </label>
            </div>

            {/* Превью загруженных фото */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Фото ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      disabled={isSubmitting}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Комментарий */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Комментарий к выполнению
              {commentRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id="comment"
              placeholder={
                requirements.commentDescription || 
                "Опишите как была выполнена задача, особенности, проблемы..."
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              disabled={isSubmitting}
              className={commentRequired && !comment.trim() ? 'border-red-300' : ''}
            />
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                (photoRequired && photos.length < minPhotos) ||
                (commentRequired && !comment.trim())
              }
            >
              {isSubmitting ? 'Завершение...' : 'Завершить задачу'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
