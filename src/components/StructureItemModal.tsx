'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';

// Типы элементов структуры
export type StructureType = 'site' | 'zone' | 'roomGroup' | 'room' | 'cleaningObjectItem';

interface StructureItem {
  id?: string;
  name: string;
  description?: string;
  area?: number;
  comment?: string;
  managerId?: string;
}

interface StructureItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: StructureType;
  item: StructureItem | null; // null = создание, не null = редактирование
  parentId: string; // ID родительского элемента
  objectId: string; // ID объекта (для всех элементов)
  managers?: Array<{ id: string; name: string }>; // Список менеджеров (для участков)
  onSave: () => void;
}

// Конфигурация для каждого типа
const TYPE_CONFIG = {
  site: {
    title: 'Участок',
    apiPath: '/api/sites',
    fields: ['name', 'description', 'area', 'comment', 'managerId'],
    parentField: 'objectId',
  },
  zone: {
    title: 'Зона',
    apiPath: '/api/zones',
    fields: ['name', 'description', 'area'],
    parentField: 'siteId',
  },
  roomGroup: {
    title: 'Группа помещений',
    apiPath: '/api/room-groups',
    fields: ['name', 'description', 'area'],
    parentField: 'zoneId',
  },
  room: {
    title: 'Помещение',
    apiPath: '/api/rooms',
    fields: ['name', 'description', 'area'],
    parentField: 'roomGroupId',
  },
  cleaningObjectItem: {
    title: 'Объект уборки',
    apiPath: '/api/cleaning-object-items',
    fields: ['name', 'description'],
    parentField: 'roomId',
  },
};

export default function StructureItemModal({
  isOpen,
  onClose,
  type,
  item,
  parentId,
  objectId,
  managers = [],
  onSave,
}: StructureItemModalProps) {
  const config = TYPE_CONFIG[type];
  const isEdit = item !== null;

  const [formData, setFormData] = useState<StructureItem>({
    name: '',
    description: '',
    area: undefined,
    comment: '',
    managerId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        area: item.area,
        comment: item.comment || '',
        managerId: item.managerId || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        area: undefined,
        comment: '',
        managerId: '',
      });
    }
  }, [item, isOpen]);

  const handleSave = async () => {
    // Валидация
    if (!formData.name.trim()) {
      setError('Название обязательно');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
      };

      // Добавляем parentField (siteId, zoneId, roomGroupId, roomId)
      if (parentId) {
        payload[config.parentField] = parentId;
      }

      // Для Room всегда нужен objectId
      if (type === 'room') {
        payload.objectId = objectId;
      }

      // Добавляем только заполненные поля
      if (config.fields.includes('description') && formData.description?.trim()) {
        payload.description = formData.description.trim();
      }
      if (config.fields.includes('area') && formData.area) {
        payload.area = parseFloat(String(formData.area));
      }
      if (config.fields.includes('comment') && formData.comment?.trim()) {
        payload.comment = formData.comment.trim();
      }
      if (config.fields.includes('managerId') && formData.managerId && formData.managerId !== 'none') {
        payload.managerId = formData.managerId;
      }

      const url = isEdit ? `${config.apiPath}/${item!.id}` : config.apiPath;
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Ошибка ответа сервера:', response.status, errorData);
        throw new Error(errorData.message || `Ошибка ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ ${config.title} успешно ${isEdit ? 'обновлен' : 'создан'}:`, result);

      onSave();
      onClose();
    } catch (err: any) {
      console.error(`Ошибка сохранения ${config.title}:`, err);
      setError(err.message || `Не удалось сохранить ${config.title.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Редактирование: ${config.title}` : `Добавить ${config.title}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Название */}
          <div>
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={`Например: ${type === 'site' ? 'Участок №1' : type === 'zone' ? 'Зона А' : type === 'roomGroup' ? 'Группа 1' : type === 'room' ? 'Кабинет 101' : 'Пол'}`}
              className="mt-1"
            />
          </div>

          {/* Описание */}
          {config.fields.includes('description') && (
            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Дополнительная информация"
                rows={3}
                className="mt-1"
              />
            </div>
          )}

          {/* Площадь */}
          {config.fields.includes('area') && (
            <div>
              <Label htmlFor="area">Площадь (м²)</Label>
              <Input
                id="area"
                type="number"
                step="0.01"
                value={formData.area || ''}
                onChange={(e) => setFormData({ ...formData, area: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          )}

          {/* Комментарий (для участков) */}
          {config.fields.includes('comment') && (
            <div>
              <Label htmlFor="comment">Комментарий</Label>
              <Textarea
                id="comment"
                value={formData.comment || ''}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Дополнительные примечания"
                rows={2}
                className="mt-1"
              />
            </div>
          )}

          {/* Менеджер (для участков) */}
          {config.fields.includes('managerId') && managers.length > 0 && (
            <div>
              <Label htmlFor="managerId">Менеджер</Label>
              <Select
                value={formData.managerId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, managerId: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Выберите менеджера (необязательно)" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="none">Без менеджера</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            <X className="h-4 w-4 mr-1" />
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
