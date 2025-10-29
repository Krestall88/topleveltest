'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  Settings, 
  Key, 
  Shield,
  Building,
  Mail,
  Phone,
  Trash2,
  Edit
} from 'lucide-react';
import CreateUserModal from './CreateUserModal';
import EditDeputyModal from './EditDeputyModal';
import ChangePasswordModal from './ChangePasswordModal';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  createdAt: string;
  deputyAdminAssignments?: {
    object: {
      id: string;
      name: string;
    };
  }[];
  managedObjects?: {
    id: string;
    name: string;
  }[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        console.error('Ошибка загрузки пользователей');
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserCreated = () => {
    setIsCreateModalOpen(false);
    loadUsers();
  };

  const handleEditUser = useCallback((user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  }, []); // Мемоизируем функцию открытия модального окна

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Вы уверены, что хотите удалить заместителя "${user.name}"?\n\nЭто действие нельзя отменить.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        loadUsers();
      } else {
        const errorData = await response.json();
        alert(`Ошибка удаления: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Ошибка удаления пользователя:', error);
      alert('Ошибка удаления пользователя');
    }
  };

  const handleUserUpdated = () => {
    setIsEditModalOpen(false);
    setSelectedUser(null); // Очищаем selectedUser чтобы избежать циклов
    loadUsers();
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordChanged = () => {
    setIsPasswordModalOpen(false);
    loadUsers();
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      ADMIN: { label: 'Главный администратор', variant: 'destructive' as const },
      DEPUTY_ADMIN: { label: 'Заместитель администратора', variant: 'default' as const },
      MANAGER: { label: 'Менеджер', variant: 'secondary' as const },
      ACCOUNTANT: { label: 'Бухгалтер', variant: 'outline' as const },
      CLIENT: { label: 'Клиент', variant: 'outline' as const }
    };

    const config = roleConfig[role as keyof typeof roleConfig] || 
                  { label: role, variant: 'outline' as const };

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getObjectsInfo = (user: User) => {
    if (user.role === 'DEPUTY_ADMIN') {
      return user.deputyAdminAssignments?.map(a => a.object.name).join(', ') || 'Нет назначений';
    }
    if (user.role === 'MANAGER') {
      return user.managedObjects?.map(o => o.name).join(', ') || 'Нет объектов';
    }
    return 'Все объекты';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Загрузка пользователей...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Управление администраторами</h1>
            <p className="text-gray-600">Создание заместителей администратора с назначением объектов</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Добавить пользователя
        </Button>
      </div>

      <div className="grid gap-4">
        {users.filter(user => user.role === 'ADMIN' || user.role === 'DEPUTY_ADMIN').map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-gray-500" />
                  <div>
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                      {user.phone && (
                        <>
                          <Phone className="w-4 h-4 ml-2" />
                          <span>{user.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getRoleBadge(user.role)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Building className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <div className="text-sm font-medium">Доступные объекты:</div>
                    <div className="text-sm text-gray-600">{getObjectsInfo(user)}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t">
                  <div className="flex space-x-2">
                    {user.role === 'ADMIN' ? (
                      // Для главного администратора только смена пароля
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChangePassword(user)}
                      >
                        <Key className="w-4 h-4 mr-1" />
                        Сменить пароль
                      </Button>
                    ) : (
                      // Для заместителей полный функционал
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Редактировать
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Удалить
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {users.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Пользователи не найдены</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Модальные окна */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
      />

      <EditDeputyModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null); // Очищаем selectedUser при закрытии
        }}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        user={selectedUser}
        onPasswordChanged={handlePasswordChanged}
      />
    </div>
  );
}
