'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, CheckSquare, FileText, MapPin, User, Clock, Plus, Settings, CheckCircle2 } from 'lucide-react';
import TaskManager from '@/components/TaskManager';
import TestChecklistCreator from '@/components/TestChecklistCreator';
import ChecklistCompletionModal from '@/components/ChecklistCompletionModal';
import CompletionRequirementsManager from '@/components/CompletionRequirementsManager';
import TaskScheduleManager from '@/components/TaskScheduleManager';
import TechCardManager from '@/components/TechCardManager';
import DynamicObjectTree from '@/components/DynamicObjectTree';
import TechTasksPanel from '@/components/TechTasksPanel';

interface Room {
  id: string;
  name: string;
  description: string;
  area: number;
  techCards: TechCard[];
}

interface TechCard {
  id: string;
  name: string;
  workType: string;
  frequency: string;
  description: string;
}

interface CleaningObject {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  manager?: { id: string; name: string; email: string };
  creator?: { id: string; name: string };
  rooms: Room[];
  _count: {
    rooms: number;
    techCards: number;
    checklists: number;
    requests: number;
  };
}

interface Checklist {
  id: string;
  date: string;
  status: string;
  room?: { id: string; name: string };
  completedTasks: number;
  totalTasks: number;
  completedAt?: string;
  object?: {
    id: string;
    name: string;
    address: string;
    requirePhotoForCompletion?: boolean;
  };
  tasks?: Array<{
    id: string;
    description: string;
    status: string;
  }>;
}

