'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Trash2, Settings, Users, Building } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

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

interface Assignment {
  deputyAdmin: User;
  objects: CleaningObject[];
  assignedBy: User;
  createdAt: string;
}

export default function DeputyAdminManager() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [deputyAdmins, setDeputyAdmins] = useState<User[]>([]);
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Состояние для создания назначения
  const [selectedDeputyId, setSelectedDeputyId] = useState<string>('');
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Получить назначения
      const assignmentsRes = await fetch('/api/deputy-admin/assignments');
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData.assignments || []);
      }

      // Получить всех пользователей с ролью DEPUTY_ADMIN
      const usersRes = await fetch('/api/users?role=DEPUTY_ADMIN');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setDeputyAdmins(usersData.users || []);
      }

      // Получить все объекты
      const objectsRes = await fetch('/api/objects');
      if (objectsRes.ok) {
        const objectsData = await objectsRes.json();
        setObjects(objectsData.objects || []);
      }

    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedDeputyId || selectedObjectIds.length === 0) {
      setError('Выберите заместителя администратора и хотя бы один объект');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const response = await fetch('/api/deputy-admin/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deputyAdminId: selectedDeputyId,
          objectIds: selectedObjectIds,
        }),
      });

      if (response.ok) {
        setSuccess('Назначения успешно созданы');
        setShowCreateModal(false);
        setSelectedDeputyId('');
        setSelectedObjectIds([]);
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Ошибка при создании назначений');
      }
    } catch (error) {
      console.error('Ошибка при создании назначений:', error);
      setError('Ошибка при создании назначений');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAssignments = async (deputyId: string) => {
    if (!confirm('Вы уверены, что хотите удалить все назначения этого заместителя администратора?')) {
      return;
    }

    try {
      const response = await fetch(`/api/deputy-admin/assignments/${deputyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Назначения успешно удалены');
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Ошибка при удалении назначений');
      }
    } catch (error) {
      console.error('Ошибка при удалении назначений:', error);
      setError('Ошибка при удалении назначений');
    }
  };

  const handleObjectToggle = (objectId: string) => {
    setSelectedObjectIds(prev => 
      prev.includes(objectId) 
        ? prev.filter(id => id !== objectId)
        : [...prev, objectId]
    );
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Управление заместителями администраторов</h1>
          <p className="text-gray-600">Назначение объектов для заместителей администраторов</p>
        </div>
        
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Назначить объекты
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Назначить объекты заместителю администратора</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Заместитель администратора</label>
                <Select value={selectedDeputyId} onValueChange={setSelectedDeputyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите заместителя администратора" />
                  </SelectTrigger>
                  <SelectContent>
                    {deputyAdmins.map((deputy) => (
                      <SelectItem key={deputy.id} value={deputy.id}>
                        {deputy.name} ({deputy.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Объекты</label>
                <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                  {objects.map((object) => (
                    <div key={object.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={object.id}
                        checked={selectedObjectIds.includes(object.id)}
                        onCheckedChange={() => handleObjectToggle(object.id)}
                      />
                      <label htmlFor={object.id} className="text-sm cursor-pointer flex-1">
                        <div className="font-medium">{object.name}</div>
                        <div className="text-gray-500 text-xs">{object.address}</div>
                        {object.manager && (
                          <div className="text-blue-600 text-xs">
                            Менеджер: {object.manager.name}
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Выбрано объектов: {selectedObjectIds.length}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                >
                  Отмена
                </Button>
                <Button 
                  onClick={handleCreateAssignment}
                  disabled={isCreating || !selectedDeputyId || selectedObjectIds.length === 0}
                >
                  {isCreating ? 'Создание...' : 'Создать назначения'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-600">Заместителей администраторов</div>
                <div className="text-2xl font-bold">{deputyAdmins.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-sm text-gray-600">С назначениями</div>
                <div className="text-2xl font-bold">{assignments.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-sm text-gray-600">Всего объектов</div>
                <div className="text-2xl font-bold">{objects.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список назначений */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Текущие назначения</h2>
        
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Назначения не созданы
            </CardContent>
          </Card>
        ) : (
          assignments.map((assignment) => (
            <Card key={assignment.deputyAdmin.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {assignment.deputyAdmin.name}
                  </CardTitle>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteAssignments(assignment.deputyAdmin.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Удалить назначения
                  </Button>
                </div>
                <div className="text-sm text-gray-600">
                  {assignment.deputyAdmin.email}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Назначено объектов: <Badge variant="secondary">{assignment.objects.length}</Badge></span>
                    <span className="text-gray-500">
                      Назначил: {assignment.assignedBy.name} • {new Date(assignment.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {assignment.objects.map((object) => (
                      <div key={object.id} className="p-3 border rounded-lg">
                        <div className="font-medium text-sm">{object.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{object.address}</div>
                        {object.manager && (
                          <div className="text-xs text-blue-600 mt-1">
                            Менеджер: {object.manager.name}
                          </div>
                        )}
                      </div>
                    ))}
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
