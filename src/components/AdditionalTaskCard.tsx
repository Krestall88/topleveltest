'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Building, 
  User, 
  MessageSquare, 
  Phone, 
  Mail, 
  FileText,
  Image,
  Mic,
  CheckCircle,
  PlayCircle,
  Calendar,
  Trash2,
  Upload,
  X,
  Download
} from 'lucide-react';
import type { AdditionalTask } from '@/types';
import AdditionalTaskComments from './AdditionalTaskComments';

interface AdditionalTaskCardProps {
  task: AdditionalTask;
  onStatusChange?: (taskId: string, action: 'take' | 'complete', note?: string, photos?: string[]) => void;
  onDelete?: (taskId: string) => void;
  showActions?: boolean;
  isCurrentUser?: boolean;
  canDelete?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
}

const statusConfig = {
  NEW: { 
    label: 'Новое', 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: Clock 
  },
  IN_PROGRESS: { 
    label: 'В работе', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: PlayCircle 
  },
  COMPLETED: { 
    label: 'Выполнено', 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle 
  }
};

const sourceConfig = {
  TELEGRAM: { label: 'Telegram', icon: MessageSquare, color: 'text-blue-600' },
  ADMIN: { label: 'Администратор', icon: User, color: 'text-purple-600' },
  MANUAL: { label: 'Ручное', icon: FileText, color: 'text-gray-600' }
};

