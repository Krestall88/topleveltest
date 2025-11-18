'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import UnifiedTaskCompletionModal from '@/components/UnifiedTaskCompletionModal';
import SimpleTaskListModal from '@/components/SimpleTaskListModal';
import ObjectCard from '@/components/ObjectCard';
import ObjectCompletionSettingsModal from '@/components/ObjectCompletionSettingsModal';
import { Calendar, Clock, TrendingUp, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { UnifiedTask, CalendarResponse, ManagerTaskGroup, ObjectTaskGroup } from '@/lib/unified-task-system';

// Простые утилиты для работы с датами
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const subDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

const format = (date: Date, formatStr: string): string => {
  if (formatStr === 'yyyy-MM-dd') {
    return date.toISOString().split('T')[0];
  }
  if (formatStr === 'd MMMM yyyy') {
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }
  return date.toLocaleDateString('ru-RU');
};

interface ManagerStats {
  totalTasks: number;
  overdueTasks: number;
  todayTasks: number;
  completedToday: number;
  completionRate: number;
}

interface CleaningObject {
  id: string;
  name: string;
}

export default function UnifiedCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedObject, setSelectedObject] = useState<string>('');
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [stats, setStats] = useState<ManagerStats>({
    totalTasks: 0,
    overdueTasks: 0,
    todayTasks: 0,
    completedToday: 0,
    completionRate: 0
  });
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [taskCompletionModal, setTaskCompletionModal] = useState<UnifiedTask | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [settingsModal, setSettingsModal] = useState<{ objectId: string; objectName: string } | null>(null);
  const [periodModalData, setPeriodModalData] = useState<{
    managerId: string;
    managerName: string;
    frequency: string;
    tasks: UnifiedTask[];
  } | null>(null);

  // Загрузка объектов
  const loadObjects = async () => {
    try {
      const response = await fetch('/api/objects?my=true');
      if (response.ok) {
        const data = await response.json();
        setObjects(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
    }
  };

  // Загрузка данных календаря
  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date: currentDate.toISOString().split('T')[0]
      });
      
      if (selectedObject) {
        params.append('objectId', selectedObject);
      }

      console.log('🔍 UNIFIED CLIENT: Запрос календаря:', {
        date: currentDate.toISOString().split('T')[0],
        objectId: selectedObject
      });

      const response = await fetch(`/api/tasks/calendar-unified?${params}`);
      if (response.ok) {
        const data: CalendarResponse = await response.json();
        
        console.log('🔍 UNIFIED CLIENT: Получены данные:', {
          total: data.total,
          overdue: data.overdue?.length || 0,
          today: data.today?.length || 0,
          completed: data.completed?.length || 0,
          byManagerCount: data.byManager?.length || 0
        });
        
        // Логируем первые несколько завершенных задач для отладки
        if (data.completed && data.completed.length > 0) {
          console.log('🔍 UNIFIED CLIENT: Первые завершенные задачи:', 
            data.completed.slice(0, 3).map(t => ({
              id: t.id,
              description: t.description,
              completedAt: t.completedAt,
              status: t.status
            }))
          );
        }
        
        setCalendarData(data);
        
        // Обновляем статистику
        const newStats: ManagerStats = {
          totalTasks: data.total,
          overdueTasks: data.overdue.length,
          todayTasks: data.today.length,
          completedToday: data.completed.length,
          completionRate: data.total > 0 ? Math.round((data.completed.length / data.total) * 100) : 0
        };
        
        setStats(newStats);
        
      } else {
        console.error('Ошибка загрузки календаря:', response.status);
      }
    } catch (error) {
      console.error('Ошибка загрузки календаря:', error);
    } finally {
      setLoading(false);
    }
  };

  // Завершение задачи
  const handleTaskCompletion = async (task: UnifiedTask, comment?: string, photos?: string[]) => {
    try {
      console.log('🔍 UNIFIED CLIENT: Завершение задачи:', {
        taskId: task.id,
        type: task.type,
        status: task.status
      });

      const response = await fetch('/api/tasks/unified-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          taskId: task.id,
          status: 'COMPLETED',
          comment: comment || '',
          photos: photos || []
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ UNIFIED CLIENT: Задача завершена:', result);
        
        // Сразу обновляем локальные данные для быстрого отклика UI
        if (calendarData) {
          const updatedData = { ...calendarData };
          
          // Удаляем из текущих списков
          updatedData.overdue = updatedData.overdue.filter(t => t.id !== task.id);
          updatedData.today = updatedData.today.filter(t => t.id !== task.id);
          updatedData.upcoming = updatedData.upcoming.filter(t => t.id !== task.id);
          
          // Добавляем в завершенные
          const completedTask: UnifiedTask = {
            ...task,
            status: 'COMPLETED',
            completedAt: result.task?.completedAt ? new Date(result.task.completedAt) : new Date(),
            completedBy: result.task?.completedBy || { id: 'current', name: 'Текущий пользователь' },
            completionComment: comment,
            completionPhotos: photos || []
          };
          
          updatedData.completed.unshift(completedTask);
          
          // Обновляем группировки
          updatedData.byManager = updatedData.byManager.map(manager => ({
            ...manager,
            tasks: manager.tasks.map(t => t.id === task.id ? completedTask : t),
            stats: {
              ...manager.stats,
              completed: manager.stats.completed + 1,
              overdue: manager.stats.overdue - (task.status === 'OVERDUE' ? 1 : 0),
              today: manager.stats.today - (task.status === 'AVAILABLE' ? 1 : 0)
            },
            byPeriodicity: manager.byPeriodicity.map(period => ({
              ...period,
              tasks: period.tasks.map(t => t.id === task.id ? completedTask : t)
            }))
          }));
          
          setCalendarData(updatedData);
          
          // Обновляем статистику
          setStats(prev => ({
            ...prev,
            completedToday: prev.completedToday + 1,
            todayTasks: task.status === 'AVAILABLE' ? prev.todayTasks - 1 : prev.todayTasks,
            overdueTasks: task.status === 'OVERDUE' ? prev.overdueTasks - 1 : prev.overdueTasks,
            completionRate: prev.totalTasks > 0 ? Math.round(((prev.completedToday + 1) / prev.totalTasks) * 100) : 0
          }));
        }
        
        return result.task;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка завершения задачи');
      }
    } catch (error) {
      console.error('❌ UNIFIED CLIENT: Ошибка завершения задачи:', error);
      throw error;
    }
  };

  // Обработчик завершения из модального окна
  const handleTaskCompletionFromModal = async (completedTask: UnifiedTask) => {
    console.log('🔍 UNIFIED CLIENT: Завершение из модального окна:', completedTask);

    // Сразу закрываем модальное окно, чтобы не было ощущения зависания
    setTaskCompletionModal(null);

    try {
      console.log('🔍 UNIFIED CLIENT: Вызываем handleTaskCompletion...');
      await handleTaskCompletion(
        completedTask,
        completedTask.completionComment,
        completedTask.completionPhotos
      );
      
      console.log('🔍 UNIFIED CLIENT: handleTaskCompletion выполнен успешно');
      
      // Обновляем periodModalData если открыто
      if (periodModalData) {
        setPeriodModalData(prev => prev ? {
          ...prev,
          tasks: prev.tasks.map(task => 
            task.id === completedTask.id 
              ? {
                  ...task,
                  status: 'COMPLETED',
                  completedAt: completedTask.completedAt || new Date(),
                  completedBy: completedTask.completedBy,
                  completionComment: completedTask.completionComment,
                  completionPhotos: completedTask.completionPhotos || []
                }
              : task
          )
        } : null);
      }
      
      // НЕ перезагружаем данные календаря - используем локальное обновление
      console.log('🔍 UNIFIED CLIENT: Задача завершена, локальное состояние обновлено');
      
    } catch (error) {
      console.error('Ошибка завершения задачи:', error);
      alert(error instanceof Error ? error.message : 'Ошибка завершения задачи');
    }
  };

  // Обработчик навигации по датам
  const handleDateChange = (direction: 'prev' | 'next') => {
    if (view === 'day') {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 7) : subDays(currentDate, 7));
    } else {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 30) : subDays(currentDate, 30));
    }
  };

  // Получение текста диапазона дат
  const getDateRangeText = () => {
    if (view === 'day') {
      return format(currentDate, 'd MMMM yyyy');
    } else if (view === 'week') {
      const endDate = addDays(currentDate, 6);
      return `${format(currentDate, 'd MMMM')} - ${format(endDate, 'd MMMM yyyy')}`;
    } else {
      const endDate = addDays(currentDate, 29);
      return `${format(currentDate, 'd MMMM')} - ${format(endDate, 'd MMMM yyyy')}`;
    }
  };

  // Функция перегруппировки данных по объектам (вместо менеджеров)
  const regroupByObjects = (byManagerData: ManagerTaskGroup[]) => {
    const objectsMap = new Map();
    
    byManagerData.forEach(managerGroup => {
      managerGroup.tasks.forEach(task => {
        const objectId = task.objectId;
        const objectName = task.objectName;
        
        if (!objectsMap.has(objectId)) {
          objectsMap.set(objectId, {
            object: { id: objectId, name: objectName },
            manager: managerGroup.manager,
            tasks: [],
            stats: { total: 0, completed: 0, overdue: 0, today: 0 },
            byPeriodicity: []
          });
        }
        
        const objectGroup = objectsMap.get(objectId);
        objectGroup.tasks.push(task);
        objectGroup.stats.total++;
        
        if (task.status === 'OVERDUE') objectGroup.stats.overdue++;
        else if (task.status === 'AVAILABLE') objectGroup.stats.today++;
        else if (task.status === 'COMPLETED') objectGroup.stats.completed++;
      });
    });
    
    // Группируем задачи по периодичности внутри каждого объекта
    objectsMap.forEach(objectGroup => {
      const periodicityMap = new Map();
      
      objectGroup.tasks.forEach((task: UnifiedTask) => {
        const frequency = task.frequency || 'Без периодичности';
        
        if (!periodicityMap.has(frequency)) {
          periodicityMap.set(frequency, {
            frequency,
            count: 0,
            tasks: []
          });
        }
        
        const periodGroup = periodicityMap.get(frequency);
        periodGroup.tasks.push(task);
        periodGroup.count++;
      });
      
      objectGroup.byPeriodicity = Array.from(periodicityMap.values());
    });
    
    return Array.from(objectsMap.values()).sort((a, b) => a.object.name.localeCompare(b.object.name));
  };

  // Обработчик просмотра задач периода
  const handleViewPeriodTasks = (managerId: string, frequency: string, periodTasks: UnifiedTask[]) => {
    const manager = calendarData?.byManager?.find((m: ManagerTaskGroup) => m.manager.id === managerId);
    
    console.log('🔍 UNIFIED CLIENT: Открываем модальное окно с задачами:', {
      managerId,
      frequency,
      tasksCount: periodTasks.length,
      completedTasks: periodTasks.filter(t => t.status === 'COMPLETED').length
    });
    
    setPeriodModalData({
      managerId,
      managerName: manager?.manager.name || 'Неизвестный менеджер',
      frequency,
      tasks: periodTasks
    });
  };

  // Эффекты
  useEffect(() => {
    loadObjects();
  }, []);

  useEffect(() => {
    loadCalendarData();
  }, [currentDate, selectedObject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Загрузка календаря...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="responsive-container space-y-4 sm:space-y-6 py-4 sm:py-6">
      {/* Заголовок и навигация */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-3xl font-bold">📅 Единый календарь задач</h1>
          <p className="text-xs sm:text-base text-gray-600">Новая система управления задачами</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Select value={selectedObject || "all"} onValueChange={(value) => setSelectedObject(value === "all" ? "" : value)}>
            <SelectTrigger className="px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base flex-1 sm:w-48">
              <SelectValue placeholder="Все объекты" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все объекты</SelectItem>
              {objects.map((obj) => (
                <SelectItem key={obj.id} value={obj.id}>
                  {obj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={view} onValueChange={(value: 'day' | 'week' | 'month') => setView(value)}>
            <SelectTrigger className="px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">День</SelectItem>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Навигация по датам */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-3 sm:p-4 rounded-lg border gap-3">
        <Button 
          variant="outline" 
          onClick={() => handleDateChange('prev')}
          className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm w-full sm:w-auto"
        >
          <span className="hidden sm:inline">← Назад</span>
          <span className="sm:hidden">←</span>
        </Button>
        
        <div className="text-center flex-1">
          <h2 className="text-base sm:text-lg font-semibold">{getDateRangeText()}</h2>
          <p className="text-xs sm:text-sm text-gray-500 capitalize">
            {view === 'day' ? 'День' : view === 'week' ? 'Неделя' : 'Месяц'}
          </p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => setCurrentDate(new Date())}
            size="sm"
            className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm flex-1 sm:flex-none"
          >
            Сегодня
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDateChange('next')}
            className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">Вперед →</span>
            <span className="sm:hidden">→</span>
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Всего</p>
                <p className="text-lg sm:text-xl font-bold">{stats.totalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Просрочено</p>
                <p className="text-lg sm:text-xl font-bold text-red-600">{stats.overdueTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Сегодня</p>
                <p className="text-lg sm:text-xl font-bold text-orange-600">{stats.todayTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Готово</p>
                <p className="text-lg sm:text-xl font-bold text-green-600">{stats.completedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">%</p>
                <p className="text-lg sm:text-xl font-bold text-purple-600">{stats.completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Задачи */}
      {calendarData && (calendarData.userRole === 'ADMIN' || calendarData.userRole === 'DEPUTY_ADMIN' || calendarData.userRole === 'MANAGER') ? (
        // Для администратора - группировка по объектам (перегруппированные данные из byManager)
        <div className="space-y-4">
          {/* Поисковая строка */}
          {calendarData.byManager && calendarData.byManager.length > 0 && (
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base pl-8 pr-8"
              />
              <svg
                className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {calendarData.byManager && calendarData.byManager.length > 0 ? (
            (() => {
              const filteredObjects = regroupByObjects(calendarData.byManager)
                .filter((objectGroup: any) => {
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  const objectName = objectGroup.object.name.toLowerCase();
                  const managerName = objectGroup.manager?.name?.toLowerCase() || '';
                  return objectName.includes(query) || managerName.includes(query);
                });

              if (filteredObjects.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <div className="text-lg font-medium mb-2">Ничего не найдено</div>
                    <p className="text-sm">Попробуйте изменить поисковый запрос</p>
                  </div>
                );
              }

              return filteredObjects.map((objectGroup: any) => (
                <ObjectCard
                  key={objectGroup.object.id}
                  object={objectGroup.object}
                  manager={objectGroup.manager}
                  stats={objectGroup.stats}
                  byPeriodicity={objectGroup.byPeriodicity}
                  tasks={objectGroup.tasks}
                  onViewPeriodTasks={handleViewPeriodTasks}
                  onOpenSettings={
                    calendarData.userRole === 'ADMIN' || calendarData.userRole === 'DEPUTY_ADMIN'
                      ? (objectId, objectName) => setSettingsModal({ objectId, objectName })
                      : undefined
                  }
                />
              ));
            })()
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-lg font-medium mb-2">Нет данных по объектам</div>
              <p className="text-sm">Объекты с задачами появятся здесь</p>
            </div>
          )}
        </div>
      ) : (
        // Для менеджера - задачи по статусам с вкладками
        <div className="space-y-6">
          <Tabs defaultValue="overdue" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overdue" className="text-red-600">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Просроченные ({calendarData?.overdue?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="today" className="text-blue-600">
                <Clock className="h-4 w-4 mr-2" />
                Текущие ({calendarData?.today?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Выполненные ({calendarData?.completed?.length || 0})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overdue" className="space-y-4">
              {calendarData?.overdue && calendarData.overdue.length > 0 ? (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Просроченные задачи
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {calendarData.overdue.map((task: UnifiedTask) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-red-50 rounded border-l-4 border-red-400">
                          <div>
                            <div className="font-medium">{task.description}</div>
                            <div className="text-sm text-gray-600">{task.objectName}</div>
                            <div className="text-xs text-gray-500">
                              Запланировано: {new Date(task.scheduledDate).toLocaleString('ru-RU')}
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => setTaskCompletionModal(task)}
                          >
                            Выполнить
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <div className="text-lg font-medium mb-2">Нет просроченных задач</div>
                  <p className="text-sm">Отличная работа! Все задачи выполняются вовремя</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="today" className="space-y-4">
              {calendarData?.today && calendarData.today.length > 0 ? (
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-blue-600 flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Задачи на сегодня
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {calendarData.today.map((task: UnifiedTask) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-blue-50 rounded">
                          <div>
                            <div className="font-medium">{task.description}</div>
                            <div className="text-sm text-gray-600">{task.objectName}</div>
                            <div className="text-xs text-gray-500">
                              Запланировано: {new Date(task.scheduledDate).toLocaleString('ru-RU')}
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => setTaskCompletionModal(task)}
                          >
                            Выполнить
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <div className="text-lg font-medium mb-2">Нет задач на сегодня</div>
                  <p className="text-sm">Все текущие задачи выполнены или запланированы на другие дни</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4">
              {calendarData?.completed && calendarData.completed.length > 0 ? (
                <Card className="border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-600 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Выполненные задачи
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {calendarData.completed.slice(0, 20).map((task: UnifiedTask) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-green-50 rounded">
                          <div>
                            <div className="font-medium">{task.description}</div>
                            <div className="text-sm text-gray-600">{task.objectName}</div>
                            <div className="text-xs text-gray-500">
                              Выполнено: {task.completedAt ? new Date(task.completedAt).toLocaleString('ru-RU') : 'Неизвестно'}
                              {task.completedBy && ` • ${task.completedBy.name}`}
                            </div>
                            {task.completionComment && (
                              <div className="text-xs text-gray-600 mt-1 italic">
                                "{task.completionComment}"
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Завершено</Badge>
                            {task.completionPhotos && task.completionPhotos.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                📷 {task.completionPhotos.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {calendarData.completed.length > 20 && (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500">
                            Показано 20 из {calendarData.completed.length} выполненных задач
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <div className="text-lg font-medium mb-2">Нет выполненных задач</div>
                  <p className="text-sm">Выполненные задачи появятся здесь после завершения</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Модальные окна */}
      {taskCompletionModal && (
        <UnifiedTaskCompletionModal
          task={taskCompletionModal}
          isOpen={!!taskCompletionModal}
          onClose={() => setTaskCompletionModal(null)}
          onComplete={handleTaskCompletionFromModal}
        />
      )}

      {periodModalData && (
        <SimpleTaskListModal
          isOpen={!!periodModalData}
          onClose={() => setPeriodModalData(null)}
          managerId={periodModalData.managerId}
          managerName={periodModalData.managerName}
          frequency={periodModalData.frequency}
          tasks={periodModalData.tasks}
          onTaskComplete={(task) => {
            // Закрываем модальное окно списка и открываем модальное окно завершения
            setPeriodModalData(null);
            setTaskCompletionModal(task);
          }}
        />
      )}

      {/* Модальное окно настроек завершения задач */}
      {settingsModal && (
        <ObjectCompletionSettingsModal
          isOpen={!!settingsModal}
          onClose={() => {
            setSettingsModal(null);
            // Перезагружаем данные после изменения настроек
            loadCalendarData();
          }}
          objectId={settingsModal.objectId}
          objectName={settingsModal.objectName}
        />
      )}
    </div>
  );
}
