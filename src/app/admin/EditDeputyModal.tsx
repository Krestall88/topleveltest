'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Building, User, Mail, Phone, Key, AlertTriangle } from 'lucide-react';

interface EditDeputyModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  } | null;
  onUserUpdated: () => void;
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

export default function EditDeputyModal({ 
  isOpen, 
  onClose, 
  user, 
  onUserUpdated 
}: EditDeputyModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    newPassword: ''
  });
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [currentAssignments, setCurrentAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadData();
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        newPassword: ''
      });
    }
  }, [isOpen, user]);

  const loadData = async () => {
    if (!user) return;
    
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
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Обновляем основную информацию пользователя
      const updateResponse = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        alert(`Ошибка обновления пользователя: ${errorData.message}`);
        return;
      }

      // Обновляем назначения объектов
      const assignmentsResponse = await fetch(`/api/admin/users/${user.id}/assignments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          objectIds: selectedObjects
        }),
      });

      if (!assignmentsResponse.ok) {
        const errorData = await assignmentsResponse.json();
        alert(`Ошибка обновления назначений: ${errorData.message}`);
        return;
      }

      // Сбрасываем пароль если указан
      if (formData.newPassword && formData.newPassword.length >= 6) {
        const passwordResponse = await fetch(`/api/admin/users/${user.id}/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            newPassword: formData.newPassword
          }),
        });

        if (!passwordResponse.ok) {
          const errorData = await passwordResponse.json();
          alert(`Ошибка сброса пароля: ${errorData.message}`);
          return;
        }
      }

      alert('Заместитель успешно обновлен');
      handleClose();
      onUserUpdated();
      
    } catch (error) {
      console.error('Ошибка обновления:', error);
      alert('Ошибка обновления заместителя');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', email: '', phone: '', newPassword: '' });
    setSelectedObjects([]);
    setShowPasswordReset(false);
    onClose();
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

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, newPassword: password });
  };

  if (!user) return null;

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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Редактировать заместителя: {user.name}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Имя *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Введите имя"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email (логин) *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@cleaning.com"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Сброс пароля */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Пароль</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordReset(!showPasswordReset)}
                >
                  {showPasswordReset ? 'Скрыть' : 'Сбросить пароль'}
                </Button>
              </div>
            </CardHeader>
            {showPasswordReset && (
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <div className="font-medium">Внимание!</div>
                    <div>Пользователь будет уведомлен о смене пароля и должен будет использовать новый пароль для входа.</div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="newPassword">Новый пароль</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder="Минимум 6 символов"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generatePassword}
                      className="whitespace-nowrap"
                    >
                      Сгенерировать
                    </Button>
                  </div>
                </div>

                {formData.newPassword && formData.newPassword.length >= 6 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm text-green-800">
                      <div className="font-medium">Новый пароль:</div>
                      <div className="font-mono bg-white p-2 rounded mt-1 border">
                        {formData.newPassword}
                      </div>
                      <div className="text-xs mt-1">
                        Скопируйте и передайте пользователю
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Назначение объектов */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <span>Назначение объектов</span>
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
                    className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 ${
                      selectedObjects.includes(object.id) ? 'border-blue-500 bg-blue-50' : ''
                    }`}
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

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
