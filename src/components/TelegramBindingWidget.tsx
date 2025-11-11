'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';

interface TelegramBindingData {
  isBound: boolean;
  telegram: {
    username?: string;
    firstName?: string;
    lastName?: string;
  } | null;
}

interface BindingCodeData {
  bindingCode: string;
  expiresAt: string;
  botUsername: string;
  instructions: string;
}

export default function TelegramBindingWidget() {
  const [bindingData, setBindingData] = useState<TelegramBindingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [codeData, setCodeData] = useState<BindingCodeData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Загрузка статуса привязки
  useEffect(() => {
    loadBindingStatus();
  }, []);

  // Таймер обратного отсчета
  useEffect(() => {
    if (!codeData) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const expiresAt = new Date(codeData.expiresAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0) {
        setCodeData(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [codeData]);

  const loadBindingStatus = async () => {
    try {
      const response = await fetch('/api/user/telegram/bind');
      if (response.ok) {
        const data = await response.json();
        setBindingData(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса привязки:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCode = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/user/telegram/bind', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setCodeData(data);
        setIsModalOpen(true);
      } else {
        alert('Ошибка генерации кода');
      }
    } catch (error) {
      console.error('Ошибка генерации кода:', error);
      alert('Ошибка генерации кода');
    } finally {
      setIsGenerating(false);
    }
  };

  const unbindTelegram = async () => {
    if (!confirm('Вы уверены, что хотите отвязать Telegram?')) {
      return;
    }

    try {
      const response = await fetch('/api/user/telegram/bind', {
        method: 'DELETE',
      });

      if (response.ok) {
        setBindingData({ isBound: false, telegram: null });
        alert('Telegram успешно отвязан');
      } else {
        alert('Ошибка отвязки');
      }
    } catch (error) {
      console.error('Ошибка отвязки:', error);
      alert('Ошибка отвязки');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            📱 Telegram уведомления
          </h3>
        </div>

        {bindingData?.isBound ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h4 className="text-sm font-medium text-green-800">
                    Telegram привязан
                  </h4>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      <span className="font-medium">Имя:</span>{' '}
                      {bindingData.telegram?.firstName}{' '}
                      {bindingData.telegram?.lastName}
                    </p>
                    {bindingData.telegram?.username && (
                      <p>
                        <span className="font-medium">Username:</span> @
                        {bindingData.telegram.username}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p className="mb-2">Вы будете получать уведомления о:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Новых задачах</li>
                <li>Назначении на объекты и участки</li>
                <li>Комментариях к задачам</li>
                <li>Просроченных задачах</li>
              </ul>
            </div>

            <button
              onClick={unbindTelegram}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Отвязать Telegram
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Привяжите Telegram, чтобы получать уведомления о новых задачах и важных событиях.
            </p>

            <button
              onClick={generateCode}
              disabled={isGenerating}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Генерация...' : 'Привязать Telegram'}
            </button>
          </div>
        )}
      </div>

      {/* Модальное окно с кодом привязки */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
              Привязка Telegram
            </Dialog.Title>

            {codeData && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    Отправьте боту следующую команду:
                  </p>
                  
                  <div className="bg-white rounded border border-gray-300 p-3 font-mono text-center">
                    <code className="text-lg font-bold text-blue-600">
                      /bind {codeData.bindingCode}
                    </code>
                  </div>

                  {timeLeft !== null && (
                    <div className="mt-3 text-center">
                      <p className="text-sm text-gray-600">
                        Код действителен:{' '}
                        <span className={`font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatTime(timeLeft)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">
                    Инструкция:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                    <li>
                      Откройте Telegram и найдите бота{' '}
                      <span className="font-mono bg-gray-100 px-1 rounded">
                        @{codeData.botUsername}
                      </span>
                    </li>
                    <li>Отправьте команду с кодом (скопируйте выше)</li>
                    <li>Дождитесь подтверждения от бота</li>
                    <li>Обновите эту страницу</li>
                  </ol>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`/bind ${codeData.bindingCode}`);
                      alert('Команда скопирована!');
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    📋 Скопировать команду
                  </button>
                  
                  <a
                    href={`https://t.me/${codeData.botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
                  >
                    Открыть бота
                  </a>
                </div>

                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    loadBindingStatus();
                  }}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Закрыть
                </button>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}
