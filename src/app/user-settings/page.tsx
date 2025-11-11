import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import TelegramBindingWidget from '@/components/TelegramBindingWidget';

async function getUserFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  
  if (!token) {
    return null;
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export default async function UserSettingsPage() {
  const user = await getUserFromCookies();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <p className="text-base text-gray-900">{user.email as string}</p>
              </div>
              {user.name && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Имя:</span>
                  <p className="text-base text-gray-900">{user.name as string}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-500">Роль:</span>
                <p className="text-base text-gray-900">
                  {(() => {
                    const role = user.role as string;
                    if (role === 'ADMIN') return 'Администратор';
                    if (role === 'DEPUTY_ADMIN') return 'Заместитель администратора';
                    if (role === 'MANAGER') return 'Менеджер';
                    if (role === 'SENIOR_MANAGER') return 'Старший менеджер';
                    if (role === 'ACCOUNTANT') return 'Бухгалтер';
                    return role;
                  })()}
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
