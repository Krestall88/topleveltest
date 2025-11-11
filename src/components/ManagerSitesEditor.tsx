'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Check, Building, MapPin, Loader2 } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  description?: string;
  area?: number;
  comment?: string;
  objectId: string;
  managerId?: string | null;
  seniorManagerId?: string | null;
  object: {
    id: string;
    name: string;
    address: string;
  };
}

interface Props {
  managerId: string;
  managerRole: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ManagerSitesEditor({ managerId, managerRole, isOpen, onClose, onUpdate }: Props) {
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [managerSites, setManagerSites] = useState<Site[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, managerId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Загружаем все участки
      const sitesResponse = await fetch('/api/sites');
      if (!sitesResponse.ok) throw new Error('Не удалось загрузить участки');
      const sitesData = await sitesResponse.json();
      
      console.log('📦 Все участки из API:', sitesData);
      const sitesList = Array.isArray(sitesData) ? sitesData : (sitesData.sites || []);
      setAllSites(sitesList);

      // Загружаем участки менеджера
      const managerResponse = await fetch(`/api/managers/${managerId}/details`);
      if (!managerResponse.ok) throw new Error('Не удалось загрузить данные менеджера');
      const managerData = await managerResponse.json();
      
      console.log('👤 Участки менеджера:', managerData.managedSites);
      setManagerSites(managerData.managedSites || []);
    } catch (error) {
      console.error('❌ Ошибка загрузки данных:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignSite = async (siteId: string, isSeniorManager: boolean) => {
    setAssigningId(siteId);
    console.log(`🔄 Назначаем участок: ${siteId} менеджеру: ${managerId} (${isSeniorManager ? 'старший' : 'обычный'})`);
    
    try {
      const response = await fetch(`/api/sites/${siteId}/assign-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          managerId,
          isSeniorManager 
        })
      });

      console.log('📡 Ответ API:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Ошибка API:', errorData);
        throw new Error(errorData.message || 'Ошибка при назначении участка');
      }

      const result = await response.json();
      console.log('✅ Участок успешно назначен:', result);

      // Обновляем данные
      await loadData();
      onUpdate();
    } catch (error: any) {
      console.error('❌ Ошибка при назначении участка:', error);
      alert(error.message || 'Ошибка при назначении участка');
    } finally {
      setAssigningId(null);
    }
  };

  const handleRemoveSite = async (siteId: string, isSeniorManager: boolean) => {
    setAssigningId(siteId);
    console.log(`🗑️ Удаляем участок: ${siteId} у менеджера: ${managerId}`);
    
    try {
      const response = await fetch(`/api/sites/${siteId}/assign-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          managerId: null,
          isSeniorManager 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при удалении участка');
      }

      console.log('✅ Участок успешно удален');

      // Обновляем данные
      await loadData();
      onUpdate();
    } catch (error: any) {
      console.error('❌ Ошибка при удалении участка:', error);
      alert(error.message || 'Ошибка при удалении участка');
    } finally {
      setAssigningId(null);
    }
  };

  // Фильтруем доступные участки (исключаем уже назначенные)
  const availableSites = allSites.filter(site => {
    // Проверяем, назначен ли участок этому менеджеру
    const isAssignedToManager = managerSites.some(ms => ms.id === site.id);
    
    // Фильтруем по поисковому запросу
    const matchesSearch = !searchTerm || 
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.object.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.object.address.toLowerCase().includes(searchTerm.toLowerCase());

    return !isAssignedToManager && matchesSearch;
  });

  console.log('🔍 Статистика фильтрации участков:');
  console.log('   Всего участков:', allSites.length);
  console.log('   Назначенных участков:', managerSites.length);
  console.log('   Доступных участков:', availableSites.length);
  console.log('   Поисковый запрос:', searchTerm);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Управление участками менеджера</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden">
            {/* Назначенные участки */}
            <div className="flex flex-col overflow-hidden border rounded-lg">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="font-semibold text-lg">
                  Назначенные участки ({managerSites.length})
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {managerSites.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Нет назначенных участков
                  </p>
                ) : (
                  managerSites.map((site) => (
                    <div key={site.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm mb-1">{site.name}</div>
                          <div className="text-xs text-gray-600 flex items-center gap-1 mb-1">
                            <Building className="h-3 w-3" />
                            {site.object.name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {site.object.address}
                          </div>
                          {site.description && (
                            <div className="text-xs text-gray-600 mt-2">{site.description}</div>
                          )}
                          {site.area && (
                            <div className="text-xs text-gray-500 mt-1">
                              Площадь: {site.area} м²
                            </div>
                          )}
                          {site.comment && (
                            <div className="text-xs text-blue-600 mt-1 italic">
                              💬 {site.comment}
                            </div>
                          )}
                          {/* Показываем тип назначения */}
                          <div className="mt-2 text-xs">
                            {site.seniorManagerId === managerId && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                                👔 Старший менеджер
                              </span>
                            )}
                            {site.managerId === managerId && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                👤 Менеджер
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveSite(site.id, site.seniorManagerId === managerId)}
                          disabled={assigningId === site.id}
                          className="ml-2 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                        >
                          {assigningId === site.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Доступные участки */}
            <div className="flex flex-col overflow-hidden border rounded-lg">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="font-semibold text-lg mb-3">
                  Доступные участки ({availableSites.length})
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Поиск по названию, объекту или адресу..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {availableSites.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    {searchTerm ? 'Нет участков, соответствующих поиску' : 'Все доступные участки уже назначены'}
                  </p>
                ) : (
                  availableSites.map((site) => (
                    <div key={site.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm mb-1">{site.name}</div>
                          <div className="text-xs text-gray-600 flex items-center gap-1 mb-1">
                            <Building className="h-3 w-3" />
                            {site.object.name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {site.object.address}
                          </div>
                          {site.description && (
                            <div className="text-xs text-gray-600 mt-2">{site.description}</div>
                          )}
                          {site.area && (
                            <div className="text-xs text-gray-500 mt-1">
                              Площадь: {site.area} м²
                            </div>
                          )}
                          {site.comment && (
                            <div className="text-xs text-blue-600 mt-1 italic">
                              💬 {site.comment}
                            </div>
                          )}
                          {/* Показываем текущее назначение */}
                          {(site.managerId || site.seniorManagerId) && (
                            <div className="mt-2 text-xs text-amber-600">
                              ⚠️ Уже назначен другому менеджеру
                            </div>
                          )}
                        </div>
                        <div className="ml-2 flex flex-col gap-1">
                          {/* Кнопка назначения как обычного менеджера */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAssignSite(site.id, false)}
                            disabled={assigningId === site.id}
                            className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                            title="Назначить как менеджера"
                          >
                            {assigningId === site.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                <span className="text-xs">👤</span>
                              </>
                            )}
                          </Button>
                          {/* Кнопка назначения как старшего менеджера */}
                          {managerRole === 'SENIOR_MANAGER' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssignSite(site.id, true)}
                              disabled={assigningId === site.id}
                              className="text-purple-600 hover:text-purple-700 border-purple-300 hover:border-purple-400"
                              title="Назначить как старшего менеджера"
                            >
                              {assigningId === site.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  <span className="text-xs">👔</span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
