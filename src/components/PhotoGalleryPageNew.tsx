'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Calendar, User, Building2, Eye, Download, Filter, X, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface PhotoReport {
  id: string;
  url: string;
  comment: string | null;
  createdAt: string;
  uploader: {
    id: string;
    name: string;
  } | null;
  object: {
    id: string;
    name: string;
  } | null;
  room?: {
    id: string;
    name: string;
    site?: {
      id: string;
      name: string;
    };
    area?: {
      id: string;
      name: string;
    };
    roomGroup?: {
      id: string;
      name: string;
    };
  } | null;
  task?: {
    id: string;
    description: string;
  } | null;
}

export default function PhotoGalleryPageNew() {
  const [photos, setPhotos] = useState<PhotoReport[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<PhotoReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoReport | null>(null);
  
  // Данные для фильтров
  const [objects, setObjects] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  
  // Фильтры
  const [filters, setFilters] = useState({
    objectId: 'all',
    managerId: 'all',
    dateFrom: '',
    dateTo: '',
    specificDate: ''
  });

  // Загрузка фотоотчетов
  const loadPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/photos/upload?limit=500`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
        setFilteredPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки фотоотчетов:', error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка объектов
  const loadObjects = async () => {
    try {
      const response = await fetch('/api/objects');
      if (response.ok) {
        const data = await response.json();
        setObjects(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
    }
  };

  // Загрузка менеджеров
  const loadManagers = async () => {
    try {
      const response = await fetch('/api/users?role=MANAGER');
      if (response.ok) {
        const data = await response.json();
        setManagers(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки менеджеров:', error);
    }
  };

  useEffect(() => {
    loadPhotos();
    loadObjects();
    loadManagers();
  }, []);

  // Применение фильтров
  useEffect(() => {
    let filtered = [...photos];

    // Фильтр по объекту
    if (filters.objectId !== 'all') {
      filtered = filtered.filter(p => p.object?.id === filters.objectId);
    }

    // Фильтр по менеджеру
    if (filters.managerId !== 'all') {
      filtered = filtered.filter(p => p.uploader?.id === filters.managerId);
    }

    // Фильтр по конкретной дате
    if (filters.specificDate) {
      const targetDate = new Date(filters.specificDate).toDateString();
      filtered = filtered.filter(p => {
        const photoDate = new Date(p.createdAt).toDateString();
        return photoDate === targetDate;
      });
    } else {
      // Фильтр по периоду
      if (filters.dateFrom) {
        filtered = filtered.filter(p => 
          new Date(p.createdAt) >= new Date(filters.dateFrom)
        );
      }

      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(p => 
          new Date(p.createdAt) <= endDate
        );
      }
    }

    setFilteredPhotos(filtered);
  }, [photos, filters]);

  const clearFilters = () => {
    setFilters({
      objectId: 'all',
      managerId: 'all',
      dateFrom: '',
      dateTo: '',
      specificDate: ''
    });
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту фотографию?')) {
      return;
    }

    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPhotos(photos.filter(p => p.id !== photoId));
        setSelectedPhoto(null);
      } else {
        alert('Ошибка при удалении фотографии');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Ошибка при удалении фотографии');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Загрузка фотоотчетов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Camera className="h-6 w-6" />
          Фотоотчеты
        </h1>
        <p className="text-gray-600">Все фотографии из системы</p>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold">Фильтры</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="ml-auto"
            >
              <X className="h-4 w-4 mr-1" />
              Сбросить
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Объект */}
            <div>
              <label className="text-sm font-medium mb-2 block">Объект</label>
              <Select 
                value={filters.objectId} 
                onValueChange={(value) => setFilters({...filters, objectId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Все объекты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все объекты</SelectItem>
                  {objects.map(obj => (
                    <SelectItem key={obj.id} value={obj.id}>
                      {obj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Менеджер */}
            <div>
              <label className="text-sm font-medium mb-2 block">Менеджер</label>
              <Select 
                value={filters.managerId} 
                onValueChange={(value) => setFilters({...filters, managerId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Все менеджеры" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все менеджеры</SelectItem>
                  {managers.map(manager => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Конкретная дата */}
            <div>
              <label className="text-sm font-medium mb-2 block">Конкретная дата</label>
              <Input
                type="date"
                value={filters.specificDate}
                onChange={(e) => setFilters({...filters, specificDate: e.target.value, dateFrom: '', dateTo: ''})}
              />
            </div>

            {/* Дата от */}
            <div>
              <label className="text-sm font-medium mb-2 block">Период от</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value, specificDate: ''})}
                disabled={!!filters.specificDate}
              />
            </div>

            {/* Дата до */}
            <div>
              <label className="text-sm font-medium mb-2 block">Период до</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value, specificDate: ''})}
                disabled={!!filters.specificDate}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Найдено фото: {filteredPhotos.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">
                  Объектов: {new Set(filteredPhotos.map(p => p.object?.id).filter(Boolean)).size}
                </span>
              </div>
            </div>
            <Button variant="outline" onClick={loadPhotos}>
              Обновить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Галерея фотографий */}
      {filteredPhotos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="aspect-square relative bg-gray-100">
                <Image
                  src={photo.url}
                  alt="Фотоотчет"
                  fill
                  className="object-cover cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <CardContent className="p-3">
                <div className="space-y-2">
                  {photo.object?.name && (
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Building2 className="h-3 w-3 text-blue-500" />
                      <span className="truncate">{photo.object.name}</span>
                    </div>
                  )}
                  
                  {photo.uploader?.name && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <User className="h-3 w-3" />
                      <span className="truncate">{photo.uploader.name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(photo.createdAt)}</span>
                  </div>
                  
                  {photo.comment && (
                    <p className="text-xs text-gray-600 line-clamp-2">{photo.comment}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Фотографии не найдены</h3>
            <p className="text-gray-500">Попробуйте изменить параметры фильтрации</p>
          </CardContent>
        </Card>
      )}

      {/* Модальное окно просмотра фото */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Фотоотчет</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeletePhoto(selectedPhoto.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedPhoto.url;
                      link.download = `photo-${selectedPhoto.id}.jpg`;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Скачать
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="relative w-full h-96">
                <Image
                  src={selectedPhoto.url}
                  alt="Фотоотчет"
                  fill
                  className="object-contain"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {selectedPhoto.object && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Объект</label>
                    <p className="text-sm">{selectedPhoto.object.name}</p>
                  </div>
                )}
                
                {selectedPhoto.uploader && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Загрузил</label>
                    <p className="text-sm">{selectedPhoto.uploader.name}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Дата загрузки</label>
                  <p className="text-sm">{formatDate(selectedPhoto.createdAt)}</p>
                </div>
                
                {selectedPhoto.comment && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Комментарий</label>
                    <p className="text-sm">{selectedPhoto.comment}</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
