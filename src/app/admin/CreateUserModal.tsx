'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Building } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

interface CleaningObject {
  id: string;
  name: string;
  address: string;
}

export default function CreateUserModal({ isOpen, onClose, onUserCreated }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: '',
    phone: ''
  });
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingObjects, setLoadingObjects] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadObjects();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.role !== 'DEPUTY_ADMIN') {
      setSelectedObjects([]);
    }
  }, [formData.role]);

  const loadObjects = async () => {
    try {
      setLoadingObjects(true);
      const response = await fetch('/api/objects', {
        credentials: 'include'
      });

      if (response.ok) {
        const objectsData = await response.json();
        setObjects(objectsData);
      }
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
    } finally {
      setLoadingObjects(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.name || !formData.password || !formData.role) {
      alert('Заполните все обязательные поля');
      return;
    }

    if (formData.password.length < 6) {
      alert('Пароль должен содержать минимум 6 символов');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          assignedObjectIds: formData.role === 'DEPUTY_ADMIN' ? selectedObjects : []
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        resetForm();
        onUserCreated();
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Ошибка создания пользователя:', error);
      alert('Ошибка создания пользователя');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      role: '',
      phone: ''
    });
    setSelectedObjects([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleObjectToggle = (objectId: string) => {
    setSelectedObjects(prev => 
      prev.includes(objectId)
        ? prev.filter(id => id !== objectId)
        : [...prev, objectId]
    );
  };

  const roleOptions = [
    { value: 'DEPUTY_ADMIN', label: 'Заместитель администратора' },
    { value: 'MANAGER', label: 'Менеджер' },
    { value: 'ACCOUNTANT', label: 'Бухгалтер' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5" />
            <span>Создать нового пользователя</span>
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
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Пароль *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Минимум 6 символов"
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
              
              <div>
                <Label htmlFor="role">Роль *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Назначение объектов для заместителя */}
          {formData.role === 'DEPUTY_ADMIN' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <span>Назначение объектов</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingObjects ? (
                  <div className="text-center py-4">Загрузка объектов...</div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {objects.map((object) => (
                      <div key={object.id} className="flex items-center space-x-2 p-2 border rounded">
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
                      <div className="text-center py-4 text-gray-600">
                        Объекты не найдены
                      </div>
                    )}
                  </div>
                )}
                
                {selectedObjects.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded">
                    <div className="text-sm font-medium">
                      Выбрано объектов: {selectedObjects.length}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Создание...' : 'Создать пользователя'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
