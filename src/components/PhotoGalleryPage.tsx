'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Calendar, User, Building2, Eye, Download } from 'lucide-react';
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
    name: string;
    area: string;
  } | null;
  task?: {
    id: string;
    description: string;
  } | null;
  hierarchy?: {
    object: string;
    address: string;
    room: string;
    area: string;
  };
}

export default function PhotoGalleryPage() {
  const [photos, setPhotos] = useState<PhotoReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoReport | null>(null);
  const [filterObject, setFilterObject] = useState<string>('all');
  const [objects, setObjects] = useState<any[]>([]);

  // Загрузка фотоотчетов
  const loadPhotos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterObject && filterObject !== 'all') {
        params.append('objectId', filterObject);
      }
      params.append('limit', '100');

      console.log('🔍 Загружаем фотоотчеты с параметрами:', params.toString());
      const response = await fetch(`/api/photos/upload?${params}`, {
        credentials: 'include'
      });
      console.log('🔍 Ответ API фотоотчетов:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Данные фотоотчетов:', data);
        console.log('🔍 Первое фото:', data.photos?.[0]);
        setPhotos(data.photos || []);
      } else {
        console.error('❌ Ошибка API фотоотчетов:', response.status, await response.text());
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки фотоотчетов:', error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка объектов для фильтра
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

  useEffect(() => {
    loadObjects();
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [filterObject]);

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
      {/* Заголовок и фильтры */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="h-6 w-6" />
            Фотоотчеты
          </h1>
          <p className="text-gray-600">Все фотографии из системы</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={filterObject} onValueChange={setFilterObject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Фильтр по объекту" />
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
          
          <Button variant="outline" onClick={loadPhotos}>
            Обновить
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Всего фото: {photos.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">
                  Объектов: {new Set(photos.map(p => p.object?.id).filter(Boolean)).size}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Галерея фотографий */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative bg-gray-100">
                <Image
                  src={photo.url}
                  alt="Фотоотчет"
                  fill
                  className="object-cover cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                />
                <div className="absolute top-2 right-2">
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
                  {(photo.hierarchy?.object || photo.object?.name) && (
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Building2 className="h-3 w-3 text-blue-500" />
                      <span className="truncate">{photo.hierarchy?.object || photo.object?.name}</span>
                    </div>
                  )}

                  {photo.hierarchy?.room && photo.hierarchy.room !== 'Не указано' && (
                    <div className="flex items-center gap-1 text-xs text-purple-600">
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {photo.hierarchy.room}
                      </Badge>
                    </div>
                  )}
                  
                  {photo.uploader && (
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <User className="h-3 w-3 text-green-500" />
                      <span className="truncate">{photo.uploader.name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(photo.createdAt)}</span>
                  </div>
                  
                  {photo.comment && (
                    <p className="text-xs text-gray-700 line-clamp-2">
                      {photo.comment}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет фотоотчетов</h3>
            <p className="text-gray-600">
              {filterObject !== 'all' 
                ? 'По выбранному объекту фотоотчеты не найдены'
                : 'В системе пока нет загруженных фотоотчетов'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Модальное окно просмотра фото */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Детали фотоотчета</DialogTitle>
          </DialogHeader>
          
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={selectedPhoto.url}
                  alt="Фотоотчет"
                  fill
                  className="object-contain"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <label className="text-sm font-medium text-blue-700 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Объект:
                    </label>
                    <p className="text-sm font-medium mt-1">
                      {selectedPhoto.hierarchy?.object || selectedPhoto.object?.name || 'Не указан'}
                    </p>
                    {selectedPhoto.hierarchy?.address && selectedPhoto.hierarchy.address !== 'Не указан' && (
                      <p className="text-xs text-blue-600 mt-1">{selectedPhoto.hierarchy.address}</p>
                    )}
                  </div>

                  {selectedPhoto.hierarchy?.room && selectedPhoto.hierarchy.room !== 'Не указано' && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-purple-700">Помещение:</label>
                      <p className="text-sm font-medium mt-1">{selectedPhoto.hierarchy.room}</p>
                      {selectedPhoto.hierarchy?.area && selectedPhoto.hierarchy.area !== 'Не указана' && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {selectedPhoto.hierarchy.area}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="bg-green-50 p-3 rounded-lg">
                    <label className="text-sm font-medium text-green-700 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Менеджер:
                    </label>
                    <p className="text-sm font-medium mt-1">{selectedPhoto.uploader?.name || 'Неизвестно'}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Дата загрузки:
                    </label>
                    <p className="text-sm font-medium mt-1">{formatDate(selectedPhoto.createdAt)}</p>
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <label className="text-sm font-medium text-yellow-700">Комментарий:</label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 rounded border min-h-[100px]">
                    {selectedPhoto.comment || 'Комментарий не добавлен'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedPhoto.url, '_blank')}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Скачать
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedPhoto(null)}
                >
                  Закрыть
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