export default function AdditionalTaskCard({ 
  task, 
  onStatusChange, 
  onDelete,
  showActions = true,
  isCurrentUser = false,
  canDelete = false,
  currentUserId = '',
  isAdmin = false
}: AdditionalTaskCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);

  const statusInfo = statusConfig[task.status];
  const sourceInfo = sourceConfig[task.source as keyof typeof sourceConfig] || sourceConfig.MANUAL;
  const StatusIcon = statusInfo.icon;
  const SourceIcon = sourceInfo.icon;

  const handleTakeTask = () => {
    if (onStatusChange) {
      onStatusChange(task.id, 'take');
    }
  };

  const handleCompleteTask = () => {
    if (onStatusChange) {
      onStatusChange(task.id, 'complete', completionNote.trim() || undefined, completionPhotos);
      setShowCompleteForm(false);
      setCompletionNote('');
      setCompletionPhotos([]);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          uploadedUrls.push(data.url);
        }
      } catch (error) {
        console.error('Error uploading photo:', error);
      }
    }

    setCompletionPhotos([...completionPhotos, ...uploadedUrls]);
    setUploading(false);
  };

  const removePhoto = (index: number) => {
    setCompletionPhotos(completionPhotos.filter((_, i) => i !== index));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAttachmentIcon = (url: string) => {
    if (url.includes('voice') || url.includes('audio')) return Mic;
    if (url.includes('photo') || url.includes('image')) return Image;
    return FileText;
  };

  const downloadPhoto = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePhotoClick = (photo: string, index: number) => {
    setSelectedPhoto(photo);
    setSelectedPhotoIndex(index);
  };

  const handleNextPhoto = () => {
    if (task.completionPhotos && selectedPhotoIndex < task.completionPhotos.length - 1) {
      const nextIndex = selectedPhotoIndex + 1;
      setSelectedPhotoIndex(nextIndex);
      setSelectedPhoto(task.completionPhotos[nextIndex]);
    }
  };

  const handlePrevPhoto = () => {
    if (task.completionPhotos && selectedPhotoIndex > 0) {
      const prevIndex = selectedPhotoIndex - 1;
      setSelectedPhotoIndex(prevIndex);
      setSelectedPhoto(task.completionPhotos[prevIndex]);
    }
  };

  return (
    <Card className={`transition-all duration-200 ${
      task.status === 'NEW' ? 'border-red-200 shadow-md' : 'border-gray-200'
    }`}>
      <CardHeader className="pb-2 md:pb-3">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
          <div className="flex-1 w-full">
            <CardTitle className="text-base md:text-lg mb-2 break-words">{task.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                <span>{task.object?.name || 'Неизвестный объект'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{task.receivedAt ? formatDate(task.receivedAt) : 'Не указано'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={`${sourceInfo.color} text-xs`}>
              <SourceIcon className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">{sourceInfo.label}</span>
            </Badge>
            <Badge className={`${statusInfo.color} text-xs`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 md:space-y-4">
        {/* Содержимое задания */}
        <div className="bg-gray-50 rounded-lg p-2 md:p-3">
          <p className="text-xs md:text-sm whitespace-pre-wrap break-words">{task.content}</p>
        </div>

        {/* Вложения */}
        {task.attachments && task.attachments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Вложения:</p>
            <div className="flex flex-col gap-2">
              {task.attachments?.map((attachment, index) => {
                const AttachmentIcon = getAttachmentIcon(attachment);
                const isAudio = attachment.includes('voice') || attachment.includes('audio');
                
                return (
                  <div key={index}>
                    {isAudio ? (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <Mic className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <audio 
                          controls 
                          className="flex-1 h-8"
                          style={{ maxWidth: '100%' }}
                        >
                          <source src={attachment} type="audio/ogg" />
                          <source src={attachment} type="audio/mpeg" />
                          Ваш браузер не поддерживает аудио элемент.
                        </audio>
                      </div>
                    ) : (
                      <a
                        href={attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm hover:bg-blue-100 transition-colors inline-flex"
                      >
                        <AttachmentIcon className="h-3 w-3" />
                        <span>Файл {index + 1}</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Информация о выполнении */}
        {task.status !== 'NEW' && (
          <div className="border-t pt-3 space-y-2">
            {task.takenAt && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <PlayCircle className="h-4 w-4" />
                <span>Взято в работу: {formatDate(task.takenAt)}</span>
              </div>
            )}
            
            {task.completedAt && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Выполнено: {formatDate(task.completedAt)}</span>
                </div>
                {task.completedBy && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>Исполнитель: {task.completedBy.name}</span>
                  </div>
                )}
                {task.completionNote && (
                  <div className="bg-green-50 rounded p-2 mt-2">
                    <p className="text-xs md:text-sm text-green-800 break-words">
                      <strong>Комментарий:</strong> {task.completionNote}
                    </p>
                  </div>
                )}
                {task.completionPhotos && task.completionPhotos.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs md:text-sm font-medium text-gray-700 mb-2">Фотографии:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {task.completionPhotos.map((photo, index) => (
                        <div
                          key={index}
                          onClick={() => handlePhotoClick(photo, index)}
                          className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square cursor-pointer"
                        >
                          <img 
                            src={photo} 
                            alt={`Фото ${index + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Image className="h-8 w-8 text-white" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Действия для менеджера */}
        {showActions && isCurrentUser && task.status !== 'COMPLETED' && (
          <div className="border-t pt-3 space-y-3">
            {task.status === 'NEW' && (
              <Button 
                onClick={handleTakeTask}
                className="w-full"
                variant="outline"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Взять в работу
              </Button>
            )}

            {task.status === 'IN_PROGRESS' && !showCompleteForm && (
              <Button 
                onClick={() => setShowCompleteForm(true)}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Закрыть задание
              </Button>
            )}

            {showCompleteForm && (
              <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-800 font-medium">
                  <CheckCircle className="h-5 w-5" />
                  <span>Закрытие задания</span>
                </div>
                
                {/* Комментарий */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Комментарий о выполнении
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    value={completionNote}
                    onChange={(e) => setCompletionNote(e.target.value)}
                    placeholder="Опишите как было выполнено задание, что было сделано..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Комментарий обязателен для закрытия задания
                  </p>
                </div>

                {/* Загрузка фотографий */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Фотографии выполненной работы
                  </label>
                  
                  {/* Превью загруженных фото */}
                  {completionPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {completionPhotos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={photo} 
                            alt={`Фото ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Кнопка загрузки */}
                  <label className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                    <Upload className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {uploading ? 'Загрузка...' : 'Добавить фото'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Можно загрузить несколько фотографий
                  </p>
                </div>

                {/* Кнопки действий */}
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCompleteTask}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={!completionNote.trim() || uploading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Закрыть задание
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowCompleteForm(false);
                      setCompletionNote('');
                      setCompletionPhotos([]);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Система комментариев */}
        {currentUserId && (
          <AdditionalTaskComments
            taskId={task.id}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        )}

        {/* Кнопка удаления для админов */}
        {canDelete && onDelete && (
          <div className="border-t pt-3 mt-4">
            <Button 
              onClick={() => {
                if (confirm('Вы уверены, что хотите удалить это задание?')) {
                  onDelete(task.id);
                }
              }}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить задание
            </Button>
          </div>
        )}
      </CardContent>

      {/* Модальное окно для просмотра фото */}
      {selectedPhoto && task.completionPhotos && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Фото {selectedPhotoIndex + 1} из {task.completionPhotos.length}</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => downloadPhoto(selectedPhoto, `task-${task.id}-photo-${selectedPhotoIndex + 1}.jpg`)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  title="Скачать"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row">
              {/* Изображение */}
              <div className="flex-1 p-4 relative">
                <img
                  src={selectedPhoto}
                  alt={`Фото ${selectedPhotoIndex + 1}`}
                  className="w-full h-auto max-h-[60vh] object-contain rounded"
                />
                
                {/* Кнопки навигации */}
                {task.completionPhotos.length > 1 && (
                  <>
                    {selectedPhotoIndex > 0 && (
                      <button
                        onClick={handlePrevPhoto}
                        className="absolute left-6 top-1/2 -translate-y-1/2 bg-white bg-opacity-75 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all"
                      >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    )}
                    {selectedPhotoIndex < task.completionPhotos.length - 1 && (
                      <button
                        onClick={handleNextPhoto}
                        className="absolute right-6 top-1/2 -translate-y-1/2 bg-white bg-opacity-75 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all"
                      >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
              
              {/* Информация */}
              <div className="lg:w-80 p-4 border-l bg-gray-50">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Задание</label>
                    <p className="text-sm font-medium">{task.title}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Объект</label>
                    <p className="text-sm">{task.object?.name || 'Неизвестный объект'}</p>
                  </div>
                  
                  {task.completedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Дата выполнения</label>
                      <p className="text-sm">{formatDate(task.completedAt)}</p>
                    </div>
                  )}
                  
                  {task.completedBy && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Исполнитель</label>
                      <p className="text-sm">{task.completedBy.name}</p>
                    </div>
                  )}
                  
                  {task.completionNote && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Комментарий</label>
                      <p className="text-sm">{task.completionNote}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
