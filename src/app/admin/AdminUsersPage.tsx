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
    <div className="max-w-full overflow-x-hidden px-3 sm:px-4 md:px-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          <div>
            <h1 className="text-lg sm:text-3xl font-bold">Управление администраторами</h1>
            <p className="text-xs sm:text-base text-gray-600">Создание заместителей администратора с назначением объектов</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base w-full sm:w-auto">
          <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="ml-1">Добавить</span>
        </Button>
      </div>

      <div className="grid gap-3">
        {users.filter(user => user.role === 'ADMIN' || user.role === 'DEPUTY_ADMIN').map((user) => (
          <Card key={user.id} className="overflow-hidden">
            <CardHeader className="p-3 sm:p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                    <CardTitle className="text-sm sm:text-lg truncate">{user.name}</CardTitle>
                  </div>
                  {getRoleBadge(user.role)}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-600 truncate">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-600 truncate">{user.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Building className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-medium">Доступные объекты:</div>
                    <div className="text-xs sm:text-sm text-gray-600">{getObjectsInfo(user)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <div className="flex gap-2 flex-wrap w-full">
                    {user.role === 'ADMIN' ? (
                      // Для главного администратора только смена пароля
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChangePassword(user)}
                        className="flex-1 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm min-w-[100px] min-h-[36px]"
                      >
                        <Key className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="ml-1 truncate">Сменить пароль</span>
                      </Button>
                    ) : (
                      // Для заместителей полный функционал
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="flex-1 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm min-w-[80px] min-h-[36px]"
                        >
                          <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="ml-1 truncate hidden sm:inline">Редактировать</span>
                          <span className="ml-1 truncate sm:hidden">Ред.</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="flex-1 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm min-w-[80px] min-h-[36px]"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="ml-1 truncate">Удалить</span>
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
