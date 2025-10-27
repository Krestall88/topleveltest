'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';

interface TechTask {
  id?: string;
  name: string;
  workType: string;
  frequency: string;
  description?: string;
  estimatedTime?: number;
  siteId?: string;
  zoneId?: string;
  roomGroupId?: string;
  roomId?: string;
}

interface TechTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  techTask: TechTask | null; // null = создание, не null = редактирование
  objectId: string;
  onSave: () => void;
}

const WORK_TYPES = [
  'Уборка',
  'Мойка окон',
  'Дезинфекция',
  'Вывоз мусора',
  'Уход за растениями',
  'Техническое обслуживание',
  'Общие работы',
  'Другое'
];

const FREQUENCIES = [
  'Ежедневно',
  'Еженедельно',
  'Ежемесячно',
  'Ежеквартально',
  'Раз в полгода',
  'Ежегодно',
  'По необходимости'
];

export default function TechTaskModal({
  isOpen,
  onClose,
  techTask,
  objectId,
  onSave,
}: TechTaskModalProps) {
  const isEdit = techTask !== null;

  const [formData, setFormData] = useState<TechTask>({
    name: '',
    workType: 'Общие работы',
    frequency: 'По необходимости',
    description: '',
    estimatedTime: undefined,
    siteId: undefined,
    zoneId: undefined,
    roomGroupId: undefined,
    roomId: undefined,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Структура объекта
  const [objectStructure, setObjectStructure] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [roomGroups, setRoomGroups] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  // Загрузка структуры объекта
  useEffect(() => {
    if (isOpen && objectId) {
      loadObjectStructure();
    }
  }, [isOpen, objectId]);

  const loadObjectStructure = async () => {
    try {
      const response = await fetch(`/api/objects/${objectId}`);
      if (response.ok) {
        const data = await response.json();
        setObjectStructure(data);
        setSites(data.sites || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки структуры:', error);
    }
  };

  useEffect(() => {
    if (techTask) {
      setFormData({
        name: techTask.name || '',
        workType: techTask.workType || 'Общие работы',
        frequency: techTask.frequency || 'По необходимости',
        description: techTask.description || '',
        estimatedTime: techTask.estimatedTime,
        siteId: techTask.siteId,
        zoneId: techTask.zoneId,
        roomGroupId: techTask.roomGroupId,
        roomId: techTask.roomId,
      });
      
      // Загружаем зависимые списки при редактировании
      if (techTask.siteId && objectStructure) {
        const site = objectStructure.sites?.find((s: any) => s.id === techTask.siteId);
        if (site) {
          setZones(site.zones || []);
          if (techTask.zoneId) {
            const zone = site.zones?.find((z: any) => z.id === techTask.zoneId);
            if (zone) {
              setRoomGroups(zone.roomGroups || []);
              if (techTask.roomGroupId) {
                const roomGroup = zone.roomGroups?.find((rg: any) => rg.id === techTask.roomGroupId);
                if (roomGroup) {
                  setRooms(roomGroup.rooms || []);
                }
              }
            }
          }
        }
      }
    } else {
      setFormData({
        name: '',
        workType: 'Общие работы',
        frequency: 'По необходимости',
        description: '',
        estimatedTime: undefined,
        siteId: undefined,
        zoneId: undefined,
        roomGroupId: undefined,
        roomId: undefined,
      });
      setZones([]);
      setRoomGroups([]);
      setRooms([]);
    }
  }, [techTask, isOpen, objectStructure]);

  // Обработчики каскадных селектов
  const handleSiteChange = (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    setFormData({ ...formData, siteId, zoneId: undefined, roomGroupId: undefined, roomId: undefined });
    setZones(site?.zones || []);
    setRoomGroups([]);
    setRooms([]);
  };

  const handleZoneChange = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    setFormData({ ...formData, zoneId, roomGroupId: undefined, roomId: undefined });
    setRoomGroups(zone?.roomGroups || []);
    setRooms([]);
  };

  const handleRoomGroupChange = (roomGroupId: string) => {
    const roomGroup = roomGroups.find(rg => rg.id === roomGroupId);
    setFormData({ ...formData, roomGroupId, roomId: undefined });
    setRooms(roomGroup?.rooms || []);
  };

  const handleRoomChange = (roomId: string) => {
    setFormData({ ...formData, roomId });
  };

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
        workType: formData.workType,
        frequency: formData.frequency,
        objectId: objectId,
      };

      if (formData.description?.trim()) {
        payload.description = formData.description.trim();
      }
      if (formData.estimatedTime) {
        payload.estimatedTime = parseInt(String(formData.estimatedTime));
      }
      if (formData.siteId) payload.siteId = formData.siteId;
      if (formData.zoneId) payload.zoneId = formData.zoneId;
      if (formData.roomGroupId) payload.roomGroupId = formData.roomGroupId;
      if (formData.roomId) payload.roomId = formData.roomId;

      const url = isEdit ? `/api/techcards/${techTask!.id}` : '/api/techcards';
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Ошибка ответа сервера:', response.status, errorData);
        console.error('❌ Отправленные данные:', payload);
        throw new Error(errorData.error || errorData.message || `Ошибка ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Техзадание успешно ${isEdit ? 'обновлено' : 'создано'}:`, result);

      onSave();
      onClose();
    } catch (err: any) {
      console.error(`Ошибка сохранения техзадания:`, err);
      setError(err.message || `Не удалось сохранить техзадание`);
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
            {isEdit ? `Редактирование техзадания` : `Добавить техзадание`}
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
              placeholder="Например: Влажная уборка офиса"
              className="mt-1"
            />
          </div>

          {/* Тип работ и Частота */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="workType">Тип работ</Label>
              <Select
                value={formData.workType}
                onValueChange={(value) => setFormData({ ...formData, workType: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  {WORK_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="frequency">Частота выполнения</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq} value={freq}>
                      {freq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Описание */}
          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Подробное описание работ"
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Ориентировочное время */}
          <div>
            <Label htmlFor="estimatedTime">Ориентировочное время (минут)</Label>
            <Input
              id="estimatedTime"
              type="number"
              value={formData.estimatedTime || ''}
              onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="30"
              className="mt-1"
            />
          </div>

          {/* Привязка к структуре */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Привязка к структуре объекта</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Участок */}
              <div>
                <Label htmlFor="siteId">Участок</Label>
                <Select
                  value={formData.siteId || 'none'}
                  onValueChange={(value) => handleSiteChange(value === 'none' ? '' : value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Не выбрано" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value="none">Не выбрано</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Зона */}
              <div>
                <Label htmlFor="zoneId">Зона</Label>
                <Select
                  value={formData.zoneId || 'none'}
                  onValueChange={(value) => handleZoneChange(value === 'none' ? '' : value)}
                  disabled={!formData.siteId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Не выбрано" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value="none">Не выбрано</SelectItem>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Группа помещений */}
              <div>
                <Label htmlFor="roomGroupId">Группа помещений</Label>
                <Select
                  value={formData.roomGroupId || 'none'}
                  onValueChange={(value) => handleRoomGroupChange(value === 'none' ? '' : value)}
                  disabled={!formData.zoneId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Не выбрано" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value="none">Не выбрано</SelectItem>
                    {roomGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Помещение */}
              <div>
                <Label htmlFor="roomId">Помещение</Label>
                <Select
                  value={formData.roomId || 'none'}
                  onValueChange={(value) => handleRoomChange(value === 'none' ? '' : value)}
                  disabled={!formData.roomGroupId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Не выбрано" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value="none">Не выбрано</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            <X className="h-4 w-4 mr-1" />
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
