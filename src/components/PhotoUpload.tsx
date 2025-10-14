'use client';

import { useState, useRef } from 'react';
import { Upload, X, Camera, Image } from 'lucide-react';

interface PhotoUploadProps {
  onPhotoUploaded: (url: string, comment?: string) => void;
  objectId?: string;
  checklistId?: string;
  requestId?: string;
  taskId?: string;
  disabled?: boolean;
}

export default function PhotoUpload({ 
  onPhotoUploaded, 
  objectId, 
  checklistId, 
  requestId, 
  taskId,
  disabled = false 
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [comment, setComment] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file || uploading) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const { url } = await uploadResponse.json();
        
        // Создаем фотоотчёт в базе данных
        const photoResponse = await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            comment: comment || undefined,
            uploaderId: 'temp-user-id', // TODO: Получать из авторизации
            objectId,
            checklistId,
            requestId,
            taskId,
          }),
        });

        if (photoResponse.ok) {
          onPhotoUploaded(url, comment);
          setComment('');
        } else {
          console.error('Ошибка при создании фотоотчёта');
        }
      } else {
        console.error('Ошибка при загрузке файла');
      }
    } catch (error) {
      console.error('Ошибка при загрузке:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileUpload(imageFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Область загрузки */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        
        {uploading ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600">Загрузка...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center space-x-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <Camera className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Перетащите фото сюда или нажмите для выбора
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, GIF до 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Поле комментария */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Комментарий к фото (необязательно)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Добавьте описание к фотографии..."
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled || uploading}
        />
      </div>
    </div>
  );
}
