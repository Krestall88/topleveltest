'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Building, MapPin } from 'lucide-react';

interface ObjectStructure {
  id: string;
  objectName: string;
  objectAddress?: string;
  siteName?: string;
  zoneName?: string;
  roomGroupName?: string;
  roomName?: string;
  cleaningObjectName?: string;
  techCardName: string;
  frequency: string;
  notes?: string;
  workType?: string;
  description?: string;
  createdAt: string;
}

interface ObjectStructureManagerProps {
  objectId: string;
  objectName: string;
  onStructureChange?: () => void;
}

export default function ObjectStructureManager({ 
  objectId, 
  objectName, 
  onStructureChange 
}: ObjectStructureManagerProps) {
  const [structures, setStructures] = useState<ObjectStructure[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStructure, setEditingStructure] = useState<ObjectStructure | null>(null);
  
  const [formData, setFormData] = useState({
    siteName: '',
    zoneName: '',
    roomGroupName: '',
    roomName: '',
    cleaningObjectName: '',
    techCardName: '',
    frequency: '',
    notes: '',
    workType: '',
    description: ''
  });

  useEffect(() => {
    loadStructures();
  }, [objectId]);

  const loadStructures = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/objects/${objectId}/structures`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStructures(data.structures || []);
      } else {
        console.error('Ошибка загрузки структур:', response.status);
      }
    } catch (error) {
      console.error('Ошибка загрузки структур:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const url = editingStructure 
        ? `/api/objects/${objectId}/structures`
        : `/api/objects/${objectId}/structures`;
      
      const method = editingStructure ? 'PUT' : 'POST';
      
      const payload = editingStructure 
        ? { ...formData, structureId: editingStructure.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await loadStructures();
        resetForm();
        onStructureChange?.();
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения структуры');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (structure: ObjectStructure) => {
    setEditingStructure(structure);
    setFormData({
      siteName: structure.siteName || '',
      zoneName: structure.zoneName || '',
      roomGroupName: structure.roomGroupName || '',
      roomName: structure.roomName || '',
      cleaningObjectName: structure.cleaningObjectName || '',
      techCardName: structure.techCardName || '',
      frequency: structure.frequency || '',
      notes: structure.notes || '',
      workType: structure.workType || '',
      description: structure.description || ''
    });
    setIsEditing(true);
  };

  const handleDelete = async (structureId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту структуру?')) {
      return;
    }

    try {
      const response = await fetch(`/api/objects/${objectId}/structures?structureId=${structureId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await loadStructures();
        onStructureChange?.();
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка удаления структуры');
    }
  };

  const resetForm = () => {
    setFormData({
      siteName: '',
      zoneName: '',
      roomGroupName: '',
      roomName: '',
      cleaningObjectName: '',
      techCardName: '',
      frequency: '',
      notes: '',
      workType: '',
      description: ''
    });
    setEditingStructure(null);
    setIsEditing(false);
  };

  const frequencyOptions = [
    { value: 'daily', label: 'Ежедневно' },
    { value: 'weekly', label: 'Еженедельно' },
    { value: 'monthly', label: 'Ежемесячно' },
    { value: 'quarterly', label: 'Ежеквартально' },
    { value: 'yearly', label: 'Ежегодно' },
    { value: 'as_needed', label: 'По необходимости' }
  ];

  const workTypeOptions = [
    { value: 'cleaning', label: 'Уборка' },
    { value: 'maintenance', label: 'Обслуживание' },
    { value: 'inspection', label: 'Осмотр' },
    { value: 'repair', label: 'Ремонт' },
    { value: 'other', label: 'Прочее' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Структура объекта: {objectName}</h3>
        </div>
        <Button onClick={() => setIsEditing(true)} disabled={loading}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить структуру
        </Button>
      </div>

      {/* Форма добавления/редактирования */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingStructure ? 'Редактировать структуру' : 'Добавить новую структуру'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">Участок</Label>
                  <Input
                    id="siteName"
                    value={formData.siteName}
                    onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                    placeholder="Название участка"
                  />
                </div>
                
                <div>
                  <Label htmlFor="zoneName">Зона</Label>
                  <Input
                    id="zoneName"
                    value={formData.zoneName}
                    onChange={(e) => setFormData({ ...formData, zoneName: e.target.value })}
                    placeholder="Название зоны"
                  />
                </div>
                
                <div>
                  <Label htmlFor="roomGroupName">Группа помещений</Label>
                  <Input
                    id="roomGroupName"
                    value={formData.roomGroupName}
                    onChange={(e) => setFormData({ ...formData, roomGroupName: e.target.value })}
                    placeholder="Название группы помещений"
                  />
                </div>
                
                <div>
                  <Label htmlFor="roomName">Помещение</Label>
                  <Input
                    id="roomName"
                    value={formData.roomName}
                    onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                    placeholder="Название помещения"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cleaningObjectName">Объект уборки</Label>
                  <Input
                    id="cleaningObjectName"
                    value={formData.cleaningObjectName}
                    onChange={(e) => setFormData({ ...formData, cleaningObjectName: e.target.value })}
                    placeholder="Что убирается"
                  />
                </div>
                
                <div>
                  <Label htmlFor="techCardName">Техническое задание *</Label>
                  <Input
                    id="techCardName"
                    value={formData.techCardName}
                    onChange={(e) => setFormData({ ...formData, techCardName: e.target.value })}
                    placeholder="Название техзадания"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="frequency">Периодичность *</Label>
                  <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите периодичность" />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="workType">Тип работы</Label>
                  <Select value={formData.workType} onValueChange={(value) => setFormData({ ...formData, workType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип работы" />
                    </SelectTrigger>
                    <SelectContent>
                      {workTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Подробное описание работ"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Примечания</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Дополнительные примечания"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Отмена
                </Button>
                <Button type="submit" disabled={loading || !formData.techCardName || !formData.frequency}>
                  {loading ? 'Сохранение...' : editingStructure ? 'Обновить' : 'Создать'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Список структур */}
      <div className="space-y-4">
        {loading && structures.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Загрузка структур...</div>
          </div>
        ) : structures.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Структуры не созданы</div>
            <Button onClick={() => setIsEditing(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Добавить первую структуру
            </Button>
          </div>
        ) : (
          structures.map((structure) => (
            <Card key={structure.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{structure.techCardName}</span>
                      <Badge variant="secondary">{structure.frequency}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                      {structure.siteName && <div>Участок: {structure.siteName}</div>}
                      {structure.zoneName && <div>Зона: {structure.zoneName}</div>}
                      {structure.roomGroupName && <div>Группа: {structure.roomGroupName}</div>}
                      {structure.roomName && <div>Помещение: {structure.roomName}</div>}
                    </div>
                    
                    {structure.cleaningObjectName && (
                      <div className="text-sm text-gray-600">
                        Объект уборки: {structure.cleaningObjectName}
                      </div>
                    )}
                    
                    {structure.description && (
                      <div className="text-sm text-gray-700">
                        {structure.description}
                      </div>
                    )}
                    
                    {structure.notes && (
                      <div className="text-xs text-gray-500 italic">
                        Примечания: {structure.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(structure)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(structure.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
