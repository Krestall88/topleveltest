'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  PlayCircle,
  MessageSquare,
  User,
  Edit,
  Trash,
  XCircle,
  Users
} from 'lucide-react';
import AdditionalTaskCard from '@/components/AdditionalTaskCard';
import type { AdditionalTask, CleaningObject, User as UserType } from '@/types';
import CreateTaskModal from '@/components/CreateTaskModal';
import TelegramBindingsManager from '@/components/TelegramBindingsManager';

export default function AdditionalTasksClientPage() {
  const [tasks, setTasks] = useState<AdditionalTask[]>([]);
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  
  // Фильтры
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [objectFilter, setObjectFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  // Модальное окно создания
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Модальное окно управления Telegram
  const [isTelegramManagerOpen, setIsTelegramManagerOpen] = useState(false);
  
  // Режим отображения: список или группировка
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');

  useEffect(() => {
    fetchCurrentUser();
    fetchTasks();
    fetchObjects();
  }, [statusFilter, objectFilter, sourceFilter, myTasksOnly]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Ошибка получения пользователя:', error);
    }
  };

  const fetchTasks = async (filters?: Record<string, string>) => {
    try {
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (objectFilter !== 'all') params.set('objectId', objectFilter);
      if (myTasksOnly) params.set('myTasks', 'true');

      const response = await fetch(`/api/additional-tasks?${params}`);
      if (response.ok) {
        const tasksData = await response.json();
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Ошибка загрузки заданий:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchObjects = async () => {
    try {
      const response = await fetch('/api/objects');
      if (response.ok) {
        const objectsData = await response.json();
        setObjects(objectsData);
      }
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
    }
  };

  const handleStatusChange = async (taskId: string, action: 'take' | 'complete', note?: string) => {
    try {
      const response = await fetch(`/api/additional-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, completionNote: note })
      });

      if (response.ok) {
        await fetchTasks(); // Перезагружаем список
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Ошибка обновления задания');
      }
    } catch (error) {
      console.error('Ошибка обновления задания:', error);
      alert('Ошибка соединения с сервером');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/additional-tasks?id=${taskId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchTasks(); // Перезагружаем список
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Ошибка удаления задания');
      }
    } catch (error) {
      console.error('Ошибка удаления задания:', error);
      alert('Ошибка соединения с сервером');
    }
  };

  const handleTaskCreated = async (newTask: AdditionalTask) => {
    await fetchTasks(); // Перезагружаем список
  };


  // Группировка по менеджерам и объектам
  const groupTasksByManager = () => {
    const managerMap = new Map();
    
    filteredTasks.forEach(task => {
      const managerId = task.assignedTo?.id || 'unassigned';
      const managerName = task.assignedTo?.name || 'Не назначен';
      
      if (!managerMap.has(managerId)) {
        managerMap.set(managerId, {
          manager: { id: managerId, name: managerName },
          objects: new Map(),
          stats: { total: 0, new: 0, inProgress: 0, completed: 0 }
        });
      }
      
      const managerGroup = managerMap.get(managerId);
      const objectId = task.object?.id || 'unknown';
      const objectName = task.object?.name || 'Неизвестный объект';
      
      if (!managerGroup.objects.has(objectId)) {
        managerGroup.objects.set(objectId, {
          id: objectId,
          name: objectName,
          tasks: [],
          stats: { total: 0, new: 0, inProgress: 0, completed: 0 }
        });
      }
      
      const objectGroup = managerGroup.objects.get(objectId);
      objectGroup.tasks.push(task);
      objectGroup.stats.total++;
      managerGroup.stats.total++;
      
      // Обновляем статистику
      if (task.status === 'NEW') {
        objectGroup.stats.new++;
        managerGroup.stats.new++;
      } else if (task.status === 'IN_PROGRESS') {
        objectGroup.stats.inProgress++;
        managerGroup.stats.inProgress++;
      } else if (task.status === 'COMPLETED') {
        objectGroup.stats.completed++;
        managerGroup.stats.completed++;
      }
    });
    
    return Array.from(managerMap.values()).map(group => ({
      ...group,
      objects: Array.from(group.objects.values())
    }));
  };
  
  const groupedByManager = viewMode === 'grouped' ? groupTasksByManager() : [];

  // Фильтрация заданий
  const filteredTasks = tasks.filter(task => {
    if (sourceFilter !== 'all' && task.source !== sourceFilter) return false;
    return true;
  });

  // Группировка по статусам
  const tasksByStatus = {
    NEW: filteredTasks.filter(task => task.status === 'NEW'),
    IN_PROGRESS: filteredTasks.filter(task => task.status === 'IN_PROGRESS'),
    COMPLETED: filteredTasks.filter(task => task.status === 'COMPLETED')
  };

  const statusStats = {
    NEW: { count: tasksByStatus.NEW.length, icon: AlertTriangle, color: 'text-red-600' },
    IN_PROGRESS: { count: tasksByStatus.IN_PROGRESS.length, icon: PlayCircle, color: 'text-yellow-600' },
    COMPLETED: { count: tasksByStatus.COMPLETED.length, icon: CheckCircle, color: 'text-green-600' }
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка заданий...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(statusStats).map(([status, stats]) => {
          const Icon = stats.icon;
          return (
            <Card key={status}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {status === 'NEW' ? 'Новые' : 
                       status === 'IN_PROGRESS' ? 'В работе' : 'Выполнено'}
                    </p>
                    <p className="text-2xl font-bold">{stats.count}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${stats.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Фильтры и действия */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Фильтр по статусу */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Статус:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Все</option>
                <option value="NEW">Новые</option>
                <option value="IN_PROGRESS">В работе</option>
                <option value="COMPLETED">Выполнено</option>
              </select>
            </div>

            {/* Фильтр по объекту */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Объект:</label>
              <select
                value={objectFilter}
                onChange={(e) => setObjectFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Все объекты</option>
                {objects.map(obj => (
                  <option key={obj.id} value={obj.id}>{obj.name}</option>
                ))}
              </select>
            </div>

            {/* Фильтр по источнику */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Источник:</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Все</option>
                <option value="TELEGRAM">Telegram</option>
                <option value="EMAIL">Email</option>
                <option value="MANUAL">Ручное</option>
              </select>
            </div>

            {/* Только мои задания */}
            {currentUser?.role === 'MANAGER' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="myTasks"
                  checked={myTasksOnly}
                  onChange={(e) => setMyTasksOnly(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="myTasks" className="text-sm font-medium">
                  Только мои задания
                </label>
              </div>
            )}

            {/* Кнопки управления */}
            {['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(currentUser?.role) && (
              <div className="ml-auto flex gap-2">
                <Button 
                  onClick={() => setIsTelegramManagerOpen(true)}
                  variant="outline"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Telegram аккаунты
                </Button>
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Создать задание
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Переключатель режима отображения */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'grouped'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            По менеджерам
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Список
          </button>
        </div>
      </div>

      {/* Список заданий */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Заданий не найдено
            </h3>
            <p className="text-gray-500">
              {statusFilter !== 'all' || objectFilter !== 'all' || sourceFilter !== 'all'
                ? 'Попробуйте изменить фильтры'
                : 'Дополнительные задания появятся здесь после получения сообщений от клиентов'
              }
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <AdditionalTaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteTask}
              showActions={true}
              isCurrentUser={currentUser?.id === task.assignedTo?.id}
              canDelete={currentUser && ['ADMIN', 'DEPUTY_ADMIN'].includes(currentUser.role)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByManager.map((managerGroup) => (
            <Card key={managerGroup.manager.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                {/* Заголовок менеджера */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{managerGroup.manager.name}</h3>
                      <p className="text-sm text-gray-600">Всего заданий: {managerGroup.stats.total}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                      Новые: {managerGroup.stats.new}
                    </div>
                    <div className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
                      В работе: {managerGroup.stats.inProgress}
                    </div>
                    <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                      Выполнено: {managerGroup.stats.completed}
                    </div>
                  </div>
                </div>

                {/* Объекты */}
                <div className="space-y-4">
                  {managerGroup.objects.map((objectGroup) => (
                    <div key={objectGroup.id} className="border-l-4 border-blue-400 pl-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-800 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                          {objectGroup.name}
                        </h4>
                        <div className="flex gap-2 text-xs">
                          <span className="px-2 py-1 rounded bg-red-50 text-red-700">Новые: {objectGroup.stats.new}</span>
                          <span className="px-2 py-1 rounded bg-yellow-50 text-yellow-700">В работе: {objectGroup.stats.inProgress}</span>
                          <span className="px-2 py-1 rounded bg-green-50 text-green-700">Выполнено: {objectGroup.stats.completed}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {objectGroup.tasks.map((task) => (
                          <AdditionalTaskCard
                            key={task.id}
                            task={task}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDeleteTask}
                            showActions={true}
                            isCurrentUser={currentUser?.id === task.assignedTo?.id}
                            canDelete={currentUser && ['ADMIN', 'DEPUTY_ADMIN'].includes(currentUser.role)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Модальное окно создания задания */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={handleTaskCreated}
        objects={objects}
      />

      {/* Модальное окно управления Telegram аккаунтами */}
      <TelegramBindingsManager
        isOpen={isTelegramManagerOpen}
        onClose={() => setIsTelegramManagerOpen(false)}
      />
    </div>
  );
}
