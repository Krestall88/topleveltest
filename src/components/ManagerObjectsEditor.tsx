'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Plus, 
  X, 
  Search,
  MapPin,
  User,
  Trash2,
  Check
} from 'lucide-react';

interface ManagerObjectsEditorProps {
  managerId: string;
  managerName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface CleaningObject {
  id: string;
  name: string;
  address: string;
  description?: string;
  manager?: {
    id: string;
    name: string;
  };
}

interface ManagerObject {
  id: string;
  name: string;
  address: string;
  description?: string;
}

export default function ManagerObjectsEditor({ 
  managerId, 
  managerName, 
  isOpen, 
  onClose, 
  onUpdate 
}: ManagerObjectsEditorProps) {
  const [managerObjects, setManagerObjects] = useState<ManagerObject[]>([]);
  const [availableObjects, setAvailableObjects] = useState<CleaningObject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && managerId) {
      fetchData();
    }
  }, [isOpen, managerId]);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Загружаем объекты менеджера
      const managerResponse = await fetch(`/api/managers/${managerId}/details`);
      if (!managerResponse.ok) {
        throw new Error('Не удалось загрузить данные менеджера');
      }
      const managerData = await managerResponse.json();
      setManagerObjects(managerData.managedObjects || []);

      // Загружаем все доступные объекты
      const objectsResponse = await fetch('/api/objects');
      if (!objectsResponse.ok) {
        throw new Error('Не удалось загрузить список объектов');
      }
      const objectsData = await objectsResponse.json();
      setAvailableObjects(objectsData.objects || []);
      
    } catch (error: any) {
      console.error('Ошибка при загрузке данных:', error);
      setError(error.message || 'Произошла ошибка при загрузке');
    } finally {
      setIsLoading(false);
    }
  };

  const assignObjectToManager = async (objectId: string) => {
    try {
      const response = await fetch(`/api/objects/${objectId}/assign-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ managerId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при назначении объекта');
      }

      // Обновляем данные
      await fetchData();
      onUpdate();
      
    } catch (error: any) {
      console.error('Ошибка при назначении объекта:', error);
      setError(error.message || 'Не удалось назначить объект');
    }
  };

  const removeObjectFromManager = async (objectId: string) => {
    try {
      const response = await fetch(`/api/objects/${objectId}/remove-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при удалении объекта');
      }

      // Обновляем данные
      await fetchData();
      onUpdate();
      
    } catch (error: any) {
      console.error('Ошибка при удалении объекта:', error);
      setError(error.message || 'Не удалось удалить объект');
    }
  };

  const filteredAvailableObjects = availableObjects.filter(obj => {
    const matchesSearch = obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         obj.address.toLowerCase().includes(searchTerm.toLowerCase());
    const notAssigned = !managerObjects.some(mo => mo.id === obj.id);
    return matchesSearch && notAssigned;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Заголовок */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Управление объектами менеджера: {managerName}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Содержимое */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Загрузка данных...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {!isLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Назначенные объекты */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-green-600" />
                    Назначенные объекты ({managerObjects.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {managerObjects.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>У менеджера пока нет назначенных объектов</p>
                    </div>
                  ) : (
                    managerObjects.map((object) => (
                      <div key={object.id} className="border rounded-lg p-4 bg-green-50 border-green-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-green-900">{object.name}</h4>
                            <p className="text-sm text-green-700 flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {object.address}
                            </p>
                            {object.description && (
                              <p className="text-sm text-green-600 mt-1">{object.description}</p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeObjectFromManager(object.id)}
                            className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Доступные объекты */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-blue-600" />
                    Доступные объекты
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Поиск объектов..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredAvailableObjects.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>
                        {searchTerm 
                          ? 'Объекты не найдены по запросу' 
                          : 'Все доступные объекты уже назначены'
                        }
                      </p>
                    </div>
                  ) : (
                    filteredAvailableObjects.map((object) => (
                      <div key={object.id} className="border rounded-lg p-4 hover:bg-blue-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{object.name}</h4>
                            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {object.address}
                            </p>
                            {object.description && (
                              <p className="text-sm text-gray-500 mt-1">{object.description}</p>
                            )}
                            {object.manager && (
                              <div className="mt-2">
                                <Badge variant="outline" className="text-xs">
                                  <User className="h-2 w-2 mr-1" />
                                  Текущий менеджер: {object.manager.name}
                                </Badge>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => assignObjectToManager(object.id)}
                            className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Назначено объектов: <span className="font-medium">{managerObjects.length}</span>
          </div>
          <Button onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}
