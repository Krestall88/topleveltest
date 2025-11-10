'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ManagerAssignmentModal from '@/components/ManagerAssignmentModal';
import ManagerDetailModal from '@/components/ManagerDetailModal';
import { UserPlus, Users, Search } from 'lucide-react';

interface Manager {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  objectsCount: number;
  sitesInfo: string;
  objectNames?: string; // Добавляем поле для названий объектов
  sites: Array<{
    name: string;
    objectName: string;
    comment?: string;
  }>;
}

interface User {
  id: string;
  role: string;
  name: string;
  email: string;
}

interface Props {
  user: User;
}

export default function ManagersClientPage({ user }: Props) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'MANAGER' as 'MANAGER' | 'SENIOR_MANAGER'
  });
  const [resetPasswordData, setResetPasswordData] = useState({
    managerId: '',
    managerName: '',
    newPassword: '',
    newEmail: ''
  });
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchManagers = async () => {
    try {
      const response = await fetch('/api/managers');
      if (!response.ok) {
        throw new Error('Ошибка загрузки менеджеров');
      }
      const data = await response.json();
      setManagers(data);
    } catch (error) {
      console.error('Ошибка при загрузке менеджеров:', error);
      setError('Не удалось загрузить менеджеров');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/managers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при создании менеджера');
      }

      const newManager = await response.json();
      setManagers([newManager, ...managers]);
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '', role: 'MANAGER' });
    } catch (error: any) {
      console.error('Ошибка при создании менеджера:', error);
      setError(error.message || 'Не удалось создать менеджера');
    }
  };

  const handleDelete = async (managerId: string) => {
    if (!confirm('Удалить менеджера? Это действие нельзя отменить.')) return;
    
    try {
      const response = await fetch(`/api/managers/${managerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при удалении менеджера');
      }

      setManagers(managers.filter(manager => manager.id !== managerId));
    } catch (error: any) {
      console.error('Ошибка при удалении:', error);
      setError(error.message || 'Не удалось удалить менеджера');
    }
  };

  const handleResetPassword = (managerId: string, managerName: string) => {
    const manager = managers.find(m => m.id === managerId);
    setResetPasswordData({
      managerId,
      managerName,
      newPassword: '',
      newEmail: manager?.email || ''
    });
    setIsResetPasswordModalOpen(true);
  };

  const handleShowDetails = (managerId: string) => {
    setSelectedManagerId(managerId);
    setIsDetailModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/managers/${resetPasswordData.managerId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPassword: resetPasswordData.newPassword,
          newEmail: resetPasswordData.newEmail
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при сбросе пароля');
      }

      const result = await response.json();
      
      // Обновляем список менеджеров с новыми данными
      setManagers(managers.map(manager => 
        manager.id === resetPasswordData.managerId 
          ? { ...manager, email: result.manager.email }
          : manager
      ));

      setIsResetPasswordModalOpen(false);
      setResetPasswordData({ managerId: '', managerName: '', newPassword: '', newEmail: '' });
      alert(result.message);
    } catch (error: any) {
      console.error('Ошибка при сбросе пароля:', error);
      setError(error.message || 'Не удалось сбросить пароль');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка менеджеров...</div>;
  }

  // Фильтрация менеджеров по поисковому запросу
  const filteredManagers = managers.filter(manager => {
    const query = searchQuery.toLowerCase();
    return (
      manager.name.toLowerCase().includes(query) ||
      manager.email.toLowerCase().includes(query) ||
      (manager.phone && manager.phone.toLowerCase().includes(query)) ||
      (manager.objectNames && manager.objectNames.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 px-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Заголовок и кнопки управления */}
      <div className="flex justify-between items-center mt-6">
        <h2 className="text-2xl font-bold text-gray-900">👥 Управление менеджерами</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Назначить на объекты
          </Button>
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Добавить менеджера
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-blue-600">{managers.length}</div>
            <div className="text-sm text-gray-600 mt-1">Всего менеджеров</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-green-600">
              {managers.reduce((sum, m) => sum + m.objectsCount, 0)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Всего объектов</div>
          </CardContent>
        </Card>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Поиск по имени, email, телефону или объектам..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 py-6 text-base"
        />
      </div>

      {/* Список менеджеров */}
      <div className="grid gap-4">
        {filteredManagers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              {searchQuery ? 'Менеджеры не найдены по вашему запросу.' : 'Менеджеры не найдены. Добавьте первого менеджера.'}
            </CardContent>
          </Card>
        ) : (
          filteredManagers.map((manager) => (
            <Card key={manager.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{manager.name}</CardTitle>
                    <p className="text-sm text-gray-600">{manager.email}</p>
                    {manager.phone && (
                      <p className="text-sm text-blue-600">📞 {manager.phone}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Создан: {formatDate(manager.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShowDetails(manager.id)}
                    >
                      📊 Подробно
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(manager.id, manager.name)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      🔑 Пароль
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(manager.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      🗑️ Удалить
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(manager as any).role && (
                    <div className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium mb-2">
                      {(manager as any).role === 'SENIOR_MANAGER' ? '👔 Старший менеджер' : '👤 Менеджер'}
                    </div>
                  )}
                  {manager.objectNames && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                      <div className="text-blue-600 mb-1 font-medium">📦 Объекты:</div>
                      <div className="text-blue-800">{manager.objectNames}</div>
                    </div>
                  )}
                  {manager.sitesInfo && (
                    <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                      <div className="text-green-700 mb-1 font-medium">📍 Участки:</div>
                      <div className="text-green-900 text-xs space-y-1">
                        {manager.sitesInfo.split('; ').map((site: string, i: number) => (
                          <div key={i}>• {site}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Модальное окно добавления менеджера */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Добавить нового менеджера</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+7 XXX XXX XXXX"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              
              <div>
                <Label htmlFor="role">Роль</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'MANAGER' | 'SENIOR_MANAGER' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="MANAGER">Менеджер</option>
                  <option value="SENIOR_MANAGER">Старший менеджер</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Старший менеджер видит все объекты и может закрывать задачи своих подчиненных
                </p>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Создать
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setFormData({ name: '', email: '', phone: '', password: '', role: 'MANAGER' });
                  }}
                  className="flex-1"
                >
                  Отмена
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно сброса пароля */}
      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Сброс пароля для {resetPasswordData.managerName}
            </h3>
            
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="newEmail">Email (логин)</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={resetPasswordData.newEmail}
                  onChange={(e) => setResetPasswordData({ 
                    ...resetPasswordData, 
                    newEmail: e.target.value 
                  })}
                  required
                  placeholder="manager@cleaning.com"
                />
              </div>
              
              <div>
                <Label htmlFor="newPassword">Новый пароль</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={resetPasswordData.newPassword}
                  onChange={(e) => setResetPasswordData({ 
                    ...resetPasswordData, 
                    newPassword: e.target.value 
                  })}
                  required
                  minLength={6}
                  placeholder="Минимум 6 символов"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Изменить пароль
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsResetPasswordModalOpen(false);
                    setResetPasswordData({ managerId: '', managerName: '', newPassword: '', newEmail: '' });
                  }}
                  className="flex-1"
                >
                  Отмена
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно назначения менеджеров */}
      <ManagerAssignmentModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssignmentComplete={() => {
          fetchManagers();
          setIsAssignModalOpen(false);
        }}
      />

      {/* Модальное окно с деталями менеджера */}
      <ManagerDetailModal
        managerId={selectedManagerId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedManagerId('');
        }}
      />
    </div>
  );
}
