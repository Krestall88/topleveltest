'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Camera, FileText, Building, Home, CheckSquare } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  selected: boolean;
}

interface CleaningObject {
  id: string;
  name: string;
  address: string;
  rooms: Room[];
  selected: boolean;
}

interface CompletionRequirements {
  photo: boolean;
  comment: boolean;
  minPhotos?: number;
  photoDescription?: string;
  commentDescription?: string;
}

interface CompletionRequirementsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  objectId?: string; // Если указан, то настройки только для этого объекта
}

export default function CompletionRequirementsManager({ 
  isOpen, 
  onClose, 
  objectId 
}: CompletionRequirementsManagerProps) {
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Настройки требований
  const [requirements, setRequirements] = useState<CompletionRequirements>({
    photo: false,
    comment: false,
    minPhotos: 1,
    photoDescription: '',
    commentDescription: ''
  });

  // Режимы применения
  const [applyMode, setApplyMode] = useState<'all' | 'selected' | 'rooms'>('rooms');

  const fetchObjects = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/api/objects';
      if (objectId) {
        url = `/api/objects/${objectId}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Не удалось загрузить объекты');
      }

      const data = await response.json();
      
      if (objectId) {
        // Один объект
        setObjects([{
          ...data,
          selected: true,
          rooms: data.rooms?.map((room: any) => ({ ...room, selected: false })) || []
        }]);
      } else {
        // Все объекты
        setObjects(data.map((obj: any) => ({
          ...obj,
          selected: false,
          rooms: obj.rooms?.map((room: any) => ({ ...room, selected: false })) || []
        })));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchObjects();
      setSuccess(null);
      setError(null);
    }
  }, [isOpen, objectId]);

  const handleObjectToggle = (objectId: string) => {
    setObjects(prev => prev.map(obj => 
      obj.id === objectId 
        ? { ...obj, selected: !obj.selected }
        : obj
    ));
  };

  const handleRoomToggle = (objectId: string, roomId: string) => {
    setObjects(prev => prev.map(obj => 
      obj.id === objectId 
        ? {
            ...obj,
            rooms: obj.rooms.map(room => 
              room.id === roomId 
                ? { ...room, selected: !room.selected }
                : room
            )
          }
        : obj
    ));
  };

  const handleSelectAllObjects = () => {
    const allSelected = objects.every(obj => obj.selected);
    setObjects(prev => prev.map(obj => ({ ...obj, selected: !allSelected })));
  };

  const handleSelectAllRooms = (objectId: string) => {
    setObjects(prev => prev.map(obj => 
      obj.id === objectId 
        ? {
            ...obj,
            rooms: obj.rooms.map(room => ({ 
              ...room, 
              selected: !obj.rooms.every(r => r.selected) 
            }))
          }
        : obj
    ));
  };

  const handleApplySettings = async () => {
    try {
      setSaving(true);
      setError(null);

      // Определить список объектов для обновления
      let targetObjects: { objectId: string; roomIds?: string[] }[] = [];

      if (applyMode === 'all') {
        targetObjects = objects.map(obj => ({ objectId: obj.id }));
      } else if (applyMode === 'selected') {
        targetObjects = objects
          .filter(obj => obj.selected)
          .map(obj => ({ objectId: obj.id }));
      } else if (applyMode === 'rooms') {
        objects.forEach(obj => {
          const selectedRooms = obj.rooms.filter(room => room.selected);
          if (selectedRooms.length > 0) {
            targetObjects.push({
              objectId: obj.id,
              roomIds: selectedRooms.map(room => room.id)
            });
          }
        });
      }

      if (targetObjects.length === 0) {
        setError('Выберите объекты или помещения для применения настроек');
        return;
      }

      // Применить настройки
      const updatePromises = targetObjects.map(async ({ objectId, roomIds }) => {
        const response = await fetch(`/api/objects/${objectId}/settings`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requirePhotoForCompletion: requirements.photo,
            requireCommentForCompletion: requirements.comment,
            completionRequirements: requirements,
            // Если указаны конкретные помещения, можно добавить логику
            // для применения настроек только к ним
            roomIds: roomIds
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Ошибка обновления ${objectId}: ${errorData.error}`);
        }

        return response.json();
      });

      await Promise.all(updatePromises);

      setSuccess(`Настройки успешно применены к ${targetObjects.length} объект(ам)`);
      
      // Автоматически закрыть через 2 секунды
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка применения настроек');
    } finally {
      setSaving(false);
    }
  };

  const selectedObjectsCount = objects.filter(obj => obj.selected).length;
  const selectedRoomsCount = objects.reduce((sum, obj) => 
    sum + obj.rooms.filter(room => room.selected).length, 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>
              {objectId ? 'Настройка требований к завершению' : 'Массовая настройка требований'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Настройки требований */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <CheckSquare className="w-4 h-4" />
                <span>Требования к завершению чек-листов</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Обязательность фото */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="require-photo" className="text-sm font-medium">
                    Обязательное фото для закрытия чек-листов
                  </Label>
                  <div className="text-xs text-gray-600 mt-1">
                    Менеджеры не смогут завершить чек-листы без загрузки фотографий
                  </div>
                </div>
                <Switch
                  id="require-photo"
                  checked={requirements.photo}
                  onCheckedChange={(checked: boolean) => 
                    setRequirements({ ...requirements, photo: checked })
                  }
                />
              </div>

              {/* Обязательность комментария */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="require-comment" className="text-sm font-medium">
                    Обязательный комментарий для закрытия чек-листов
                  </Label>
                  <div className="text-xs text-gray-600 mt-1">
                    Менеджеры должны оставить комментарий при завершении чек-листа
                  </div>
                </div>
                <Switch
                  id="require-comment"
                  checked={requirements.comment}
                  onCheckedChange={(checked: boolean) => 
                    setRequirements({ ...requirements, comment: checked })
                  }
                />
              </div>

              {/* Детальные настройки */}
              {(requirements.photo || requirements.comment) && (
                <div className="border-t pt-4 space-y-3">
                  <Label className="text-sm font-medium">Детальные настройки</Label>
                  
                  {requirements.photo && (
                    <div className="space-y-2">
                      <Label htmlFor="min-photos" className="text-xs">Минимальное количество фото</Label>
                      <Input
                        id="min-photos"
                        type="number"
                        min="1"
                        max="10"
                        value={requirements.minPhotos || 1}
                        onChange={(e) => setRequirements({
                          ...requirements,
                          minPhotos: parseInt(e.target.value) || 1
                        })}
                        className="w-20"
                      />
                      
                      <Label htmlFor="photo-hint" className="text-xs">Подсказка для фото</Label>
                      <Input
                        id="photo-hint"
                        placeholder="Например: Сфотографируйте общий вид помещений..."
                        value={requirements.photoDescription || ''}
                        onChange={(e) => setRequirements({
                          ...requirements,
                          photoDescription: e.target.value
                        })}
                      />
                    </div>
                  )}

                  {requirements.comment && (
                    <div className="space-y-2">
                      <Label htmlFor="comment-hint" className="text-xs">Подсказка для комментария</Label>
                      <Textarea
                        id="comment-hint"
                        placeholder="Например: Опишите качество уборки, особенности объекта..."
                        value={requirements.commentDescription || ''}
                        onChange={(e) => setRequirements({
                          ...requirements,
                          commentDescription: e.target.value
                        })}
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Выбор объектов и помещений */}
          {(
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4" />
                    <span>Применить к объектам</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Выбрано: {selectedObjectsCount} объект(ов), {selectedRoomsCount} помещений
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Режимы применения */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Режим применения</Label>
                  <div className="space-y-2">
                    {!objectId && (
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="applyMode"
                          value="all"
                          checked={applyMode === 'all'}
                          onChange={(e) => setApplyMode(e.target.value as any)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Ко всем объектам</span>
                      </label>
                    )}
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="applyMode"
                        value="selected"
                        checked={applyMode === 'selected'}
                        onChange={(e) => setApplyMode(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{objectId ? 'К объекту целиком' : 'К выбранным объектам'}</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="applyMode"
                        value="rooms"
                        checked={applyMode === 'rooms'}
                        onChange={(e) => setApplyMode(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">К выбранным помещениям</span>
                    </label>
                  </div>
                </div>

                {/* Список объектов */}
                {(applyMode === 'selected' || applyMode === 'rooms') && (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {applyMode === 'selected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllObjects}
                        className="mb-2"
                      >
                        {objects.every(obj => obj.selected) ? 'Снять выбор со всех' : 'Выбрать все объекты'}
                      </Button>
                    )}

                    {objects.map((object) => (
                      <div key={object.id} className="border rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          {applyMode === 'selected' && (
                            <input
                              type="checkbox"
                              checked={object.selected}
                              onChange={() => handleObjectToggle(object.id)}
                              className="w-4 h-4"
                            />
                          )}
                          <Building className="w-4 h-4 text-blue-600" />
                          <div>
                            <div className="font-medium text-sm">{object.name}</div>
                            <div className="text-xs text-gray-600">{object.address}</div>
                          </div>
                        </div>

                        {/* Помещения */}
                        {applyMode === 'rooms' && object.rooms.length > 0 && (
                          <div className="ml-6 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Помещения:</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectAllRooms(object.id)}
                                className="text-xs h-6"
                              >
                                {object.rooms.every(r => r.selected) ? 'Снять' : 'Выбрать все'}
                              </Button>
                            </div>
                            {object.rooms.map((room) => (
                              <label key={room.id} className="flex items-center space-x-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={room.selected}
                                  onChange={() => handleRoomToggle(object.id, room.id)}
                                  className="w-3 h-3"
                                />
                                <Home className="w-3 h-3 text-gray-500" />
                                <span>{room.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Отмена
            </Button>
            <Button
              onClick={handleApplySettings}
              disabled={saving || loading}
            >
              {saving ? 'Применение...' : 'Применить настройки'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
