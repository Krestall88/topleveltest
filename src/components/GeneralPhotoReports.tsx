'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload, Calendar, User, MessageSquare, X, Eye } from 'lucide-react';

interface PhotoReport {
  id: string;
  photos: string[];
  comment: string;
  createdAt: string;
  createdBy: {
    name: string;
    role: string;
  };
  objectName: string;
}

interface GeneralPhotoReportsProps {
  managerId?: string;
  objectId?: string;
}

export default function GeneralPhotoReports({ managerId, objectId }: GeneralPhotoReportsProps) {
  const [reports, setReports] = useState<PhotoReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [comment, setComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<PhotoReport | null>(null);

  // Загрузка отчетов
  const loadReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (managerId) params.append('managerId', managerId);
      if (objectId) params.append('objectId', objectId);

      const response = await fetch(`/api/photo-reports/general?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      } else {
        console.error('Ошибка загрузки отчетов');
      }
    } catch (error) {
      console.error('Ошибка сети:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [managerId, objectId]);

  // Обработка выбора файлов
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setSelectedFiles(imageFiles);
  };

  // Загрузка фотоотчета
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Выберите хотя бы одно фото');
      return;
    }

    try {
      setUploading(true);

      // Создаем FormData для загрузки файлов
      const formData = new FormData();
      selectedFiles.forEach((file, index) => {
        formData.append(`photo_${index}`, file);
      });
      formData.append('comment', comment);
      if (objectId) formData.append('objectId', objectId);

      const response = await fetch('/api/photo-reports/general', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        setShowUploadModal(false);
        setSelectedFiles([]);
        setComment('');
        loadReports(); // Перезагружаем список
        alert('Фотоотчет успешно загружен!');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message || 'Не удалось загрузить фотоотчет'}`);
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      alert('Ошибка сети. Проверьте подключение.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Заголовок и кнопка добавления */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Общие фотоотчеты</h3>
          <p className="text-sm text-gray-600">
            Фото выполненных чек-листов без привязки к конкретным задачам
          </p>
        </div>
        <Button 
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Camera className="w-4 h-4 mr-2" />
          Добавить фото
        </Button>
      </div>

      {/* Список отчетов */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          Загрузка отчетов...
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Camera className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Фотоотчетов пока нет</p>
          <p className="text-sm">Добавьте первый фотоотчет</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{report.createdBy.name}</span>
                  <Badge variant="outline">{report.createdBy.role}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  {new Date(report.createdAt).toLocaleString('ru-RU')}
                </div>
              </div>

              {report.comment && (
                <div className="mb-3 p-3 bg-gray-50 rounded-md">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                    <p className="text-sm">{report.comment}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {report.photos.length} фото
                  </span>
                  {report.objectName && (
                    <Badge variant="secondary">{report.objectName}</Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReport(report)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Просмотр
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно загрузки */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Добавить фотоотчет
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Выбор файлов */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Выберите фото
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full p-2 border rounded-md"
              />
              {selectedFiles.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  Выбрано файлов: {selectedFiles.length}
                </p>
              )}
            </div>

            {/* Комментарий */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Комментарий (необязательно)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Добавьте описание к фотоотчету..."
                rows={3}
              />
            </div>

            {/* Кнопки */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
              >
                Отмена
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Загрузка...' : 'Загрузить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модальное окно просмотра */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  <span>Фотоотчет</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Информация об отчете */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{selectedReport.createdBy.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      {new Date(selectedReport.createdAt).toLocaleString('ru-RU')}
                    </span>
                  </div>
                </div>
                {selectedReport.comment && (
                  <p className="text-sm text-gray-700">{selectedReport.comment}</p>
                )}
              </div>

              {/* Галерея фото */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedReport.photos.map((photo, index) => (
                  <div key={index} className="aspect-square">
                    <img
                      src={photo}
                      alt={`Фото ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border"
                    />
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