export default function ObjectDetailClientPage() {
  const { id } = useParams();
  const router = useRouter();
  const [object, setObject] = useState<CleaningObject | null>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRequirementsManager, setShowRequirementsManager] = useState(false);
  const [showScheduleManager, setShowScheduleManager] = useState(false);
  const [showTechCardManager, setShowTechCardManager] = useState(false);
  const [selectedChecklistForCompletion, setSelectedChecklistForCompletion] = useState<any>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const [isEditingManager, setIsEditingManager] = useState(false);
  const [selectedTechTasks, setSelectedTechTasks] = useState<any[]>([]);
  const [selectedContext, setSelectedContext] = useState<string>('');

  const fetchObjectData = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/objects/${id}`);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить данные объекта');
      }
      
      const data = await response.json();
      console.log('🏢 Загружен объект:', data);
      console.log('🏠 Помещения:', data.rooms);
      console.log('📋 Общее количество техкарт:', data._count?.techCards);
      
      setObject(data);
      
      // Выбираем первое помещение по умолчанию
      if (data.rooms && data.rooms.length > 0) {
        console.log('🎯 Выбрано помещение:', data.rooms[0].name, 'Техкарт:', data.rooms[0].techCards?.length);
        setSelectedRoom(data.rooms[0]);
      }
    } catch (error) {
      console.error('Ошибка загрузки объекта:', error);
      setError('Не удалось загрузить данные объекта');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChecklists = async () => {
    if (!id) return;
    
    try {
      const response = await fetch(`/api/checklists?objectId=${id}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setChecklists(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки чек-листов:', error);
    }
  };

  const fetchChecklistDetails = async (checklistId: string) => {
    try {
      const response = await fetch(`/api/checklists/${checklistId}`);
      if (response.ok) {
        const checklist = await response.json();
        return {
          ...checklist,
          object: object || checklist.object,
        };
      }
    } catch (error) {
      console.error('Ошибка загрузки деталей чек-листа:', error);
    }
    return null;
  };

  const handleCompleteChecklist = async (checklistId: string) => {
    const checklistDetails = await fetchChecklistDetails(checklistId);
    if (checklistDetails && checklistDetails.object) {
      setSelectedChecklistForCompletion(checklistDetails);
      setShowCompletionModal(true);
    }
  };

  const handleCompletionSuccess = () => {
    fetchChecklists(); // Обновляем список чек-листов
    setSelectedChecklistForCompletion(null);
    setShowCompletionModal(false);
  };

  const fetchManagers = async () => {
    try {
      const response = await fetch('/api/users?role=MANAGER');
      if (response.ok) {
        const data = await response.json();
        setManagers(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки менеджеров:', error);
    }
  };

  const updateManager = async (managerId: string) => {
    try {
      const response = await fetch(`/api/objects/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ managerId }),
      });

      if (response.ok) {
        const updatedObject = await response.json();
        setObject(updatedObject);
        setIsEditingManager(false);
      }
    } catch (error) {
      console.error('Ошибка обновления менеджера:', error);
    }
  };

  const handleSelectTechTasks = (techTasks: any[], context: string) => {
    setSelectedTechTasks(techTasks);
    setSelectedContext(context);
  };

  useEffect(() => {
    fetchObjectData();
    fetchChecklists();
    fetchManagers();
  }, [id]);

  const handleCreateChecklist = async (roomId?: string) => {
    console.log('🏗️ Создание чек-листа для объекта:', {
      objectId: id,
      roomId: roomId || null,
      roomName: selectedRoom?.name,
    });

    try {
      const response = await fetch('/api/checklists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objectId: id,
          roomId: roomId || null,
          date: new Date().toISOString().split('T')[0],
        }),
      });

      console.log('📡 Ответ сервера:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Ошибка от сервера:', errorData);
        throw new Error(errorData.message || 'Не удалось создать чек-лист');
      }

      const result = await response.json();
      console.log('✅ Создан чек-лист:', result);
      
      if (result.checklists && result.checklists.length > 0) {
        alert(`Успешно создано ${result.count} чек-листов для ${roomId ? selectedRoom?.name : 'всего объекта'}! Всего задач: ${result.totalTasks}`);
      } else {
        alert(`Чек-лист успешно создан для ${roomId ? selectedRoom?.name : 'всего объекта'}!`);
      }
      fetchChecklists();
      
      // Перенаправляем на страницу чек-листов
      router.push('/checklists');
    } catch (error) {
      console.error('❌ Ошибка создания чек-листа:', error);
      alert(`Не удалось создать чек-лист: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Загрузка данных объекта...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  if (!object) {
    return <div className="text-center py-8">Объект не найден</div>;
  }

  return (
    <div className="space-y-6">
      {/* Навигация */}
      <div className="flex items-center">
        <Button 
          onClick={() => router.push('/objects')} 
          variant="outline" 
          className="mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          К списку объектов
        </Button>
      </div>

      {/* Заголовок объекта */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">{object.name}</h1>
              <div className="flex items-center text-gray-600 space-x-4">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {object.address}
                </div>
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {isEditingManager ? (
                    <div className="flex items-center space-x-2">
                      <select
                        defaultValue={object.manager?.id || ''}
                        onChange={(e) => updateManager(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="">Не назначен</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={() => setIsEditingManager(false)}
                        size="sm"
                        variant="outline"
                      >
                        Отмена
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>{object.manager?.name || 'Не назначен'}</span>
                      <Button
                        onClick={() => setIsEditingManager(true)}
                        size="sm"
                        variant="outline"
                      >
                        Изменить
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="flex space-x-2">
                <Button
                  onClick={() => setShowRequirementsManager(true)}
                  size="sm"
                  variant="outline"
                  className="flex items-center"
                >
                  <CheckSquare className="w-4 h-4 mr-1" />
                  Настройки завершения
                </Button>
                <Button
                  onClick={() => setShowScheduleManager(true)}
                  size="sm"
                  variant="outline"
                  className="flex items-center"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  Расписание задач
                </Button>
              </div>
              <div className="text-sm text-gray-500">
                Создан: {new Date(object.createdAt).toLocaleDateString('ru-RU')}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{object._count.rooms}</div>
              <div className="text-sm text-gray-600">Помещений</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{object._count.techCards}</div>
              <div className="text-sm text-gray-600">Техзаданий</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{object._count.checklists}</div>
              <div className="text-sm text-gray-600">Чек-листов</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{object._count.requests}</div>
              <div className="text-sm text-gray-600">Заявок</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Новый двухколоночный дизайн */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Левая колонка - Иерархия объекта */}
        <div>
          <Card className="h-[700px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Структура объекта
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DynamicObjectTree 
                objectId={object.id} 
                onSelectTechTasks={handleSelectTechTasks}
              />
            </CardContent>
          </Card>
        </div>

        {/* Правая колонка - Техзадания */}
        <div>
          <TechTasksPanel 
            techTasks={selectedTechTasks}
            context={selectedContext}
          />
        </div>
      </div>

      {/* Последние чек-листы */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>📋 Последние чек-листы</span>
            <Button 
              onClick={() => handleCreateChecklist()}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Создать
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checklists.slice(0, 5).map((checklist) => (
            <div
              key={checklist.id}
              className="p-3 rounded-lg border hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => router.push(`/checklists/${checklist.id}`)}
                >
                  <div className="text-sm font-medium">
                    {new Date(checklist.date).toLocaleDateString('ru-RU')}
                  </div>
                  {checklist.room && (
                    <div className="text-xs text-gray-600 mt-1">
                      {checklist.room.name}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {checklist.completedTasks}/{checklist.totalTasks} задач
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={checklist.completedAt ? 'default' : 'secondary'}
                  >
                    {checklist.completedAt ? 'Завершен' : 'В работе'}
                  </Badge>
                  
                  {!checklist.completedAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompleteChecklist(checklist.id);
                      }}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Завершить
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {checklists.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              Чек-листы не созданы
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно управления техкартами */}
      {showTechCardManager && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Управление техкартами</h2>
              <Button
                onClick={() => setShowTechCardManager(false)}
                variant="outline"
                size="sm"
              >
                ✕ Закрыть
              </Button>
            </div>
            
            <TechCardManager 
              roomId={selectedRoom.id}
              roomName={selectedRoom.name}
              objectId={object?.id || ''}
            />
          </div>
        </div>
      )}

      {/* Модальное окно завершения чек-листа */}
      <ChecklistCompletionModal
        checklist={selectedChecklistForCompletion}
        isOpen={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          setSelectedChecklistForCompletion(null);
        }}
        onComplete={handleCompletionSuccess}
      />

      {/* Модальное окно настроек требований к завершению */}
      <CompletionRequirementsManager
        isOpen={showRequirementsManager}
        onClose={() => setShowRequirementsManager(false)}
        objectId={object.id}
      />

      {/* Модальное окно управления расписанием задач */}
      <TaskScheduleManager
        isOpen={showScheduleManager}
        onClose={() => setShowScheduleManager(false)}
        objectId={object.id}
      />
    </div>
  );
}
