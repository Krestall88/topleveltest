'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, User, Phone, Mail, Calendar, Building, MapPin, FileText, Settings } from 'lucide-react';
import ManagerObjectsEditor from './ManagerObjectsEditor';

interface ManagerDetails {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  managedObjects: Array<{
    id: string;
    name: string;
    address: string;
    description?: string;
    sites: Array<{
      id: string;
      name: string;
      description?: string;
      area?: number;
    }>;
  }>;
  managedSites: Array<{
    id: string;
    name: string;
    description?: string;
    area?: number;
    comment?: string;
    object: {
      id: string;
      name: string;
      address: string;
      manager?: {
        name: string;
      };
    };
  }>;
  objectsCount: number;
  sitesCount: number;
}

interface Props {
  managerId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ManagerDetailModal({ managerId, isOpen, onClose }: Props) {
  const [manager, setManager] = useState<ManagerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isObjectsEditorOpen, setIsObjectsEditorOpen] = useState(false);

  useEffect(() => {
    if (isOpen && managerId) {
      fetchManagerDetails();
    }
  }, [isOpen, managerId]);

  const fetchManagerDetails = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/managers/${managerId}/details`);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить данные менеджера');
      }
      
      const data = await response.json();
      console.log('🔍 Данные менеджера из API:', data);
      console.log('📋 managedObjects:', data.managedObjects);
      console.log('🏗️ managedSites:', data.managedSites);
      console.log('📊 Количество объектов:', data.managedObjects?.length || 0);
      console.log('📊 Количество участков:', data.managedSites?.length || 0);
      setManager(data);
    } catch (error: any) {
      console.error('Ошибка при загрузке данных менеджера:', error);
      setError(error.message || 'Произошла ошибка при загрузке');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Заголовок */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Подробная информация о менеджере
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

          {manager && (
            <div className="space-y-6">
              {/* Основная информация */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Основная информация
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Имя</div>
                      <div className="font-medium">{manager.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </div>
                      <div className="font-medium">{manager.email}</div>
                    </div>
                    {manager.phone && (
                      <div>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Телефон
                        </div>
                        <div className="font-medium">{manager.phone}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Дата создания
                      </div>
                      <div className="font-medium">{formatDate(manager.createdAt)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* Объекты под управлением */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Объекты под управлением ({manager.managedObjects?.length || 0})
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsObjectsEditorOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Управление объектами
                    </Button>
                  </CardTitle>
                </CardHeader>
                {manager.managedObjects && manager.managedObjects.length > 0 ? (
                  <CardContent className="space-y-4">
                    {manager.managedObjects.map((object) => (
                      <div key={object.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{object.name}</h4>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {object.address}
                            </p>
                            {object.description && (
                              <p className="text-sm text-gray-500 mt-1">{object.description}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Участки в этом объекте */}
                        {object.sites.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              Участки в этом объекте ({object.sites.length}):
                            </div>
                            <div className="space-y-2">
                              {object.sites.map((site) => (
                                <div key={site.id} className="bg-gray-50 rounded p-3">
                                  <div className="font-medium text-sm">{site.name}</div>
                                  {site.description && (
                                    <div className="text-xs text-gray-600 mt-1">{site.description}</div>
                                  )}
                                  {site.area && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Площадь: {site.area} м²
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                ) : (
                  <CardContent className="p-8 text-center text-gray-500">
                    <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>У этого менеджера пока нет назначенных объектов</p>
                  </CardContent>
                )}
              </Card>

              {/* Участки в других объектах */}
              {manager.managedSites.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Участки в других объектах ({manager.managedSites.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {manager.managedSites.map((site) => (
                      <div key={site.id} className="border rounded-lg p-4">
                        <div className="font-medium">{site.name}</div>
                        {site.description && (
                          <div className="text-sm text-gray-600 mt-1">{site.description}</div>
                        )}
                        {site.comment && (
                          <div className="text-sm text-blue-600 mt-1 font-medium">
                            Комментарий: {site.comment}
                          </div>
                        )}
                        <div className="text-sm text-gray-500 mt-2">
                          <div>Объект: {site.object.name}</div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {site.object.address}
                          </div>
                          {site.object.manager && (
                            <div>Основной менеджер объекта: {site.object.manager.name}</div>
                          )}
                        </div>
                        {site.area && (
                          <div className="text-xs text-gray-500 mt-1">
                            Площадь: {site.area} м²
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Если нет объектов и участков */}
              {manager.managedObjects.length === 0 && manager.managedSites.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>У этого менеджера пока нет назначенных объектов или участков</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <Button onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>

      {/* Редактор объектов менеджера */}
      {manager && (
        <ManagerObjectsEditor
          managerId={manager.id}
          managerName={manager.name}
          isOpen={isObjectsEditorOpen}
          onClose={() => setIsObjectsEditorOpen(false)}
          onUpdate={fetchManagerDetails}
        />
      )}
    </div>
  );
}
