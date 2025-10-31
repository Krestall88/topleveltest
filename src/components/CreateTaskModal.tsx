'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: any) => void;
  objects: Array<{
    id: string;
    name: string;
    address: string;
  }>;
}

export default function CreateTaskModal({ 
  isOpen, 
  onClose, 
  onTaskCreated, 
  objects 
}: CreateTaskModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    objectId: '',
    attachments: [] as string[]
  });
  const [newAttachment, setNewAttachment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim() || !formData.objectId) {
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/additional-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          objectId: formData.objectId,
          source: 'ADMIN',
          attachments: formData.attachments
        }),
      });

      if (response.ok) {
        const newTask = await response.json();
        onTaskCreated(newTask);
        handleClose();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка создания задания:', error);
      alert('Ошибка создания задания');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      content: '',
      objectId: '',
      attachments: []
    });
    setNewAttachment('');
    onClose();
  };

  const addAttachment = () => {
    if (newAttachment.trim()) {
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, newAttachment.trim()]
      }));
      setNewAttachment('');
    }
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Создать дополнительное задание</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          {/* Объект */}
          <div className="space-y-2">
            <Label htmlFor="object">Объект *</Label>
            <Select 
              value={formData.objectId} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, objectId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите объект..." />
              </SelectTrigger>
              <SelectContent>
                {objects.map((object) => (
                  <SelectItem key={object.id} value={object.id}>
                    <div>
                      <div className="font-medium">{object.name}</div>
                      <div className="text-sm text-gray-500">{object.address}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Заголовок */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm">Заголовок *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Краткое описание..."
              maxLength={100}
              required
              className="text-sm"
            />
            <p className="text-xs text-gray-500">
              {formData.title.length}/100 символов
            </p>
          </div>

          {/* Содержание */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-sm">Описание *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Подробное описание..."
              rows={3}
              required
              className="text-sm resize-none"
            />
          </div>

          {/* Вложения */}
          <div className="space-y-2">
            <Label className="text-sm">Вложения (ссылки)</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newAttachment}
                onChange={(e) => setNewAttachment(e.target.value)}
                placeholder="Ссылка..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAttachment())}
                className="text-sm"
              />
              <Button 
                type="button" 
                onClick={addAttachment}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 sm:mr-0" />
                <span className="sm:hidden ml-2">Добавить</span>
              </Button>
            </div>
            
            {formData.attachments.length > 0 && (
              <div className="space-y-1">
                {formData.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <span className="flex-1 text-xs md:text-sm truncate break-all">{attachment}</span>
                    <Button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Кнопки */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={isCreating || !formData.title.trim() || !formData.content.trim() || !formData.objectId}
              className="w-full sm:w-auto"
            >
              {isCreating ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
