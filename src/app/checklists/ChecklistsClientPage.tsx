'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, MapPin, User, Calendar, CheckCircle2 } from 'lucide-react';
import TaskManager from '@/components/TaskManager';
import TestChecklistCreator from '@/components/TestChecklistCreator';
import ChecklistCompletionModal from '@/components/ChecklistCompletionModal';

interface Room {
  id: string;
  name: string;
}

interface CleaningObject {
  id: string;
  name: string;
  address: string;
  rooms?: Room[];
}

interface Checklist {
  id: string;
  date: string;
  createdAt: string;
  completedAt?: string;
  name?: string; // Название чек-листа
  object: CleaningObject;
  room?: Room;
  creator: {
    name: string;
    email: string;
  };
  _count?: {
    tasks: number;
  };
  tasks?: Array<{
    id: string;
    description: string;
    status: string;
  }>;
}

export default function ChecklistsClientPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedObjectId, setSelectedObjectId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedChecklistForCompletion, setSelectedChecklistForCompletion] = useState<Checklist | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [groupBy, setGroupBy] = useState<'none' | 'object' | 'room' | 'date'>('object');

  const fetchData = async () => {
    try {
      // Загружаем объекты
      const objectsResponse = await fetch('/api/objects');
      if (objectsResponse.ok) {
        const objectsData = await objectsResponse.json();
        setObjects(objectsData);
      }

      // Загружаем чек-листы
      const checklistsResponse = await fetch('/api/checklists');
      if (checklistsResponse.ok) {
        const checklistsData = await checklistsResponse.json();
        setChecklists(checklistsData);
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoomsForObject = async (objectId: string) => {
    try {
      const response = await fetch(`/api/objects/${objectId}`);
      if (response.ok) {
        const objectData = await response.json();
        setAvailableRooms(objectData.rooms || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки помещений:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedObjectId) {
      fetchRoomsForObject(selectedObjectId);
      setSelectedRoomId(''); // Сбрасываем выбранное помещение
    }
  }, [selectedObjectId]);

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedObjectId) {
      alert('Выберите объект');
      return;
    }

    try {
      const response = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          objectId: selectedObjectId,
          roomId: selectedRoomId || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка создания чек-листа');
      }

      const result = await response.json();
      
      // Показываем сообщение о создании
      if (result.checklists && result.checklists.length > 0) {
        alert(`Успешно создано ${result.count} чек-листов! Всего задач: ${result.totalTasks}`);
      } else {
        alert('Чек-лист успешно создан!');
      }

      await fetchData();
      setIsAddModalOpen(false);
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSelectedObjectId('');
      setSelectedRoomId('');
    } catch (error) {
      console.error('Ошибка при создании чек-листа:', error);
      alert(error instanceof Error ? error.message : 'Не удалось создать чек-лист');
    }
  };

  const handleDeleteChecklist = async (checklistId: string, e: React.MouseEvent, forceDelete = false) => {
    e.stopPropagation(); // Предотвращаем открытие чек-листа
    
    // Если это не принудительное удаление, показываем базовое подтверждение
    if (!forceDelete && !confirm('Удалить чек-лист? Все связанные задачи также будут удалены.')) {
      return;
    }
    
    try {
      const url = forceDelete 
        ? `/api/checklists/${checklistId}?force=true`
        : `/api/checklists/${checklistId}`;
        
      const response = await fetch(url, {
        method: 'DELETE',
      });

      const responseData = await response.json();

      // Если есть активные задачи (статус 409)
      if (response.status === 409 && responseData.hasActiveTasks) {
        const activeTasksList = responseData.activeTasks
          .map((task: any) => `• ${task.description} (${task.status})`)
          .join('\n');
          
        const confirmMessage = `⚠️ ВНИМАНИЕ! В чек-листе есть ${responseData.activeTasksCount} активных задач:\n\n${activeTasksList}\n\nВы действительно хотите удалить чек-лист со всеми активными задачами?\n\nЭто действие нельзя отменить!`;
        
        if (confirm(confirmMessage)) {
          // Повторный вызов с принудительным удалением
          return handleDeleteChecklist(checklistId, e, true);
        }
        return;
      }

      if (!response.ok) {
        throw new Error(responseData.message || 'Ошибка удаления');
      }
      
      // Обновляем список чек-листов
      setChecklists(prevChecklists => prevChecklists.filter(checklist => checklist.id !== checklistId));
      
      // Если удаляемый чек-лист был открыт, закрываем его
      if (selectedChecklist?.id === checklistId) {
        setSelectedChecklist(null);
      }

      // Показываем сообщение об успехе
      console.log('✅ Чек-лист удален успешно:', checklistId);
      
      // Перезагружаем данные для синхронизации
      await fetchData();
      
    } catch (error) {
      console.error('Ошибка при удалении чек-листа:', error);
      alert(error instanceof Error ? error.message : 'Не удалось удалить чек-лист');
    }
  };

  const fetchChecklistDetails = async (checklistId: string) => {
    try {
      const response = await fetch(`/api/checklists/${checklistId}`);
      if (response.ok) {
        const checklist = await response.json();
        return checklist;
      }
    } catch (error) {
      console.error('Ошибка загрузки деталей чек-листа:', error);
    }
    return null;
  };

  const handleCompleteChecklist = async (checklistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const checklistDetails = await fetchChecklistDetails(checklistId);
    if (checklistDetails) {
      setSelectedChecklistForCompletion(checklistDetails);
      setShowCompletionModal(true);
    }
  };

  const handleCompletionSuccess = () => {
    fetchData(); // Обновляем список чек-листов
    setSelectedChecklistForCompletion(null);
    setShowCompletionModal(false);
  };

  // Функция группировки чек-листов
  const groupChecklists = (checklists: Checklist[]) => {
    if (groupBy === 'none') {
      return { 'Все чек-листы': checklists };
    }

    return checklists.reduce((groups, checklist) => {
      let key = '';
      
      switch (groupBy) {
        case 'object':
          key = checklist.object.name;
          break;
        case 'room':
          key = checklist.room ? `${checklist.object.name} - ${checklist.room.name}` : `${checklist.object.name} - Общие работы`;
          break;
        case 'date':
          key = new Date(checklist.date).toLocaleDateString('ru-RU');
          break;
        default:
          key = 'Все чек-листы';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(checklist);
      return groups;
    }, {} as Record<string, Checklist[]>);
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка чек-листов...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и элементы управления */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Управление чек-листами</h2>
        <div className="flex items-center space-x-4">
          {/* Группировка */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Группировать по:</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="none">Без группировки</option>
              <option value="object">Объектам</option>
              <option value="room">Помещениям</option>
              <option value="date">Датам</option>
            </select>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Создать чек-лист
          </button>
        </div>
      </div>

      {/* Компонент для тестирования */}
      <TestChecklistCreator 
        objects={objects}
        onChecklistCreated={fetchData}
      />

      {/* Список чек-листов */}
      {checklists.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <CheckSquare className="w-16 h-16 mx-auto mb-3" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Чек-листы не найдены</h3>
          <p className="text-gray-500 mb-4">Создайте первый чек-лист для начала работы</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Создать чек-лист
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupChecklists(checklists)).map(([groupName, groupChecklists]) => (
            <div key={groupName} className="space-y-4">
              {/* Заголовок группы */}
              {groupBy !== 'none' && (
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-gray-800">{groupName}</h3>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
                    {groupChecklists.length} чек-лист{groupChecklists.length === 1 ? '' : (groupChecklists.length < 5 ? 'а' : 'ов')}
                  </span>
                </div>
              )}
              
              {/* Чек-листы группы */}
              <div className="space-y-4">
                {groupChecklists.map((checklist) => (
                  <div
                    key={checklist.id}
                    className="bg-white p-6 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedChecklist(checklist)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {checklist.name || checklist.object.name}
                          </h3>
                          <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                            checklist.completedAt 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {checklist.completedAt ? 'Завершен' : 'Активный'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          {groupBy !== 'object' && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2" />
                              {checklist.object.name} - {checklist.object.address}
                            </div>
                          )}
                          {checklist.room && (
                            <div className="flex items-center">
                              <div className="w-4 h-4 mr-2 flex items-center justify-center">🏠</div>
                              <span className="text-blue-600 font-medium">{checklist.room.name}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            Создал: {checklist.creator.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="flex items-center justify-end gap-2 mb-2">
                          {!checklist.completedAt && (
                            <button
                              onClick={(e) => handleCompleteChecklist(checklist.id, e)}
                              className="text-green-600 hover:text-green-800 text-sm px-2 py-1 rounded hover:bg-green-50 flex items-center"
                              title="Завершить чек-лист"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Завершить
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDeleteChecklist(checklist.id, e)}
                            className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                            title="Удалить чек-лист"
                          >
                            🗑️ Удалить
                          </button>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(checklist.date).toLocaleDateString('ru-RU')}
                        </div>
                        <div className="flex items-center text-sm text-blue-600 font-medium">
                          <CheckSquare className="w-4 h-4 mr-1" />
                          {checklist._count?.tasks || 0} задач
                        </div>
                        <div className="text-xs text-gray-400">
                          Создан: {new Date(checklist.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </div>
                    
                    {/* Индикатор прогресса */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Прогресс выполнения</span>
                        <span>0%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно создания чек-листа */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Создать новый чек-лист</h2>
            
            <form onSubmit={handleCreateChecklist} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Дата *
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Объект *
                </label>
                <select
                  value={selectedObjectId}
                  onChange={(e) => setSelectedObjectId(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Выберите объект</option>
                  {objects.map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.name} - {obj.address}
                    </option>
                  ))}
                </select>
              </div>

              {selectedObjectId && availableRooms.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Помещение
                  </label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Все помещения</option>
                    {availableRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                  Создать
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно управления заданиями */}
      {selectedChecklist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold">{selectedChecklist.object.name}</h2>
                <p className="text-gray-600">{selectedChecklist.object.address}</p>
                {selectedChecklist.room && (
                  <p className="text-blue-600">📍 {selectedChecklist.room.name}</p>
                )}
                <p className="text-sm text-gray-500">
                  📅 {new Date(selectedChecklist.date).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <button
                onClick={() => setSelectedChecklist(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <TaskManager 
              checklistId={selectedChecklist.id}
              roomId={selectedChecklist.room?.id}
              onTaskUpdate={() => {
                // Обновить счетчик заданий
                fetchData();
              }}
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
    </div>
  );
}
