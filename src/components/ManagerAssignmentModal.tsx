'use client';

import { useState, useEffect } from 'react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, User, MapPin } from 'lucide-react';

interface CleaningObject {
  id: string;
  name: string;
  address: string;
  manager?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Manager {
  id: string;
  name: string;
  email: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAssignmentComplete: () => void;
}

export default function ManagerAssignmentModal({ isOpen, onClose, onAssignmentComplete }: Props) {
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>('');
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Загружаем объекты и менеджеров параллельно
      const [objectsResponse, managersResponse] = await Promise.all([
        fetch('/api/objects'),
        fetch('/api/managers')
      ]);

      if (!objectsResponse.ok || !managersResponse.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const objectsData = await objectsResponse.json();
      const managersData = await managersResponse.json();

      setObjects(objectsData);
      setManagers(managersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignManager = async () => {
    if (!selectedObjectId || !selectedManagerId) {
      setError('Выберите объект и менеджера');
      return;
    }

    setIsAssigning(true);
    setError('');

    try {
      const response = await fetch(`/api/objects/${selectedObjectId}/assign-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: selectedManagerId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка назначения менеджера');
      }

      // Обновляем локальные данные
      setObjects(prev => prev.map(obj => 
        obj.id === selectedObjectId 
          ? { 
              ...obj, 
              manager: managers.find(m => m.id === selectedManagerId) 
            }
          : obj
      ));

      // Сбрасываем форму
      setSelectedObjectId('');
      setSelectedManagerId('');
      
      onAssignmentComplete();
    } catch (error) {
      console.error('Error assigning manager:', error);
      setError(error instanceof Error ? error.message : 'Ошибка назначения менеджера');
    } finally {
      setIsAssigning(false);
    }
  };

  const selectedObject = objects.find(obj => obj.id === selectedObjectId);
  const selectedManager = managers.find(mgr => mgr.id === selectedManagerId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Назначение менеджеров на объекты
          </h2>
        </div>
        <div className="p-6">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Форма назначения */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Назначить менеджера</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Выберите объект:</label>
                <Select value={selectedObjectId} onValueChange={setSelectedObjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите объект..." />
                  </SelectTrigger>
                  <SelectContent>
                    {objects.map(object => (
                      <SelectItem key={object.id} value={object.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{object.name}</span>
                          <span className="text-xs text-gray-500">{object.address}</span>
                          {object.manager && (
                            <span className="text-xs text-blue-600">
                              Текущий: {object.manager.name}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Выберите менеджера:</label>
                <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите менеджера..." />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map(manager => (
                      <SelectItem key={manager.id} value={manager.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{manager.name}</span>
                          <span className="text-xs text-gray-500">{manager.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedObject && selectedManager && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Подтверждение назначения:</h4>
                  <p className="text-sm text-blue-800">
                    <strong>{selectedManager.name}</strong> будет назначен на объект{' '}
                    <strong>{selectedObject.name}</strong>
                  </p>
                  {selectedObject.manager && (
                    <p className="text-xs text-blue-600 mt-1">
                      Заменит: {selectedObject.manager.name}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleAssignManager}
                  disabled={!selectedObjectId || !selectedManagerId || isAssigning}
                  className="flex-1"
                >
                  {isAssigning ? 'Назначаю...' : 'Назначить менеджера'}
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Список текущих назначений */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Текущие назначения</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Загрузка...</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {objects.map(object => (
                    <div key={object.id} className="border rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <Building className="h-4 w-4 text-gray-500 mt-1" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{object.name}</h4>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {object.address}
                          </p>
                          <div className="mt-2">
                            {object.manager ? (
                              <Badge variant="secondary" className="text-xs">
                                {object.manager.name}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-orange-600">
                                Не назначен
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}
