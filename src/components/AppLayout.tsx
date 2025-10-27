'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import NotificationBell from '@/components/NotificationBell';

interface User {
  id: string;
  role: string;
  name: string;
  email: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Получаем информацию о текущем пользователе
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  const isActive = (path: string) => {
    if (!mounted) return '';
    return pathname === path ? 'bg-blue-600' : '';
  };

  // Проверяем, может ли пользователь видеть страницы управления пользователями и менеджерами
  const canViewUsers = user && (user.role === 'ADMIN' || user.role === 'DEPUTY');
  
  // Для бухгалтера показываем только инвентарь
  const isAccountant = user && user.role === 'ACCOUNTANT';

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Левое меню - точно как на первом скриншоте */}
      <div className="w-48 bg-slate-800 text-white flex-shrink-0">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-sm font-medium text-white">
            Клининг-<br />Контроль
          </h2>
          <div className="mt-2">
            <NotificationBell />
          </div>
        </div>
        <nav className="p-2">
          {isAccountant ? (
            // Для бухгалтера показываем только инвентарь
            <Link
              href="/inventory"
              className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/inventory')}`}
            >
              <span className="mr-3">📦</span>
              Инвентарь
            </Link>
          ) : (
            // Для всех остальных ролей показываем полное меню
            <>
              <Link
                href="/"
                className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/')}`}
              >
                <span className="mr-3">🏠</span>
                Дашборд
              </Link>
              <Link
                href="/objects"
                className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/objects')}`}
              >
                <span className="mr-3">🏢</span>
                Объекты
              </Link>
              {canViewUsers && (
                <Link
                  href="/managers"
                  className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/managers')}`}
                >
                  <span className="mr-3">🔧</span>
                  Менеджеры
                </Link>
              )}
              {canViewUsers && (
                <Link
                  href="/completion-settings"
                  className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/completion-settings')}`}
                >
                  <span className="mr-3">⚙️</span>
                  Настройки завершения
                </Link>
              )}
              <Link
                href="/manager-calendar"
                className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/manager-calendar')}`}
              >
                <span className="mr-3">📅</span>
                Календарь задач
              </Link>
              <Link
                href="/additional-tasks"
                className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/additional-tasks')}`}
              >
                <span className="mr-3">💬</span>
                Доп. задания
              </Link>
              <Link
                href="/photos"
                className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/photos')}`}
              >
                <span className="mr-3">📷</span>
                Фотоотчёты
              </Link>
              {(user?.role === 'ADMIN' || user?.role === 'DEPUTY') && (
                <Link
                  href="/reporting"
                  className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/reporting')}`}
                >
                  <span className="mr-3">📋</span>
                  Отчетность по чек-листам
                </Link>
              )}
              <Link
                href="/inventory"
                className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/inventory')}`}
              >
                <span className="mr-3">📦</span>
                Инвентарь
              </Link>
              <Link
                href="/notifications"
                className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/notifications')}`}
              >
                <span className="mr-3">🔔</span>
                Уведомления
              </Link>
              <Link
                href="/audit"
                className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/audit')}`}
              >
                <span className="mr-3">📋</span>
                История действий
              </Link>
            </>
          )}
          
          {/* Кнопка выхода для всех пользователей */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <button
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.href = '/auth/login';
                } catch (error) {
                  console.error('Ошибка выхода:', error);
                  window.location.href = '/auth/login';
                }
              }}
              className="flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 w-full text-left"
            >
              <span className="mr-3">🚪</span>
              Выход
            </button>
            {user && (
              <div className="px-3 py-2 text-xs text-gray-400">
                {user.name} ({user.role})
              </div>
            )}
          </div>
        </nav>
      </div>
      
      {/* Основной контент */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
