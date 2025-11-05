'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Building2, Camera, MessageSquare, Save, X } from 'lucide-react';

interface ObjectCompletionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  objectId: string;
  objectName: string;
}

const ObjectCompletionSettingsModal: React.FC<ObjectCompletionSettingsModalProps> = ({
  isOpen,
  onClose,
  objectId,
  objectName
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [requireComment, setRequireComment] = useState(false);

  // Загрузка текущих настроек
  useEffect(() => {
    if (isOpen && objectId) {
      loadSettings();
    }
  }, [isOpen, objectId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/objects/${objectId}`);
      if (response.ok) {
        const data = await response.json();
        setRequirePhoto(data.requirePhotoForCompletion || false);
        setRequireComment(data.requireCommentForCompletion || false);
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/objects/${objectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirePhotoForCompletion: requirePhoto,
          requireCommentForCompletion: requireComment
        })
      });

      if (response.ok) {
        onClose();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message || 'Не удалось сохранить настройки'}`);
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      alert('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Настройки завершения задач
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Объект: <span className="font-semibold">{objectName}</span>
          </p>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-gray-500">
            Загрузка настроек...
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Требовать фото */}
            <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Camera className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <Label htmlFor="require-photo" className="text-base font-medium cursor-pointer">
                    Требовать фото
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Менеджер должен прикрепить фотографию при завершении задачи
                  </p>
                </div>
              </div>
              <Switch
                id="require-photo"
                checked={requirePhoto}
                onCheckedChange={setRequirePhoto}
              />
            </div>

            {/* Требовать комментарий */}
            <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <Label htmlFor="require-comment" className="text-base font-medium cursor-pointer">
                    Требовать комментарий
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Менеджер должен оставить комментарий при завершении задачи
                  </p>
                </div>
              </div>
              <Switch
                id="require-comment"
                checked={requireComment}
                onCheckedChange={setRequireComment}
              />
            </div>

            {/* Информация */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Примечание:</strong> Эти настройки применяются ко всем задачам данного объекта. 
                Если требования не выполнены, задача не будет завершена.
              </p>
            </div>
          </div>
        )}

        {/* Кнопки */}
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={saving}
          >
            <X className="w-4 h-4 mr-2" />
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={loading || saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ObjectCompletionSettingsModal;
