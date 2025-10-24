'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Building, MapPin, User, ArrowLeft } from 'lucide-react';

// Типы для Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        close: () => void;
        ready: () => void;
        expand: () => void;
        isExpanded: boolean;
        viewportHeight: number;
        initData: string;
        initDataUnsafe: any;
      };
    };
  }
}

interface CleaningObject {
  id: string;
  name: string;
  address: string;
  manager?: {
    name: string;
    email: string;
  };
}

interface ExistingBinding {
  object: {
    id: string;
    name: string;
    address: string;
  };
}

function ChooseObjectContent() {
  const searchParams = useSearchParams();
  const telegramId = searchParams.get('telegramId');

  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [existingBinding, setExistingBinding] = useState<ExistingBinding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select');
  const [selectedObject, setSelectedObject] = useState<CleaningObject | null>(null);

  useEffect(() => {
    fetchObjects();
    
    // Инициализируем Telegram WebApp
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, [telegramId]);

  const fetchObjects = async () => {
    try {
      const params = new URLSearchParams();
      if (telegramId) params.set('telegramId', telegramId);

      const headers: Record<string, string> = {};
      
      // Добавляем заголовок ngrok только в режиме разработки
      if (process.env.NODE_ENV === 'development') {
        headers['ngrok-skip-browser-warning'] = 'true';
      }

      const response = await fetch(`/api/client-bindings?${params}`, {
        headers
      });
      const data = await response.json();

      if (response.ok) {
        setObjects(data.objects);
        setExistingBinding(data.existingBinding);
      } else {
        setMessage(data.message || 'Ошибка загрузки объектов');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setMessage('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handleObjectSelect = (objectId: string) => {
    const object = objects.find(obj => obj.id === objectId);
    if (object) {
      setSelectedObject(object);
      setSelectedObjectId(objectId);
      setStep('confirm');
    }
  };

  const handleConfirmSelection = async () => {
    if (!selectedObject) return;
    
    setIsSelecting(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (process.env.NODE_ENV === 'development') {
        headers['ngrok-skip-browser-warning'] = 'true';
      }

      const response = await fetch('/api/client-bindings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          telegramId,
          objectId: selectedObject.id
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setExistingBinding(data.binding);
        setStep('success');
        
        // Уведомляем Telegram бота о выборе
        if (telegramId) {
          try {
            const notifyHeaders: Record<string, string> = {
              'Content-Type': 'application/json'
            };
            
            if (process.env.NODE_ENV === 'development') {
              notifyHeaders['ngrok-skip-browser-warning'] = 'true';
            }

            await fetch('/api/telegram/notify-selection', {
              method: 'POST',
              headers: notifyHeaders,
              body: JSON.stringify({
                telegramId,
                objectId: selectedObject.id
              })
            });
          } catch (notifyError) {
            console.error('Ошибка уведомления бота:', notifyError);
          }
        }
        
        // Автозакрытие только для Telegram
        if (telegramId) {
          setTimeout(() => {
            if (window.Telegram?.WebApp) {
              window.Telegram.WebApp.close();
            } else {
              window.close();
            }
          }, 3000);
        }
      } else {
        setMessage(data.message || 'Ошибка выбора объекта');
        setStep('select');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setMessage('Ошибка соединения с сервером');
      setStep('select');
    } finally {
      setIsSelecting(false);
    }
  };

  const handleBackToSelect = () => {
    setStep('select');
    setSelectedObject(null);
    setSelectedObjectId('');
    setMessage('');
  };

  if (!telegramId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Ошибка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Отсутствует Telegram ID. Обратитесь к администратору.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка объектов...</p>
        </div>
      </div>
    );
  }

  // Шаг 1: Выбор объекта из выпадающего списка
  if (step === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Building className="h-6 w-6 text-blue-600" />
              Выбор объекта
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Выберите объект для обслуживания из списка
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <div className={`p-4 rounded-lg ${message.includes('успешно') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <div className="flex items-center gap-2">
                  {message.includes('успешно') ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <p className="text-sm">{message}</p>
                </div>
              </div>
            )}

            {existingBinding && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Текущая привязка</span>
                </div>
                <p className="font-semibold text-gray-900">{existingBinding.object.name}</p>
                <p className="text-sm text-gray-600">{existingBinding.object.address}</p>
                <p className="text-xs text-blue-700 mt-2">
                  Вы можете выбрать другой объект
                </p>
              </div>
            )}

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Выберите объект из списка:
              </label>
              <Select onValueChange={handleObjectSelect} value={selectedObjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите объект..." />
                </SelectTrigger>
                <SelectContent>
                  {objects.map((object) => (
                    <SelectItem key={object.id} value={object.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{object.name}</span>
                        <span className="text-xs text-gray-500">{object.address}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {objects.length === 0 && (
              <div className="text-center py-8">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Объекты не найдены</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Шаг 2: Подтверждение выбора
  if (step === 'confirm' && selectedObject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Подтверждение выбора
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Убедитесь, что выбран правильный объект
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-white rounded-lg border-2 border-blue-200">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Building className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{selectedObject.name}</h3>
                    <p className="text-gray-600 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {selectedObject.address}
                    </p>
                  </div>
                </div>
                
                {selectedObject.manager && (
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                    <User className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedObject.manager.name}</p>
                      <p className="text-sm text-gray-500">{selectedObject.manager.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ После подтверждения все ваши сообщения будут направляться менеджеру этого объекта
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleBackToSelect}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <Button
                onClick={handleConfirmSelection}
                disabled={isSelecting}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isSelecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Подтверждаю...
                  </>
                ) : (
                  'Подтвердить выбор'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Шаг 3: Успешное завершение
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Объект выбран успешно!
            </h2>
            {selectedObject && (
              <div className="mb-6">
                <p className="font-semibold text-lg">{selectedObject.name}</p>
                <p className="text-gray-600">{selectedObject.address}</p>
              </div>
            )}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                {message || 'Теперь все ваши сообщения будут направляться менеджеру выбранного объекта'}
              </p>
            </div>
            <p className="text-gray-500 text-sm">
              Окно автоматически закроется через несколько секунд...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

export default function ChooseObjectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    }>
      <ChooseObjectContent />
    </Suspense>
  );
}