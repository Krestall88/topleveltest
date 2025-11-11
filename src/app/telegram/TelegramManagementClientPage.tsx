'use client';

import { useState } from 'react';
import TelegramBindingWidget from '@/components/TelegramBindingWidget';
import TelegramClientBindings from '@/components/TelegramClientBindings';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';

interface User {
  id: string;
  role: string;
  name: string | null;
  email: string;
}

interface TelegramManagementClientPageProps {
  user: User;
}

export default function TelegramManagementClientPage({ user }: TelegramManagementClientPageProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'clients'>('notifications');
  
  // Проверяем, может ли пользователь управлять клиентами
  const canManageClients = user.role === 'ADMIN' || user.role === 'DEPUTY_ADMIN';

  // Browser Notifications
  const { permission, isSupported, requestPermission, showNotification } = useBrowserNotifications();

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      // Показываем тестовое уведомление
      showNotification({
        title: '✅ Уведомления включены!',
        body: 'Теперь вы будете получать уведомления даже когда браузер свернут',
        tag: 'test-notification'
      });
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📱 Telegram</h1>
          <p className="mt-2 text-sm text-gray-600">
            Управление уведомлениями и привязками клиентов
          </p>
        </div>

        {/* Табы */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="flex items-center">
                <span className="mr-2">🔔</span>
                Мои уведомления
              </span>
            </button>
            
            {canManageClients && (
              <button
                onClick={() => setActiveTab('clients')}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 'clients'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="flex items-center">
                  <span className="mr-2">👥</span>
                  Клиенты (доп. задания)
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* Контент табов */}
        <div className="space-y-6">
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Описание секции */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  🔔 Уведомления для менеджеров
                </h3>
                <p className="text-sm text-blue-700">
                  Привяжите свой Telegram аккаунт, чтобы получать уведомления о новых задачах, 
                  назначениях на объекты и другие важные события.
                </p>
              </div>

              {/* Виджет привязки */}
              <TelegramBindingWidget />

              {/* Browser Notifications */}
              {isSupported && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    🌐 Уведомления в браузере
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Получайте уведомления прямо в браузере, даже когда вкладка свернута или открыта другая страница.
                  </p>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {permission === 'granted' ? (
                        <>
                          <span className="text-2xl">✅</span>
                          <div>
                            <p className="font-medium text-green-700">Уведомления включены</p>
                            <p className="text-sm text-gray-600">
                              Вы будете получать уведомления в браузере
                            </p>
                          </div>
                        </>
                      ) : permission === 'denied' ? (
                        <>
                          <span className="text-2xl">❌</span>
                          <div>
                            <p className="font-medium text-red-700">Уведомления заблокированы</p>
                            <p className="text-sm text-gray-600">
                              Разрешите уведомления в настройках браузера
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl">🔔</span>
                          <div>
                            <p className="font-medium text-gray-900">Уведомления не включены</p>
                            <p className="text-sm text-gray-600">
                              Нажмите кнопку чтобы включить
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {permission === 'default' && (
                      <button
                        onClick={handleRequestPermission}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Включить уведомления
                      </button>
                    )}
                  </div>

                  {permission === 'granted' && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>💡 Совет:</strong> Уведомления будут показываться автоматически каждые 30 секунд при появлении новых событий.
                        Когда вкладка в фоне, проверка происходит реже (каждые 60 секунд) для экономии ресурсов.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Информация о типах уведомлений */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Типы уведомлений
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">✉️</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Новые задачи</h4>
                      <p className="text-sm text-gray-600">
                        Когда вам назначена новая задача от клиента
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🏢</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Назначение на объект</h4>
                      <p className="text-sm text-gray-600">
                        Когда вас назначили менеджером объекта
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🗺️</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Назначение на участок</h4>
                      <p className="text-sm text-gray-600">
                        Когда вас назначили на участок объекта
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">💬</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Комментарии</h4>
                      <p className="text-sm text-gray-600">
                        Когда кто-то оставил комментарий к вашей задаче
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clients' && canManageClients && (
            <div className="space-y-6">
              {/* Описание секции */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-900 mb-2">
                  👥 Привязка клиентов к объектам
                </h3>
                <p className="text-sm text-green-700 mb-3">
                  Здесь вы можете управлять привязками Telegram аккаунтов клиентов к объектам. 
                  Клиенты смогут отправлять дополнительные задания через бота.
                </p>
                <div className="bg-white rounded p-3 text-sm text-gray-700">
                  <p className="font-medium mb-1">Как это работает:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Создайте привязку клиента к объекту</li>
                    <li>Клиент пишет боту в Telegram</li>
                    <li>Бот создаёт дополнительное задание</li>
                    <li>Менеджер объекта получает уведомление</li>
                  </ol>
                </div>
              </div>

              {/* Компонент управления привязками */}
              <div className="bg-white rounded-lg shadow">
                <TelegramClientBindings />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
