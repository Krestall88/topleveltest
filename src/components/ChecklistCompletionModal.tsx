'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Camera, Upload, X, CheckCircle, AlertTriangle, Calendar, MapPin, FileText } from 'lucide-react';

interface Task {
  id: string;
  description: string;
  status: string;
}

interface Checklist {
  id: string;
  date: string;
  object?: {
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
  tasks?: Task[];
  completedAt?: string;
  completionComment?: string;
  completionPhotos?: string[];
}

interface ChecklistCompletionModalProps {
  checklist: Checklist | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function ChecklistCompletionModal({ 
  checklist, 
  isOpen, 
  onClose, 
  onComplete 
}: ChecklistCompletionModalProps) {
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [forceComplete, setForceComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleClose = () => {
    setComment('');
    setPhotos([]);
    setForceComplete(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!checklist || !checklist.object) return;

    const requirements = checklist.object.completionRequirements || {
      photo: checklist.object.requirePhotoForCompletion || false,
      comment: checklist.object.requireCommentForCompletion || false,
    };

    // Проверка требований к фото (принудительное завершение НЕ отменяет эти требования)
    if (requirements.photo && photos.length === 0) {
      const minPhotos = requirements.minPhotos || 1;
      setError(`Для завершения чек-листа требуется минимум ${minPhotos} фото`);
      return;
    }

    if (requirements.photo && requirements.minPhotos && photos.length < requirements.minPhotos) {
      setError(`Требуется минимум ${requirements.minPhotos} фото для завершения чек-листа`);
      return;
    }

    // Проверка требований к комментарию (принудительное завершение НЕ отменяет эти требования)
    if (requirements.comment && !comment.trim()) {
      setError('Для завершения чек-листа требуется комментарий');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/checklists/${checklist.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: comment.trim() || undefined,
          photos: photos.length > 0 ? photos : undefined,
          forceComplete: forceComplete,
        }),
      });

      if (response.ok) {
        onComplete();
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Ошибка при завершении чек-листа');
      }
    } catch (error) {
      console.error('Ошибка при завершении чек-листа:', error);
      setError('Ошибка при завершении чек-листа');
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
        if (!file.type.startsWith('image/')) {
          setError('Можно загружать только изображения');
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          setError('Размер файла не должен превышать 5MB');
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'checklist-completion');

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

  if (!checklist || !checklist.object) return null;

  const tasks = checklist.tasks || [];
  const completedTasks = tasks.filter(task => 
    task.status === 'COMPLETED' || task.status === 'CLOSED_WITH_PHOTO'
  ).length;
  const totalTasks = tasks.length;
  const allTasksCompleted = completedTasks === totalTasks;
  
  const requirements = checklist.object.completionRequirements || {
    photo: checklist.object.requirePhotoForCompletion || false,
    comment: checklist.object.requireCommentForCompletion || false,
  };
  
  const photoRequired = requirements.photo;
  const commentRequired = requirements.comment;
  const minPhotos = requirements.minPhotos || 1;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>Завершение чек-листа</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Информация о чек-листе */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">{checklist.object.name}</div>
              <Badge variant="outline">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(checklist.date).toLocaleDateString('ru-RU')}
              </Badge>
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {checklist.object.address}
              </div>
              {checklist.room && (
                <div>Помещение: {checklist.room.name}</div>
              )}
              <div>
                Выполнено задач: {completedTasks} из {totalTasks}
                {!allTasksCompleted && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    Не все задачи выполнены
                  </Badge>
                )}
              </div>
              {(photoRequired || commentRequired) && (
                <div className="space-y-1">
                  {photoRequired && (
                    <div className="flex items-center text-orange-600">
                      <Camera className="w-3 h-3 mr-1" />
                      Обязательно: минимум {minPhotos} фото
                    </div>
                  )}
                  {commentRequired && (
                    <div className="flex items-center text-blue-600">
                      <FileText className="w-3 h-3 mr-1" />
                      Обязательно: комментарий
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Предупреждение о незавершенных задачах */}
          {!allTasksCompleted && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Внимание!</div>
                Не все задачи в чек-листе выполнены ({completedTasks} из {totalTasks}). 
                Вы можете принудительно завершить чек-лист, включив опцию ниже.
              </AlertDescription>
            </Alert>
          )}

          {/* Принудительное завершение */}
          {!allTasksCompleted && (
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div>
                <Label htmlFor="force-complete" className="text-sm font-medium text-yellow-800">
                  Принудительное завершение
                </Label>
                <div className="text-xs text-yellow-700 mt-1">
                  Завершить чек-лист даже если не все задачи выполнены (требования к фото и комментариям остаются)
                </div>
              </div>
              <Switch
                id="force-complete"
                checked={forceComplete}
                onCheckedChange={setForceComplete}
              />
            </div>
          )}

          {/* Комментарий */}
          <div className="space-y-2">
            <Label htmlFor="completion-comment">
              Комментарий к завершению
              {commentRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id="completion-comment"
              placeholder={
                requirements.commentDescription || 
                "Опишите общие результаты выполнения чек-листа, особенности, замечания..."
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className={commentRequired && !comment.trim() ? 'border-red-300' : ''}
            />
            {commentRequired && (
              <div className="text-xs text-blue-600">
                Комментарий обязателен для завершения этого чек-листа
              </div>
            )}
          </div>

          {/* Загрузка фото */}
          <div className="space-y-2">
            <Label>
              Фотографии завершения 
              {photoRequired && <span className="text-red-500">*</span>}
            </Label>
            
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                disabled={isUploading}
                onClick={() => document.getElementById('completion-photo-upload')?.click()}
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
                id="completion-photo-upload"
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
                      alt={`Фото завершения ${index + 1}`}
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
              disabled={
                isSubmitting || 
                (!allTasksCompleted && !forceComplete) ||
                (photoRequired && photos.length < minPhotos) ||
                (commentRequired && !comment.trim())
              }
            >
              {isSubmitting ? 'Завершение...' : 'Завершить чек-лист'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
