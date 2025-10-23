'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus, MapPin, Users, Building } from 'lucide-react';

interface Manager {
  id: string;
  name: string;
  phone?: string;
  email: string;
}

interface CleaningObject {
  id: string;
  name: string;
  address: string;
}

interface Site {
  id: string;
  name: string;
  description?: string;
  area?: number;
  objectId: string;
  managerId?: string;
  object: CleaningObject;
  manager?: Manager;
  zones: Array<{
    id: string;
    name: string;
    area?: number;
  }>;
}

interface SiteManagementProps {
  objectId?: string; // Если передан, показываем только участки этого объекта
}

export default function SiteManagement({ objectId }: SiteManagementProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  // Форма создания участка
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    area: '',
    objectId: objectId || '',
    managerId: ''
  });

  // Форма назначения менеджера
  const [assignForm, setAssignForm] = useState({
    managerId: ''
  });

  useEffect(() => {
    loadData();
  }, [objectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Загружаем участки
      const sitesUrl = objectId ? `/api/sites?objectId=${objectId}` : '/api/sites';
      const sitesResponse = await fetch(sitesUrl, {
        credentials: 'include'
      });
      if (sitesResponse.ok) {
        const sitesData = await sitesResponse.json();
        setSites(sitesData);
      }

      // Загружаем объекты (если не передан конкретный objectId)
      if (!objectId) {
        const objectsResponse = await fetch('/api/objects', {
          credentials: 'include'
        });
        if (objectsResponse.ok) {
          const objectsData = await objectsResponse.json();
          setObjects(objectsData);
        }
      }

      // Загружаем менеджеров
      const managersResponse = await fetch('/api/managers', {
        credentials: 'include'
      });
      if (managersResponse.ok) {
        const managersData = await managersResponse.json();
        setManagers(managersData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...createForm,
          area: createForm.area ? parseFloat(createForm.area) : null
        }),
      });

      if (response.ok) {
        setIsCreateModalOpen(false);
        setCreateForm({
          name: '',
          description: '',
          area: '',
          objectId: objectId || '',
          managerId: ''
        });
        loadData();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating site:', error);
      alert('Ошибка при создании участка');
    }
  };

  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSite) return;

    try {
      const response = await fetch(`/api/sites/${selectedSite.id}/assign-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(assignForm),
      });

      if (response.ok) {
        setIsAssignModalOpen(false);
        setSelectedSite(null);
        setAssignForm({ managerId: '' });
        loadData();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error assigning manager:', error);
      alert('Ошибка при назначении менеджера');
    }
  };

  const handleDeleteSite = async (site: Site) => {
    if (!confirm(`Удалить участок "${site.name}"?`)) return;

    try {
      const response = await fetch(`/api/sites/${site.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        loadData();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting site:', error);
      alert('Ошибка при удалении участка');
    }
  };

  const openAssignModal = (site: Site) => {
    setSelectedSite(site);
    setAssignForm({ managerId: site.managerId || '' });
    setIsAssignModalOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопка создания */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {objectId ? 'Участки объекта' : 'Управление участками'}
          </h2>
          <p className="text-muted-foreground">
            Создание участков и назначение менеджеров
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <MapPin className="w-4 h-4 mr-2" />
              Создать участок
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Создание участка</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSite} className="space-y-4">
              <div>
                <Label htmlFor="name">Название участка *</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                />
              </div>

              {!objectId && (
                <div>
                  <Label htmlFor="objectId">Объект *</Label>
                  <Select
                    value={createForm.objectId}
                    onValueChange={(value) => setCreateForm({ ...createForm, objectId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите объект" />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      {objects.map((object) => (
                        <SelectItem key={object.id} value={object.id}>
                          {object.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="area">Площадь (м²)</Label>
                <Input
                  id="area"
                  type="number"
                  step="0.01"
                  value={createForm.area}
                  onChange={(e) => setCreateForm({ ...createForm, area: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="managerId">Менеджер</Label>
                <Select
                  value={createForm.managerId}
                  onValueChange={(value) => setCreateForm({ ...createForm, managerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите менеджера" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value="">Не назначен</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Создать
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Список участков */}
      <div className="grid gap-4">
        {sites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {objectId ? 'У этого объекта пока нет участков' : 'Участки не созданы'}
              </p>
            </CardContent>
          </Card>
        ) : (
          sites.map((site) => (
            <Card key={site.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      {site.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Building className="w-4 h-4" />
                      {site.object.name}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAssignModal(site)}
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSite(site)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {site.description && (
                    <p className="text-sm text-muted-foreground">
                      {site.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    {site.area && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Площадь:</span>
                        <span>{site.area} м²</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Зон:</span>
                      <span>{site.zones.length}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Менеджер:</span>
                    {site.manager ? (
                      <Badge variant="secondary">
                        {site.manager.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        Не назначен
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Модальное окно назначения менеджера */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Назначить менеджера
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Участок: {selectedSite?.name}
            </p>
          </DialogHeader>
          <form onSubmit={handleAssignManager} className="space-y-4">
            <div>
              <Label htmlFor="assignManagerId">Менеджер</Label>
              <Select
                value={assignForm.managerId}
                onValueChange={(value) => setAssignForm({ managerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите менеджера" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="">Не назначен</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                      {manager.phone && (
                        <span className="text-muted-foreground ml-2">
                          {manager.phone}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Назначить
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignModalOpen(false)}
              >
                Отмена
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
