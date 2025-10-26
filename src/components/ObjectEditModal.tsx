'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit, Save, X } from 'lucide-react';

interface Manager {
  id: string;
  name: string;
}

interface Site {
  id: string;
  name: string;
  description?: string;
  area?: number;
  zones: Zone[];
}

interface Zone {
  id: string;
  name: string;
  description?: string;
  area?: number;
  roomGroups: RoomGroup[];
}

interface RoomGroup {
  id: string;
  name: string;
  description?: string;
  area?: number;
  rooms: Room[];
}

interface Room {
  id: string;
  name: string;
  description?: string;
  area?: number;
}

interface TechCard {
  id: string;
  name: string;
  workType: string;
  frequency: string;
  description?: string;
  period?: string;
  seasonality?: string;
}

interface CleaningObject {
  id: string;
  name: string;
  address: string;
  description?: string;
  totalArea?: number;
  notes?: string;
  manager?: Manager;
  sites: Site[];
  rooms: Room[];
  techCards: TechCard[];
}

interface ObjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  objectId: string;
  onUpdate: () => void;
}

export default function ObjectEditModal({ isOpen, onClose, objectId, onUpdate }: ObjectEditModalProps) {
  const [object, setObject] = useState<CleaningObject | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [editingItem, setEditingItem] = useState<{ type: string; id: string } | null>(null);

  // Загрузка данных объекта
  useEffect(() => {
    if (isOpen && objectId) {
      loadObjectData();
      loadManagers();
    }
  }, [isOpen, objectId]);

  const loadObjectData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/objects/${objectId}`);
      if (response.ok) {
        const data = await response.json();
        setObject(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки объекта:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      const response = await fetch('/api/managers');
      if (response.ok) {
        const data = await response.json();
        setManagers(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки менеджеров:', error);
    }
  };

  // Сохранение основной информации
  const saveBasicInfo = async () => {
    if (!object) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/objects/${objectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: object.name,
          address: object.address,
          description: object.description,
          totalArea: object.totalArea,
          notes: object.notes,
          managerId: object.manager?.id
        })
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    } finally {
      setSaving(false);
    }
  };

  // Удаление объекта
  const deleteObject = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот объект? Это действие нельзя отменить.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/objects/${objectId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
    } finally {
      setSaving(false);
    }
  };

  // Создание нового участка
  const createSite = async () => {
    const name = prompt('Название участка:');
    if (!name) return;

    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          objectId: objectId,
          managerId: object?.manager?.id
        })
      });

      if (response.ok) {
        loadObjectData();
      }
    } catch (error) {
      console.error('Ошибка создания участка:', error);
    }
  };

  // Удаление участка
  const deleteSite = async (siteId: string) => {
    if (!confirm('Удалить участок?')) return;

    try {
      const response = await fetch(`/api/sites/${siteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadObjectData();
      }
    } catch (error) {
      console.error('Ошибка удаления участка:', error);
    }
  };

  // Создание техкарты
  const createTechCard = async () => {
    const name = prompt('Название техкарты:');
    if (!name) return;

    try {
      const response = await fetch('/api/tech-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          workType: 'Общие работы',
          frequency: 'По необходимости',
          objectId: objectId
        })
      });

      if (response.ok) {
        loadObjectData();
      }
    } catch (error) {
      console.error('Ошибка создания техкарты:', error);
    }
  };

  // Редактирование техкарты
  const editTechCard = async (techCard: TechCard) => {
    const name = prompt('Название техкарты:', techCard.name);
    if (!name) return;

    const workType = prompt('Тип работы:', techCard.workType);
    if (!workType) return;

    const frequency = prompt('Периодичность:', techCard.frequency);
    if (!frequency) return;

    try {
      const response = await fetch(`/api/techcards/${techCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          workType,
          frequency,
          description: techCard.description
        })
      });

      if (response.ok) {
        loadObjectData();
      }
    } catch (error) {
      console.error('Ошибка редактирования техкарты:', error);
    }
  };

  // Удаление техкарты
  const deleteTechCard = async (techCardId: string) => {
    if (!confirm('Удалить техкарту? Это также удалит все связанные задачи.')) return;

    try {
      const response = await fetch(`/api/techcards/${techCardId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadObjectData();
      }
    } catch (error) {
      console.error('Ошибка удаления техкарты:', error);
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Загрузка данных объекта...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!object) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Редактирование объекта: {object.name}</span>
            <div className="flex gap-2">
              <Button
                onClick={saveBasicInfo}
                disabled={saving}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-1" />
                Сохранить
              </Button>
              <Button
                onClick={deleteObject}
                disabled={saving}
                size="sm"
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Удалить объект
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Основная информация</TabsTrigger>
            <TabsTrigger value="structure">Структура</TabsTrigger>
            <TabsTrigger value="techcards">Техкарты</TabsTrigger>
            <TabsTrigger value="stats">Статистика</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Название объекта</Label>
                <Input
                  id="name"
                  value={object.name}
                  onChange={(e) => setObject({ ...object, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="manager">Менеджер</Label>
                <Select
                  value={object.manager?.id || ''}
                  onValueChange={(value) => {
                    const manager = managers.find(m => m.id === value);
                    setObject({ ...object, manager });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите менеджера" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Адрес</Label>
              <Textarea
                id="address"
                value={object.address}
                onChange={(e) => setObject({ ...object, address: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalArea">Общая площадь (м²)</Label>
                <Input
                  id="totalArea"
                  type="number"
                  value={object.totalArea || ''}
                  onChange={(e) => setObject({ ...object, totalArea: parseFloat(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label htmlFor="description">Описание</Label>
                <Input
                  id="description"
                  value={object.description || ''}
                  onChange={(e) => setObject({ ...object, description: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                value={object.notes || ''}
                onChange={(e) => setObject({ ...object, notes: e.target.value })}
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="structure" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Структура объекта</h3>
              <Button onClick={createSite} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Добавить участок
              </Button>
            </div>

            <div className="space-y-4">
              {object.sites.map((site) => (
                <div key={site.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{site.name}</h4>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {site.zones.length} зон
                      </Badge>
                      <Button
                        onClick={() => deleteSite(site.id)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {site.description && (
                    <p className="text-sm text-gray-600 mb-2">{site.description}</p>
                  )}
                  
                  {site.area && (
                    <p className="text-sm text-gray-500">Площадь: {site.area} м²</p>
                  )}

                  {site.zones.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-200">
                      <h5 className="font-medium text-sm mb-2">Зоны:</h5>
                      {site.zones.map((zone) => (
                        <div key={zone.id} className="mb-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{zone.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {zone.roomGroups.reduce((sum, rg) => sum + rg.rooms.length, 0)} помещений
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {object.rooms.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Помещения объекта ({object.rooms.length})</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {object.rooms.slice(0, 10).map((room) => (
                      <div key={room.id} className="text-sm p-2 bg-gray-50 rounded">
                        {room.name}
                      </div>
                    ))}
                  </div>
                  {object.rooms.length > 10 && (
                    <p className="text-sm text-gray-500 mt-2">
                      ... и еще {object.rooms.length - 10} помещений
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="techcards" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Техкарты ({object.techCards.length})</h3>
              <Button onClick={createTechCard} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Добавить техкарту
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {object.techCards.map((techCard) => (
                <div key={techCard.id} className="border rounded p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{techCard.name}</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {techCard.workType}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {techCard.frequency}
                        </Badge>
                        {techCard.period && (
                          <Badge variant="default" className="text-xs">
                            {techCard.period}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => editTechCard(techCard)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => deleteTechCard(techCard.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <h3 className="text-lg font-semibold">Статистика объекта</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{object.sites.length}</div>
                <div className="text-sm text-blue-800">Участков</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {object.sites.reduce((sum, site) => sum + site.zones.length, 0)}
                </div>
                <div className="text-sm text-green-800">Зон</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{object.rooms.length}</div>
                <div className="text-sm text-purple-800">Помещений</div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{object.techCards.length}</div>
                <div className="text-sm text-orange-800">Техкарт</div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Общая информация</h4>
              <div className="space-y-1 text-sm">
                <p><strong>ID объекта:</strong> {object.id}</p>
                <p><strong>Менеджер:</strong> {object.manager?.name || 'Не назначен'}</p>
                <p><strong>Общая площадь:</strong> {object.totalArea ? `${object.totalArea} м²` : 'Не указана'}</p>
                <p><strong>Адрес:</strong> {object.address}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
