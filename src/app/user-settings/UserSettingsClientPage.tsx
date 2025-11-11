'use client';

import TelegramBindingWidget from '@/components/TelegramBindingWidget';

interface User {
  id: string;
  role: string;
  name: string | null;
  email: string;
}

interface UserSettingsClientPageProps {
  user: User;
}

export default function UserSettingsClientPage({ user }: UserSettingsClientPageProps) {
  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      ADMIN: 'Администратор',
      DEPUTY_ADMIN: 'Заместитель администратора',
      MANAGER: 'Менеджер',
      SENIOR_MANAGER: 'Старший менеджер',
      ACCOUNTANT: 'Бухгалтер'
    };
    return roleNames[role] || role;
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Настройки</h1>
          <p className="mt-2 text-sm text-gray-600">
            Управление вашим профилем и уведомлениями
          </p>
        </div>

        <div className="space-y-6">
          {/* Информация о пользователе */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Информация о профиле
            </h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Email:</span>
                <p className="text-base text-gray-900">{user.email}</p>
              </div>
              {user.name && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Имя:</span>
                  <p className="text-base text-gray-900">{user.name}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-500">Роль:</span>
                <p className="text-base text-gray-900">
                  {getRoleName(user.role)}
                </p>
              </div>
            </div>
          </div>

          {/* Виджет привязки Telegram */}
          <TelegramBindingWidget />

          {/* Дополнительные настройки можно добавить здесь */}
        </div>
      </div>
    </div>
  );
}
