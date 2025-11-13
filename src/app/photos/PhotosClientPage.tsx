'use client';

import { useState, useEffect } from 'react';
import { Plus, Filter, Search, Calendar, Building, FileText, Camera } from 'lucide-react';
import PhotoUpload from '@/components/PhotoUpload';
import PhotoGallery from '@/components/PhotoGallery';

interface PhotoReport {
  id: string;
  url: string;
  comment?: string;
  createdAt: string;
  uploader: {
    id: string;
    name: string;
    email: string;
  };
  object?: {
    id: string;
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
  task?: {
    id: string;
    title: string;
    status: string;
    checklist: {
      object: {
        name: string;
      };
      room?: {
        name: string;
      };
    };
  };
}

interface Object {
  id: string;
  name: string;
  address: string;
}

interface PhotosClientPageProps {
  initialPhotos: PhotoReport[];
  objects: Object[];
}

const PhotosClientPage = ({ initialPhotos, objects }: PhotosClientPageProps) => {
  const [photos, setPhotos] = useState<PhotoReport[]>(initialPhotos);
  const [filteredPhotos, setFilteredPhotos] = useState<PhotoReport[]>(initialPhotos);
  const [showUpload, setShowUpload] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    objectId: '',
    dateFrom: '',
    dateTo: '',
    type: '', // 'object', 'checklist', 'request', ''
  });

  // Применение фильтров
  useEffect(() => {
    let filtered = photos;

    // Поиск по комментарию
    if (filters.search) {
      filtered = filtered.filter(photo =>
        photo.comment?.toLowerCase().includes(filters.search.toLowerCase()) ||
        photo.uploader.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Фильтр по объекту
    if (filters.objectId) {
      filtered = filtered.filter(photo => photo.object?.id === filters.objectId);
    }

    // Фильтр по дате
    if (filters.dateFrom) {
      filtered = filtered.filter(photo => 
        new Date(photo.createdAt) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(photo => 
        new Date(photo.createdAt) <= new Date(filters.dateTo + 'T23:59:59')
      );
    }

    // Фильтр по типу
    if (filters.type) {
      filtered = filtered.filter(photo => {
        switch (filters.type) {
          case 'object':
            return photo.object && !photo.checklist && !photo.request && !photo.task;
          case 'checklist':
            return photo.checklist;
          case 'request':
            return photo.request;
          case 'task':
            return photo.task;
          default:
            return true;
        }
      });
    }

    setFilteredPhotos(filtered);
  }, [photos, filters]);

  const handlePhotoUploaded = async (url: string, comment?: string) => {
    // Обновляем список фотографий
    const response = await fetch('/api/photos');
    if (response.ok) {
      const updatedPhotos = await response.json();
      setPhotos(updatedPhotos);
    }
    setShowUpload(false);
  };

  const handlePhotoDeleted = async (photoId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту фотографию?')) {
      return;
    }

    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Обновляем список фотографий
        setPhotos(photos.filter(p => p.id !== photoId));
      } else {
        alert('Ошибка при удалении фотографии');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Ошибка при удалении фотографии');
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      objectId: '',
      dateFrom: '',
      dateTo: '',
      type: '',
    });
  };

  const getTypeLabel = (photo: PhotoReport) => {
    if (photo.task) return 'Задание';
    if (photo.checklist) return 'Чек-лист';
    if (photo.request) return 'Заявка';
    if (photo.object) return 'Объект';
    return 'Общее';
  };

  const getTypeIcon = (photo: PhotoReport) => {
    if (photo.task) return <FileText className="h-4 w-4" />;
    if (photo.checklist) return <FileText className="h-4 w-4" />;
    if (photo.request) return <FileText className="h-4 w-4" />;
    if (photo.object) return <Building className="h-4 w-4" />;
    return <Camera className="h-4 w-4" />;
  };

  return (
    <div className="responsive-container space-y-4 sm:space-y-6 py-4 sm:py-6">
      {/* Заголовок и кнопка добавления */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg sm:text-3xl font-semibold">
            Фотоотчёты ({filteredPhotos.length})
          </h2>
          {(filters.search || filters.objectId || filters.dateFrom || filters.dateTo || filters.type) && (
            <button
              onClick={clearFilters}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-800"
            >
              Сбросить
            </button>
          )}
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Загрузить фото</span>
        </button>
      </div>

      {/* Форма загрузки */}
      {showUpload && (
        <div className="bg-white border rounded-lg p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-medium mb-4">Загрузка фотографии</h3>
          <PhotoUpload
            onPhotoUploaded={handlePhotoUploaded}
            objectId={filters.objectId || undefined}
          />
          <div className="mt-4 pt-4 border-t flex justify-end space-x-3">
            <button
              onClick={() => setShowUpload(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className="bg-white border rounded-lg p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Поиск..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base border rounded w-full pl-10"
            />
          </div>

          {/* Объект */}
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <select
              value={filters.objectId}
              onChange={(e) => setFilters({ ...filters, objectId: e.target.value })}
              className="px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base border rounded w-full pl-10"
            >
              <option value="">Все объекты</option>
              {objects.map((object) => (
                <option key={object.id} value={object.id}>
                  {object.name}
                </option>
              ))}
            </select>
          </div>

          {/* Тип */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Все типы</option>
              <option value="task">Задания</option>
              <option value="checklist">Чек-листы</option>
              <option value="request">Заявки</option>
              <option value="object">Объекты</option>
            </select>
          </div>

          {/* Дата от */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Дата до */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Всего фото</p>
              <p className="text-2xl font-bold text-gray-900">{photos.length}</p>
            </div>
            <Camera className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">По заданиям</p>
              <p className="text-2xl font-bold text-gray-900">
                {photos.filter(p => p.task).length}
              </p>
            </div>
            <FileText className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">По чек-листам</p>
              <p className="text-2xl font-bold text-gray-900">
                {photos.filter(p => p.checklist).length}
              </p>
            </div>
            <FileText className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">По заявкам</p>
              <p className="text-2xl font-bold text-gray-900">
                {photos.filter(p => p.request).length}
              </p>
            </div>
            <FileText className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">По объектам</p>
              <p className="text-2xl font-bold text-gray-900">
                {photos.filter(p => p.object && !p.checklist && !p.request && !p.task).length}
              </p>
            </div>
            <Building className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Галерея фотографий */}
      <div className="bg-white border rounded-lg p-6">
        <PhotoGallery photos={filteredPhotos} onPhotoDeleted={handlePhotoDeleted} />
      </div>
    </div>
  );
};

export default PhotosClientPage;
