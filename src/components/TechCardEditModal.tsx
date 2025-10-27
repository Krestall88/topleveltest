'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';

interface TechCard {
  id: string;
  name: string;
  workType: string;
  frequency: string;
  description?: string;
}

interface TechCardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  techCard: TechCard | null;
  onSave: () => void;
}

// Типы работ
const WORK_TYPE_OPTIONS = [
  'Общие работы',
  'Уборка помещений',
  'Мытье окон',
  'Мытье полов',
  'Уборка территории',
  'Дезинфекция',
  'Вывоз мусора',
  'Техническое обслуживание',
  'Другое',
];

export default function TechCardEditModal({ isOpen, onClose, techCard, onSave }: TechCardEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    workType: '',
    frequency: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (techCard) {
      setFormData({
        name: techCard.name || '',
        workType: techCard.workType || '',
        frequency: techCard.frequency || '',
        description: techCard.description || '',
      });
    }
  }, [techCard]);

  const handleSave = async () => {
    if (!techCard) return;

    // Валидация
    if (!formData.name.trim()) {
      setError('Название техкарты обязательно');
      return;
    }
    if (!formData.workType.trim()) {
      setError('Тип работы обязателен');
      return;
    }
    if (!formData.frequency.trim()) {
      setError('Периодичность обязательна');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const response = await fetch(`/api/techcards/${techCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Ошибка ответа сервера:', response.status, errorData);
        throw new Error(errorData.message || `Ошибка ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Техкарта успешно обновлена:', result);

      onSave();
      onClose();
    } catch (err: any) {
      console.error('Ошибка сохранения техкарты:', err);
      setError(err.message || 'Не удалось сохранить техкарту');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  if (!techCard) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Редактирование техкарты</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="name">Название техкарты *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Например: Мытье окон"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="workType">Тип работы *</Label>
            <Select
              value={formData.workType}
              onValueChange={(value) => setFormData({ ...formData, workType: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Выберите тип работы" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                {WORK_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="frequency">Периодичность *</Label>
            <Input
              id="frequency"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              placeholder="Например: Ежедневно, 2 раза в неделю, По мере необходимости"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Примеры: Ежедневно, Еженедельно, 2 раза в неделю, Ежемесячно, По мере необходимости
            </p>
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Дополнительная информация о задаче"
              rows={4}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
          >
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
