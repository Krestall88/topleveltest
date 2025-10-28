'use client';

import { useState, useEffect } from 'react';
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
  Phone
} from 'lucide-react';
import CreateUserModal from './CreateUserModal';
import AssignObjectsModal from './AssignObjectsModal';
import ResetPasswordModal from './ResetPasswordModal';

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
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
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

  const handleAssignObjects = (user: User) => {
    setSelectedUser(user);
    setIsAssignModalOpen(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setIsResetPasswordModalOpen(true);
  };

  const handleAssignmentsUpdated = () => {
    setIsAssignModalOpen(false);
    setSelectedUser(null);
    loadUsers();
  };

  const handlePasswordReset = () => {
    setIsResetPasswordModalOpen(false);
    setSelectedUser(null);
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
            <p className="text-gray-600">Назначение заместителей и управление правами доступа</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Добавить пользователя
        </Button>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
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
                  {user.role === 'DEPUTY_ADMIN' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignObjects(user)}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Назначить объекты
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResetPassword(user)}
                  >
                    <Key className="w-4 h-4 mr-1" />
                    Сбросить пароль
                  </Button>
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

      {selectedUser && (
        <>
          <AssignObjectsModal
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            user={selectedUser}
            onAssignmentsUpdated={handleAssignmentsUpdated}
          />

          <ResetPasswordModal
            isOpen={isResetPasswordModalOpen}
            onClose={() => setIsResetPasswordModalOpen(false)}
            user={selectedUser}
            onPasswordReset={handlePasswordReset}
          />
        </>
      )}
    </div>
  );
}
