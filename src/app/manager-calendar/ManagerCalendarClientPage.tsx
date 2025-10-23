'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TaskCalendarView from '@/components/TaskCalendarView';
import TaskPreviewModal from '@/components/TaskPreviewModal';
import ManagerTasksModal from '@/components/ManagerTasksModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import AdminTaskDetailModal from '@/components/AdminTaskDetailModal';
import TaskLocationBreadcrumb from '@/components/TaskLocationBreadcrumb';
import ManagerCard from '@/components/ManagerCard';
import PeriodTasksModal from '@/components/PeriodTasksModal';
import TaskCompletionModal from '@/components/TaskCompletionModal';
import { Calendar, Clock, TrendingUp, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
// Простые утилиты для работы с датами без внешних зависимостей
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

export default function ManagerCalendarClientPage() {
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
  const [tasks, setTasks] = useState<any>({});
  const [previewDate, setPreviewDate] = useState<Date | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [periodModalData, setPeriodModalData] = useState<{
    managerId: string;
    managerName: string;
    frequency: string;
    tasks: any[];
  } | null>(null);
  const [userRole, setUserRole] = useState<string>('MANAGER');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [adminTaskDetailId, setAdminTaskDetailId] = useState<string | null>(null);
  const [taskCompletionModal, setTaskCompletionModal] = useState<any>(null);

  // Загрузка объектов менеджера
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

  // Загрузка статистики
  // Поиск задачи по ID во всех категориях
  const findTaskById = (taskId: string) => {
    const allCategories = ['overdue', 'today', 'upcoming', 'completed'];
    for (const category of allCategories) {
      if (tasks[category]) {
        const task = tasks[category].find((t: any) => t.id === taskId);
        if (task) return task;
      }
    }
    return null;
  };

  // Мгновенное обновление состояния после завершения задачи
  const handleTaskCompleted = (completedTaskId: string, completedTask: any) => {
    console.log('🔍 ДИАГНОСТИКА: handleTaskCompleted вызван с:', { completedTaskId, completedTask });
    setTasks((prevTasks: any) => {
      console.log('🔍 ДИАГНОСТИКА: Текущие задачи до обновления:', prevTasks);
      const newTasks = { ...prevTasks };
      
      // Удаляем задачу из текущих списков
      let removedFrom = '';
      ['overdue', 'today', 'upcoming'].forEach(category => {
        if (newTasks[category]) {
          const beforeLength = newTasks[category].length;
          newTasks[category] = newTasks[category].filter((task: any) => task.id !== completedTaskId);
          const afterLength = newTasks[category].length;
          if (beforeLength !== afterLength) {
            removedFrom = category;
            console.log(`🔍 ДИАГНОСТИКА: Удалили задачу из категории ${category}, было ${beforeLength}, стало ${afterLength}`);
          }
        }
      });
      
      if (!removedFrom) {
        console.log('🔍 ДИАГНОСТИКА: ⚠️ Задача НЕ НАЙДЕНА ни в одной категории!');
      }
      
      // Добавляем в выполненные
      if (!newTasks.completed) {
        newTasks.completed = [];
      }
      
      // Проверяем, что задача еще не добавлена в completed (избегаем дублирования)
      const alreadyCompleted = newTasks.completed.some((task: any) => task.id === completedTaskId);
      if (alreadyCompleted) {
        console.log('🔍 ДИАГНОСТИКА: Задача уже в completed, пропускаем');
        return newTasks;
      }
      
      // Создаем объект завершенной задачи
      const completedTaskData = {
        ...completedTask,
        status: 'COMPLETED',
        completedAt: completedTask.completedAt || new Date().toISOString(),
        completedBy: completedTask.completedBy || 'Текущий пользователь'
      };
      
      newTasks.completed.unshift(completedTaskData);
      console.log('🔍 ДИАГНОСТИКА: Добавили в completed:', completedTaskData);
      console.log('🔍 ДИАГНОСТИКА: Новое состояние задач:', newTasks);
      
      return newTasks;
    });
    
    // Обновляем счетчики
    setStats((prevStats: ManagerStats) => ({
      ...prevStats,
      todayTasks: Math.max(0, prevStats.todayTasks - 1),
      completedToday: prevStats.completedToday + 1,
      completionRate: prevStats.totalTasks > 0 ? 
        Math.round(((prevStats.completedToday + 1) / prevStats.totalTasks) * 100) : 0
    }));

    // 🔥 ОБНОВЛЯЕМ periodModalData, чтобы модальное окно показало изменения
    if (periodModalData) {
      setPeriodModalData((prevData: any) => {
        if (!prevData) return prevData;
        
        const updatedTasks = prevData.tasks.map((task: any) => {
          if (task.id === completedTaskId) {
            return {
              ...task,
              status: 'COMPLETED',
              completedAt: completedTask.completedAt || new Date().toISOString(),
              completedBy: completedTask.completedBy || 'Текущий пользователь'
            };
          }
          return task;
        });
        
        console.log('🔥 ОБНОВИЛИ periodModalData.tasks:', updatedTasks);
        return {
          ...prevData,
          tasks: updatedTasks
        };
      });
    }
    
    // Затем подтягиваем актуальные данные с сервера
    setTimeout(() => {
      loadStats();
    }, 500);
  };

  const loadStats = async () => {
    try {
      const params = new URLSearchParams({
        date: currentDate.toISOString().split('T')[0],
        view: view
      });
      
      if (selectedObject) {
        params.append('objectId', selectedObject);
      }

      // Используем упрощенный API для получения задач на основе техкарт
      const response = await fetch(`/api/tasks/calendar-simple?${params}`);
      if (response.ok) {
        const data = await response.json();
        
        const newStats: ManagerStats = {
          totalTasks: data.total || 0,
          overdueTasks: data.overdue?.length || 0,
          todayTasks: data.today?.length || 0,
          completedToday: data.completed?.length || 0,
          completionRate: data.total > 0 ? Math.round((data.completed?.length || 0) / data.total * 100) : 0
        };
        
        setStats(newStats);
        setTasks(data); // Сохраняем все задачи для отображения
        
        // Устанавливаем роль пользователя
        if (data.userRole) {
          setUserRole(data.userRole);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObjects();
  }, []);

  useEffect(() => {
    loadStats();
  }, [currentDate, selectedObject]);

  const handleDateChange = (direction: 'prev' | 'next') => {
    if (view === 'day') {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 7) : subDays(currentDate, 7));
    } else {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 30) : subDays(currentDate, 30));
    }
  };

  const handleTaskRefresh = () => {
    loadStats(); // Обновляем статистику после выполнения задачи
  };

  // Обработчик действий с задачами
  const handleTaskAction = async (task: any, status: string, comment?: string) => {
    try {
      const response = await fetch('/api/tasks/execute-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          techCardId: task.techCard.id,
          objectId: task.object.id,
          description: task.techCard.name,
          comment
        }),
      });

      if (response.ok) {
        // Обновляем данные после выполнения
        loadStats();
      } else {
        console.error('Ошибка выполнения задачи');
      }
    } catch (error) {
      console.error('Ошибка выполнения задачи:', error);
    }
  };

  // Обработчик действий с задачами из модального окна
  const handleModalTaskAction = async (taskId: string, action: string) => {
    if (action === 'complete') {
      // Логика выполнения задачи
      try {
        const response = await fetch(`/api/tasks/${taskId}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          // Находим завершенную задачу для мгновенного обновления
          const completedTask = findTaskById(taskId);
          if (completedTask) {
            const updatedTask = {
              ...completedTask,
              status: 'COMPLETED',
              completedAt: new Date().toISOString(),
              completedBy: { name: 'Текущий пользователь' }
            };
            handleTaskCompleted(taskId, updatedTask);
          } else {
            loadStats();
          }
          console.log('Задача выполнена успешно');
        }
      } catch (error) {
        console.error('Ошибка выполнения задачи:', error);
      }
    } else if (action === 'view') {
      // Открытие детального просмотра задачи
      setSelectedTaskId(taskId);
    }
  };

  // Обработчик открытия детального просмотра менеджера
  const handleManagerClick = (manager: any, tasks: any[]) => {
    setSelectedManagerId(manager.id);
    // setManagerTasks(tasks); // Убираем, так как переменной нет
  };

  // Обработчик выполнения задачи из модального окна
  const handleTaskComplete = async (taskId: string, data: any) => {
    // Здесь будет логика выполнения задачи с фотоотчетами
    console.log('Выполнение задачи:', taskId, data);
    
    // Обновляем данные
    loadStats();
    
    // Закрываем модальное окно
    setSelectedManagerId(null);
  };

  // Обработчик просмотра задач периода
  const handleViewPeriodTasks = (managerId: string, frequency: string, periodTasks: any[]) => {
    const manager = tasks.byManager?.find((m: any) => m.manager.id === managerId);
    setPeriodModalData({
      managerId,
      managerName: manager?.manager.name || 'Неизвестный менеджер',
      frequency,
      tasks: periodTasks
    });
  };

  // Обработчик открытия детального просмотра задачи для администратора
  const handleOpenTaskDetail = (taskId: string) => {
    setAdminTaskDetailId(taskId);
  };

  // Обработчик добавления комментария администратора
  const handleAddComment = async (taskId: string, comment: string, type: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/admin-comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: comment,
          type: type
        })
      });

      if (response.ok) {
        // Обновляем данные после добавления комментария
        loadStats();
        console.log('Комментарий добавлен успешно');
      }
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
    }
  };

  const getDateRangeText = () => {
    if (view === 'day') {
      return format(currentDate, 'd MMMM yyyy');
    } else if (view === 'week') {
      const weekEnd = addDays(currentDate, 6);
      return `${format(currentDate, 'd MMMM')} - ${format(weekEnd, 'd MMMM yyyy')}`;
    } else {
      const monthEnd = addDays(currentDate, 29);
      return `${format(currentDate, 'd MMMM')} - ${format(monthEnd, 'd MMMM yyyy')}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Загрузка календаря задач...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок и навигация */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">📅 Календарь задач</h1>
          <p className="text-gray-600">Управление задачами по периодичности техкарт</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={selectedObject || "all"} onValueChange={(value) => setSelectedObject(value === "all" ? "" : value)}>
            <SelectTrigger className="w-48">
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
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">День</SelectItem>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={() => setPreviewModalOpen(true)} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Предварительный просмотр
          </Button>
        </div>
      </div>

      {/* Навигация по датам */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
        <Button 
          variant="outline" 
          onClick={() => handleDateChange('prev')}
          className="flex items-center gap-2"
        >
          ← Назад
        </Button>
        
        <div className="text-center">
          <h2 className="text-lg font-semibold">{getDateRangeText()}</h2>
          <p className="text-sm text-gray-500 capitalize">
            {view === 'day' ? 'Дневной вид' : view === 'week' ? 'Недельный вид' : 'Месячный вид'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setCurrentDate(new Date())}
            size="sm"
          >
            Сегодня
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDateChange('next')}
            className="flex items-center gap-2"
          >
            Вперед →
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Всего задач</p>
                <p className="text-xl font-bold">{stats.totalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Просрочено</p>
                <p className="text-xl font-bold text-red-600">{stats.overdueTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">На сегодня</p>
                <p className="text-xl font-bold text-orange-600">{stats.todayTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Выполнено</p>
                <p className="text-xl font-bold text-green-600">{stats.completedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Выполнение</p>
                <p className="text-xl font-bold text-purple-600">{stats.completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Задачи */}
      {tasks.userRole === 'ADMIN' || tasks.userRole === 'DEPUTY' ? (
        // Для администратора - группировка по менеджерам/объектам
        <div className="space-y-6">
          <Tabs defaultValue="by-manager" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="by-manager">По менеджерам</TabsTrigger>
              <TabsTrigger value="by-object">По объектам</TabsTrigger>
            </TabsList>
            
            <TabsContent value="by-manager" className="space-y-4">
              {tasks.byManager && tasks.byManager.length > 0 ? (
                tasks.byManager.map((managerData: any) => (
                  <ManagerCard
                    key={managerData.manager.id}
                    manager={managerData.manager}
                    objects={managerData.objects || []}
                    stats={managerData.stats}
                    byPeriodicity={managerData.byPeriodicity || []}
                    tasks={managerData.tasks || []}
                    onViewPeriodTasks={handleViewPeriodTasks}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-lg font-medium mb-2">Нет данных по менеджерам</div>
                  <p className="text-sm">Менеджеры появятся здесь после назначения задач</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="by-object" className="space-y-4">
              {tasks.byObject?.map((group: any) => (
                <Card key={group.object.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>🏢 {group.object.name}</span>
                      <div className="flex gap-2 text-sm">
                        <Badge variant="destructive">{group.stats.overdue} просрочено</Badge>
                        <Badge variant="default">{group.stats.today} сегодня</Badge>
                        <Badge variant="secondary">{group.stats.completed} выполнено</Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {group.tasks.slice(0, 5).map((task: any) => (
                        <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{task.techCard.name}</span>
                            <span className="text-sm text-gray-500 ml-2">({task.room?.name || 'Общее'})</span>
                          </div>
                          <Badge variant={task.status === 'COMPLETED' ? 'default' : 'outline'}>
                            {task.status === 'COMPLETED' ? 'Выполнено' : 'В работе'}
                          </Badge>
                        </div>
                      ))}
                      {group.tasks.length > 5 && (
                        <p className="text-sm text-gray-500">И еще {group.tasks.length - 5} задач...</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        // Для менеджера - простой список задач по статусам
        <div className="space-y-6">
          {tasks.overdue?.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Просроченные задачи ({tasks.overdue.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasks.overdue.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-red-50 rounded border-l-4 border-red-400">
                      <div>
                        <div className="font-medium">{task.techCard?.name || 'Задача'}</div>
                        <div className="text-sm text-gray-600">{task.object.name}</div>
                        <div className="text-xs text-gray-500">
                          Запланировано: {new Date(task.scheduledFor).toLocaleString('ru-RU')}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleTaskAction(task, 'COMPLETED')}
                      >
                        Выполнить
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {tasks.today?.length > 0 && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-600 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Задачи на сегодня ({tasks.today.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasks.today.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-blue-50 rounded">
                      <div>
                        <div className="font-medium">{task.techCard?.name || 'Задача'}</div>
                        <div className="text-sm text-gray-600">{task.object.name}</div>
                        <div className="text-xs text-gray-500">
                          Запланировано: {new Date(task.scheduledFor).toLocaleString('ru-RU')}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleTaskAction(task, 'COMPLETED')}
                      >
                        Выполнить
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {tasks.upcoming?.length > 0 && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Предстоящие задачи ({tasks.upcoming.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasks.upcoming.slice(0, 10).map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-green-50 rounded">
                      <div>
                        <div className="font-medium">{task.techCard?.name || 'Задача'}</div>
                        <div className="text-sm text-gray-600">{task.object.name}</div>
                        <div className="text-xs text-gray-500">
                          Запланировано: {new Date(task.scheduledFor).toLocaleString('ru-RU')}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {new Date(task.scheduledFor).toLocaleDateString('ru-RU')}
                      </Badge>
                    </div>
                  ))}
                  {tasks.upcoming.length > 10 && (
                    <p className="text-sm text-gray-500 text-center">И еще {tasks.upcoming.length - 10} задач...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Информационная панель */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Как работает календарь задач</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• <strong>Динамическое планирование:</strong> Задачи создаются на основе периодичности техкарт</p>
                <p>• <strong>Умные напоминания:</strong> Система учитывает последнее выполнение и рассчитывает следующую дату</p>
                <p>• <strong>Группировка:</strong> Задачи группируются по приоритету (просрочено, сегодня, предстоящие)</p>
                <p>• <strong>Отчетность:</strong> Каждое выполнение сохраняется с возможностью добавления фото и комментариев</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Модальное окно предварительного просмотра */}
      <TaskPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        objectId={selectedObject || undefined}
      />

      {/* Модальное окно детального просмотра задач менеджера */}
      <ManagerTasksModal
        isOpen={!!selectedManagerId}
        onClose={() => setSelectedManagerId(null)}
        manager={{ id: selectedManagerId || '', name: 'Менеджер' }}
        tasks={[]}
        onTaskComplete={handleTaskComplete}
      />

      {/* Модальное окно детального просмотра задачи */}
      {['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(userRole) ? (
        <AdminTaskDetailModal
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          taskId={selectedTaskId}
          userRole={userRole}
          onTaskUpdate={() => {
            loadStats();
            setSelectedTaskId(null);
          }}
        />
      ) : (
        <TaskDetailModal
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          taskId={selectedTaskId}
          onTaskUpdate={() => {
            loadStats();
            setSelectedTaskId(null);
          }}
        />
      )}
      {/* Модальное окно для просмотра задач периода */}
      {periodModalData && (
        <PeriodTasksModal
          isOpen={!!periodModalData}
          onClose={() => setPeriodModalData(null)}
          managerId={periodModalData.managerId}
          managerName={periodModalData.managerName}
          frequency={periodModalData.frequency}
          tasks={periodModalData.tasks}
          onAddComment={handleAddComment}
          userRole={userRole}
          onTaskAction={handleModalTaskAction}
          onOpenTaskDetail={handleOpenTaskDetail}
          onTaskCompletion={(task: any) => {
            console.log('🔥 ПОЛУЧИЛИ ЗАДАЧУ ДЛЯ ЗАВЕРШЕНИЯ:', task);
            setTaskCompletionModal(task);
          }}
          onTaskUpdate={(completedTask?: any) => {
            console.log('🔍 ДИАГНОСТИКА: ManagerCalendarClientPage.onTaskUpdate получил:', completedTask);
            if (completedTask && completedTask.id) {
              console.log('🔍 ДИАГНОСТИКА: Вызываем handleTaskCompleted с ID:', completedTask.id);
              handleTaskCompleted(completedTask.id, completedTask);
            } else {
              console.log('🔍 ДИАГНОСТИКА: Нет completedTask, вызываем loadStats');
              loadStats();
            }
          }}
        />
      )}

      {/* AdminTaskDetailModal для детального просмотра задач администратором */}
      {adminTaskDetailId && (
        <AdminTaskDetailModal
          isOpen={!!adminTaskDetailId}
          onClose={() => setAdminTaskDetailId(null)}
          taskId={adminTaskDetailId}
          userRole={userRole}
          onTaskUpdate={() => {
            // Обновляем данные после изменения задачи
            loadStats();
          }}
        />
      )}

      {/* TaskCompletionModal для завершения задач администратором */}
      {taskCompletionModal && (
        <TaskCompletionModal
          task={taskCompletionModal}
          isOpen={!!taskCompletionModal}
          onClose={() => setTaskCompletionModal(null)}
          onComplete={(completedTask) => {
            console.log('🔥 ЗАДАЧА ЗАВЕРШЕНА:', completedTask);
            setTaskCompletionModal(null);
            // Обновляем состояние задач
            handleTaskCompleted(completedTask.id, completedTask);
          }}
        />
      )}
    </div>
  );
}
