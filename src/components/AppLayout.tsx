'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { Menu, X } from 'lucide-react';

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
  const [newTasksCount, setNewTasksCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Пытаемся загрузить пользователя из localStorage
    const cachedUser = localStorage.getItem('currentUser');
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch (e) {
        console.error('Error parsing cached user:', e);
      }
    }
    
    // Получаем информацию о текущем пользователе
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          // Сохраняем в localStorage для быстрой загрузки
          localStorage.setItem('currentUser', JSON.stringify(data.user));
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
    fetchNewTasksCount();
  }, []);

  // Функция для получения количества новых заданий
  const fetchNewTasksCount = async () => {
    try {
      const response = await fetch('/api/additional-tasks');
      if (response.ok) {
        const tasks = await response.json();
        const newTasks = tasks.filter((task: any) => task.status === 'NEW');
        setNewTasksCount(newTasks.length);
      }
    } catch (error) {
      console.error('Error fetching new tasks count:', error);
    }
  };

  // Polling для обновления счетчика каждые 30 секунд
  useTaskPolling(fetchNewTasksCount, 30000, !!user);

  // Обновляем счетчик при переходе на страницу дополнительных заданий
  useEffect(() => {
    if (pathname === '/additional-tasks' && user) {
      fetchNewTasksCount();
    }
  }, [pathname, user]);

  // Слушаем события обновления счетчика из других компонентов
  useEffect(() => {
    const handleTaskUpdate = () => {
      fetchNewTasksCount();
    };

    window.addEventListener('taskStatusChanged', handleTaskUpdate);
    return () => window.removeEventListener('taskStatusChanged', handleTaskUpdate);
  }, []);

  const isActive = (path: string) => {
    if (!mounted) return '';
    return pathname === path ? 'bg-blue-600' : '';
  };

  // Проверяем, может ли пользователь видеть страницы управления пользователями и менеджерами
  const canViewUsers = user && (user.role === 'ADMIN' || user.role === 'DEPUTY_ADMIN');
  
  // Для бухгалтера показываем только инвентарь
  const isAccountant = user && user.role === 'ACCOUNTANT';
  
  // Функция для проверки видимости пунктов меню по ролям
  const canViewMenuItem = (menuItem: string) => {
    if (!user) return false;
    
    const { role } = user;
    
    // Главный администратор видит все
    if (role === 'ADMIN') return true;
    
    // Заместитель администратора видит все, кроме управления администраторами
    if (role === 'DEPUTY_ADMIN') {
      return menuItem !== 'admin';
    }
    
    // Менеджер видит ограниченный набор
    if (role === 'MANAGER') {
      const managerMenus = ['objects', 'manager-calendar', 'additional-tasks', 'photos', 'inventory', 'reporting'];
      return managerMenus.includes(menuItem);
    }
    
    // Бухгалтер видит только инвентарь
    if (role === 'ACCOUNTANT') {
      return menuItem === 'inventory';
    }
    
    return false;
  };

  // Компонент меню для переиспользования
  const MenuContent = () => (
    <>
      {isAccountant ? (
        // Для бухгалтера показываем только инвентарь
        <Link
          href="/inventory"
          className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/inventory')}`}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <span className="mr-3">📦</span>
          Инвентарь
        </Link>
      ) : (
        // Для всех остальных ролей показываем меню согласно правам доступа
        <>
          {canViewMenuItem('dashboard') && (
            <Link
              href="/"
              className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/')}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mr-3">🏠</span>
              Дашборд
            </Link>
          )}
          
          {canViewMenuItem('objects') && (
            <Link
              href="/objects"
              className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/objects')}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mr-3">🏢</span>
              Объекты
            </Link>
          )}
          
          {canViewMenuItem('admin') && (
            <Link
              href="/admin"
              className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/admin')}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mr-3">👥</span>
              Администраторы
            </Link>
          )}
          
          {canViewMenuItem('managers') && (
            <Link
              href="/managers"
              className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/managers')}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mr-3">🔧</span>
              Менеджеры
            </Link>
          )}
          
          {canViewMenuItem('completion-settings') && (
            <Link
              href="/completion-settings"
              className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/completion-settings')}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mr-3">⚙️</span>
              Настройки завершения
            </Link>
          )}
          
          {canViewMenuItem('manager-calendar') && (
            <Link
              href="/manager-calendar"
              className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/manager-calendar')}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mr-3">📅</span>
              Календарь задач
            </Link>
          )}
          
          {canViewMenuItem('additional-tasks') && (
            <Link
              href="/additional-tasks"
              className={`flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/additional-tasks')}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                <span className="mr-3">💬</span>
                Доп. задания
              </div>
              {newTasksCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {newTasksCount}
                </span>
              )}
            </Link>
          )}
          
          {canViewMenuItem('photos') && (
            <Link
              href="/photos"
              className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/photos')}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mr-3">📷</span>
              Фотоотчёты
            </Link>
          )}
          
          {canViewMenuItem('reporting') && (
            <Link
              href="/reporting"
              className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/reporting')}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mr-3">📋</span>
              Отчетность по чек-листам
            </Link>
          )}
          
          {canViewMenuItem('inventory') && (
            <Link
              href="/inventory"
              className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/inventory')}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mr-3">📦</span>
              Инвентарь
            </Link>
          )}
          
          {canViewMenuItem('audit') && (
            <Link
              href="/audit"
              className={`flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 ${isActive('/audit')}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mr-3">📋</span>
              История действий
            </Link>
          )}
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
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Мобильная шапка */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-slate-800 text-white z-50 px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">Клининг-Контроль</h2>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-slate-700 rounded"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Мобильное меню */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="fixed top-0 left-0 bottom-0 w-64 bg-slate-800 text-white overflow-y-auto pt-16"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="p-2">
              <MenuContent />
            </nav>
          </div>
        </div>
      )}

      {/* Десктопное меню */}
      <div className="hidden lg:block w-48 bg-slate-800 text-white flex-shrink-0">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-sm font-medium text-white">
            Клининг-<br />Контроль
          </h2>
        </div>
        <nav className="p-2">
          <MenuContent />
        </nav>
      </div>
      
      {/* Основной контент */}
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
