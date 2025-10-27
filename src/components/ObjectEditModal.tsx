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
import StructureItemModal, { StructureType } from '@/components/StructureItemModal';
import TechTaskModal from '@/components/TechTaskModal';

interface Manager {
  id: string;
  name: string;
}

interface Site {
  id: string;
  name: string;
  description?: string;
  area?: number;
  comment?: string;
  zones?: Zone[];
}

interface Zone {
  id: string;
  name: string;
  description?: string;
  area?: number;
  roomGroups?: RoomGroup[];
}

interface RoomGroup {
  id: string;
  name: string;
  description?: string;
  area?: number;
  rooms?: Room[];
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
  const [editingTechTask, setEditingTechTask] = useState<TechCard | null>(null);
  const [showTechTaskModal, setShowTechTaskModal] = useState(false);

  // Состояние для управления структурой
  const [structureModal, setStructureModal] = useState<{
    isOpen: boolean;
    type: StructureType | null;
    item: any;
    parentId: string;
  }>({ isOpen: false, type: null, item: null, parentId: '' });

  // Загрузка данных объекта
  useEffect(() => {
    console.log('🔄 ObjectEditModal useEffect:', { isOpen, objectId });
    if (isOpen && objectId) {
      console.log('🔄 ObjectEditModal: Загружаем данные...');
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
        console.log('🔄 ObjectEditModal: Загружены данные объекта:', data);
        console.log('🏭 Участков:', data.sites?.length || 0);
        console.log('🏭 Участки:', data.sites);
        console.log('🏠 Помещений:', data.rooms?.length || 0);
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

  // Управление структурой
  const openStructureModal = (type: StructureType, parentId: string, item: any = null) => {
    setStructureModal({ isOpen: true, type, item, parentId });
  };

  const closeStructureModal = () => {
    setStructureModal({ isOpen: false, type: null, item: null, parentId: '' });
  };

  const handleStructureSaved = async () => {
    await loadObjectData();
    closeStructureModal();
  };

  // Удаление элементов структуры
  const deleteStructureItem = async (type: StructureType, id: string, name: string) => {
    const typeNames = {
      site: 'участок',
      zone: 'зону',
      roomGroup: 'группу помещений',
      room: 'помещение',
      cleaningObjectItem: 'объект уборки',
    };

    if (!confirm(`Удалить ${typeNames[type]} "${name}"?`)) return;

    const apiPaths = {
      site: '/api/sites',
      zone: '/api/zones',
      roomGroup: '/api/room-groups',
      room: '/api/rooms',
      cleaningObjectItem: '/api/cleaning-object-items',
    };

    try {
      const response = await fetch(`${apiPaths[type]}/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadObjectData();
      }
    } catch (error) {
      console.error(`Ошибка удаления ${typeNames[type]}:`, error);
    }
  };

  // Создание техзадания
  const createTechTask = () => {
    setEditingTechTask(null);
    setShowTechTaskModal(true);
  };

  // Редактирование техзадания
  const editTechTask = (techTask: TechCard) => {
    setEditingTechTask(techTask);
    setShowTechTaskModal(true);
  };

  const handleTechTaskSaved = () => {
    loadObjectData();
    setShowTechTaskModal(false);
    setEditingTechTask(null);
  };

  // Удаление техзадания
  const deleteTechTask = async (techCardId: string) => {
    if (!confirm('Удалить техзадание? Это также удалит все связанные задачи.')) return;

    try {
      const response = await fetch(`/api/techcards/${techCardId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadObjectData();
      }
    } catch (error) {
      console.error('Ошибка удаления техзадания:', error);
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Загрузка данных объекта</DialogTitle>
          </DialogHeader>
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
            <TabsTrigger value="techcards">Техзадания</TabsTrigger>
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
              <Button onClick={() => openStructureModal('site', objectId)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Добавить участок
              </Button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {/* Участки */}
              {!object.sites || object.sites.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Структура объекта пуста</p>
                  <p className="text-sm mt-2">Нажмите "Добавить участок" для начала</p>
                </div>
              ) : (
                object.sites.map((site) => (
                <div key={site.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-700">🏭 {site.name}</h4>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => openStructureModal('site', objectId, site)}
                        size="sm"
                        variant="ghost"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => openStructureModal('zone', site.id)}
                        size="sm"
                        variant="ghost"
                        title="Добавить зону"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => deleteStructureItem('site', site.id, site.name)}
                        size="sm"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  
                  {site.description && (
                    <p className="text-sm text-gray-600 mb-2">{site.description}</p>
                  )}
                  
                  <div className="flex gap-4 text-sm text-gray-500 mb-3">
                    {site.area && <span>📏 {site.area} м²</span>}
                    {site.comment && <span>📝 {site.comment}</span>}
                  </div>

                  {/* Зоны */}
                  {site.zones && site.zones.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-blue-200 space-y-3">
                      {site.zones.map((zone) => (
                        <div key={zone.id} className="bg-blue-50 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm text-blue-800">🗺️ {zone.name}</span>
                            <div className="flex gap-1">
                              <Button
                                onClick={() => openStructureModal('zone', site.id, zone)}
                                size="sm"
                                variant="ghost"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => openStructureModal('roomGroup', zone.id)}
                                size="sm"
                                variant="ghost"
                                title="Добавить группу"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => deleteStructureItem('zone', zone.id, zone.name)}
                                size="sm"
                                variant="ghost"
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          {zone.area && <span className="text-xs text-gray-600">📏 {zone.area} м²</span>}

                          {/* Группы помещений */}
                          {zone.roomGroups && zone.roomGroups.length > 0 && (
                            <div className="mt-2 pl-3 border-l-2 border-green-200 space-y-2">
                              {zone.roomGroups.map((roomGroup) => (
                                <div key={roomGroup.id} className="bg-green-50 rounded p-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-xs text-green-800">📁 {roomGroup.name}</span>
                                    <div className="flex gap-1">
                                      <Button
                                        onClick={() => openStructureModal('roomGroup', zone.id, roomGroup)}
                                        size="sm"
                                        variant="ghost"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        onClick={() => openStructureModal('room', roomGroup.id)}
                                        size="sm"
                                        variant="ghost"
                                        title="Добавить помещение"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        onClick={() => deleteStructureItem('roomGroup', roomGroup.id, roomGroup.name)}
                                        size="sm"
                                        variant="ghost"
                                      >
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Помещения */}
                                  {roomGroup.rooms && roomGroup.rooms.length > 0 && (
                                    <div className="mt-1 pl-2 space-y-1">
                                      {roomGroup.rooms.map((room) => (
                                        <div key={room.id} className="flex items-center justify-between bg-white rounded px-2 py-1">
                                          <span className="text-xs">🚪 {room.name}</span>
                                          <div className="flex gap-1">
                                            <Button
                                              onClick={() => openStructureModal('room', roomGroup.id, room)}
                                              size="sm"
                                              variant="ghost"
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              onClick={() => deleteStructureItem('room', room.id, room.name)}
                                              size="sm"
                                              variant="ghost"
                                            >
                                              <Trash2 className="h-3 w-3 text-red-500" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
              )}

              {/* Помещения без структуры */}
              {object.rooms.length > 0 && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Помещения без структуры ({object.rooms.length})</h4>
                    <Button onClick={() => openStructureModal('room', objectId)} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Добавить
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {object.rooms.slice(0, 10).map((room) => (
                      <div key={room.id} className="flex items-center justify-between text-sm p-2 bg-white rounded">
                        <span>🚪 {room.name}</span>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => openStructureModal('room', objectId, room)}
                            size="sm"
                            variant="ghost"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => deleteStructureItem('room', room.id, room.name)}
                            size="sm"
                            variant="ghost"
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
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
              <h3 className="text-lg font-semibold">Техзадания ({object.techCards.length})</h3>
              <Button onClick={createTechTask} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Добавить техзадание
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
                        onClick={() => editTechTask(techCard)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => deleteTechTask(techCard.id)}
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
                  {object.sites.reduce((sum, site) => sum + (site.zones?.length || 0), 0)}
                </div>
                <div className="text-sm text-green-800">Зон</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{object.rooms.length}</div>
                <div className="text-sm text-purple-800">Помещений</div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{object.techCards.length}</div>
                <div className="text-sm text-orange-800">Техзаданий</div>
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

      {/* Модальное окно создания/редактирования техзадания */}
      <TechTaskModal
        isOpen={showTechTaskModal}
        onClose={() => {
          setShowTechTaskModal(false);
          setEditingTechTask(null);
        }}
        techTask={editingTechTask}
        objectId={objectId}
        onSave={handleTechTaskSaved}
      />

      {/* Универсальное модальное окно для структуры */}
      {structureModal.type && (
        <StructureItemModal
          isOpen={structureModal.isOpen}
          onClose={closeStructureModal}
          type={structureModal.type}
          item={structureModal.item}
          parentId={structureModal.parentId}
          objectId={objectId}
          managers={managers}
          onSave={handleStructureSaved}
        />
      )}
    </Dialog>
  );
}
