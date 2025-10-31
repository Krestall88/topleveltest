'use client';

import { useState } from 'react';
import { X, Calendar, User, MessageSquare, Download, Trash2 } from 'lucide-react';

interface PhotoReport {
  id: string;
  url: string;
  comment?: string;
  createdAt: string;
  uploader: {
    name: string;
    email: string;
  };
  object?: {
    name: string;
    address: string;
  };
  checklist?: {
    id: string;
    date: string;
  };
  request?: {
    id: string;
    title: string;
  };
}

interface PhotoGalleryProps {
  photos: PhotoReport[];
  onPhotoClick?: (photo: PhotoReport) => void;
  onPhotoDeleted?: (photoId: string) => void;
}

export default function PhotoGallery({ photos, onPhotoClick, onPhotoDeleted }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoReport | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePhotoClick = (photo: PhotoReport) => {
    setSelectedPhoto(photo);
    onPhotoClick?.(photo);
  };

  const downloadPhoto = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Галерея */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square"
          >
            <img
              src={photo.url}
              alt={photo.comment || 'Фотоотчёт'}
              className="w-full h-full object-cover transition-transform group-hover:scale-105 cursor-pointer"
              onClick={() => handlePhotoClick(photo)}
            />
            
            {/* Оверлей с информацией */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex flex-col justify-between p-3">
              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                {onPhotoDeleted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPhotoDeleted(photo.id);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
                    title="Удалить фотографию"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center space-x-1 text-xs">
                  <User className="h-3 w-3" />
                  <span>{photo.uploader.name}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs mt-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(photo.createdAt)}</span>
                </div>
                {photo.comment && (
                  <div className="flex items-center space-x-1 text-xs mt-1">
                    <MessageSquare className="h-3 w-3" />
                    <span className="truncate">{photo.comment}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {photos.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">📷</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет фотографий</h3>
          <p className="text-gray-500">Загрузите первую фотографию для создания отчёта</p>
        </div>
      )}

      {/* Модальное окно для просмотра фото */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Фотоотчёт</h3>
              <div className="flex items-center space-x-2">
                {onPhotoDeleted && (
                  <button
                    onClick={() => {
                      onPhotoDeleted(selectedPhoto.id);
                      setSelectedPhoto(null);
                    }}
                    className="p-2 text-red-500 hover:text-red-700"
                    title="Удалить"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => downloadPhoto(selectedPhoto.url, `photo-${selectedPhoto.id}.jpg`)}
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
              <div className="flex-1 p-4">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.comment || 'Фотоотчёт'}
                  className="w-full h-auto max-h-[60vh] object-contain rounded"
                />
              </div>
              
              {/* Информация */}
              <div className="lg:w-80 p-4 border-l bg-gray-50">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Загрузил</label>
                    <p className="text-sm">{selectedPhoto.uploader.name}</p>
                    <p className="text-xs text-gray-500">{selectedPhoto.uploader.email}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Дата загрузки</label>
                    <p className="text-sm">{formatDate(selectedPhoto.createdAt)}</p>
                  </div>
                  
                  {selectedPhoto.object && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Объект</label>
                      <p className="text-sm">{selectedPhoto.object.name}</p>
                      <p className="text-xs text-gray-500">{selectedPhoto.object.address}</p>
                    </div>
                  )}
                  
                  {selectedPhoto.checklist && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Чек-лист</label>
                      <p className="text-sm">
                        {new Date(selectedPhoto.checklist.date).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  )}
                  
                  {selectedPhoto.request && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Заявка</label>
                      <p className="text-sm">{selectedPhoto.request.title}</p>
                    </div>
                  )}
                  
                  {selectedPhoto.comment && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Комментарий</label>
                      <p className="text-sm">{selectedPhoto.comment}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
