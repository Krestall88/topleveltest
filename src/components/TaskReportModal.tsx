'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, X, CheckCircle } from 'lucide-react';

interface Task {
  id: string;
  description: string;
  status: string;
  objectName?: string;
  roomName?: string;
}

interface TaskReportModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (taskId: string, data: { comment?: string; photos?: string[] }) => Promise<void>;
  requirePhoto?: boolean;
}

export default function TaskReportModal({ 
  task, 
  isOpen, 
  onClose, 
  onComplete, 
  requirePhoto = false 
}: TaskReportModalProps) {
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleClose = () => {
    setComment('');
    setPhotos([]);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!task) return;

    if (requirePhoto && photos.length === 0) {
      setError('Для завершения этой задачи требуется фото');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onComplete(task.id, {
        comment: comment.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
      });

      handleClose();
    } catch (error) {
      console.error('Ошибка при завершении задачи:', error);
      setError('Ошибка при завершении задачи');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      setError(null);

      for (const file of Array.from(files)) {
        // Проверить тип файла
        if (!file.type.startsWith('image/')) {
          setError('Можно загружать только изображения');
          continue;
        }

        // Проверить размер файла (максимум 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError('Размер файла не должен превышать 5MB');
          continue;
        }

        // Создать FormData для загрузки
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'task-photo');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setPhotos(prev => [...prev, data.url]);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Ошибка при загрузке фото');
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      setError('Ошибка при загрузке файла');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>Завершение задачи</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Информация о задаче */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="font-medium text-sm mb-2">{task.description}</div>
            {task.objectName && (
              <div className="text-xs text-gray-600">
                Объект: {task.objectName}
                {task.roomName && ` • Помещение: ${task.roomName}`}
              </div>
            )}
            <div className="mt-2">
              <Badge variant="secondary">
                {task.status === 'IN_PROGRESS' ? 'В работе' : 'Новая'}
              </Badge>
              {requirePhoto && (
                <Badge variant="destructive" className="ml-2">
                  Фото обязательно
                </Badge>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Комментарий */}
          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий к выполнению</Label>
            <Textarea
              id="comment"
              placeholder="Опишите как была выполнена задача, какие материалы использовались, особенности выполнения..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          {/* Загрузка фото */}
          <div className="space-y-2">
            <Label>Фотографии выполнения {requirePhoto && <span className="text-red-500">*</span>}</Label>
            
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                disabled={isUploading}
                onClick={() => document.getElementById('photo-upload')?.click()}
              >
                {isUploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Добавить фото
                  </>
                )}
              </Button>
              
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              
              {photos.length > 0 && (
                <span className="text-sm text-gray-600">
                  Загружено: {photos.length} фото
                </span>
              )}
            </div>

            {/* Превью фотографий */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`Фото ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              disabled={isSubmitting || (requirePhoto && photos.length === 0)}
            >
              {isSubmitting ? 'Завершение...' : 'Завершить задачу'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
