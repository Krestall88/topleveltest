'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Settings } from 'lucide-react';

interface AssignObjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    email: string;
  };
  onAssignmentsUpdated: () => void;
}

interface CleaningObject {
  id: string;
  name: string;
  address: string;
}

interface Assignment {
  id: string;
  object: {
    id: string;
    name: string;
    address: string;
  };
}

export default function AssignObjectsModal({ 
  isOpen, 
  onClose, 
  user, 
  onAssignmentsUpdated 
}: AssignObjectsModalProps) {
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [currentAssignments, setCurrentAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadData();
    }
  }, [isOpen, user]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      // Загружаем все объекты
      const objectsResponse = await fetch('/api/objects', {
        credentials: 'include'
      });
      
      // Загружаем текущие назначения
      const assignmentsResponse = await fetch(`/api/admin/users/${user.id}/assignments`, {
        credentials: 'include'
      });

      if (objectsResponse.ok && assignmentsResponse.ok) {
        const objectsData = await objectsResponse.json();
        const assignmentsData = await assignmentsResponse.json();
        
        setObjects(objectsData);
        setCurrentAssignments(assignmentsData.assignments);
        
        // Устанавливаем выбранные объекты
        const assignedObjectIds = assignmentsData.assignments.map((a: Assignment) => a.object.id);
        setSelectedObjects(assignedObjectIds);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/users/${user.id}/assignments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          objectIds: selectedObjects
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        onAssignmentsUpdated();
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Ошибка обновления назначений:', error);
      alert('Ошибка обновления назначений');
    } finally {
      setLoading(false);
    }
  };

  const handleObjectToggle = (objectId: string) => {
    setSelectedObjects(prev => 
      prev.includes(objectId)
        ? prev.filter(id => id !== objectId)
        : [...prev, objectId]
    );
  };

  const selectAll = () => {
    setSelectedObjects(objects.map(obj => obj.id));
  };

  const selectNone = () => {
    setSelectedObjects([]);
  };

  if (loadingData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Загрузка данных</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="text-lg">Загрузка данных...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Назначить объекты для {user.name}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <span>Доступные объекты</span>
                </CardTitle>
                <div className="flex space-x-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                    Выбрать все
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={selectNone}>
                    Очистить
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {objects.map((object) => (
                  <div 
                    key={object.id} 
                    className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer ${
                      selectedObjects.includes(object.id) ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => handleObjectToggle(object.id)}
                  >
                    <Checkbox
                      checked={selectedObjects.includes(object.id)}
                      onCheckedChange={() => handleObjectToggle(object.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{object.name}</div>
                      <div className="text-sm text-gray-600">{object.address}</div>
                    </div>
                  </div>
                ))}
                
                {objects.length === 0 && (
                  <div className="text-center py-8 text-gray-600">
                    <Building className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Объекты не найдены</p>
                  </div>
                )}
              </div>
              
              {selectedObjects.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-800">
                    Выбрано объектов: {selectedObjects.length} из {objects.length}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Заместитель будет иметь доступ только к выбранным объектам
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Текущие назначения */}
          {currentAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-600">
                  Текущие назначения ({currentAssignments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  {currentAssignments.map(assignment => assignment.object.name).join(', ')}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить назначения'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
