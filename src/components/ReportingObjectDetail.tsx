'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReportingTaskModal from './ReportingTaskModal';
import { 
  Building2, 
  Plus, 
  ArrowLeft,
  User,
  MapPin,
  Calendar,
  MessageSquare,
  FileText,
  Search,
  Filter,
  Settings,
  Trash2,
  Repeat,
  StopCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface ReportingTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  dueDate?: string;
  completedAt?: string;
  isRecurring?: boolean;
  frequency?: string;
  weekDay?: number;
  stoppedAt?: string;
  parentTaskId?: string;
  isVirtual?: boolean;
  createdBy: {
    name: string;
  };
  assignedTo: {
    name: string;
  };
  _count: {
    comments: number;
    attachments: number;
  };
}

interface ObjectInfo {
  id: string;
  name: string;
  address: string;
  managerId: string;
  excludeFromTasks: boolean;
  manager: {
    id: string;
    name: string;
    email: string;
  };
}

interface ReportingObjectDetailProps {
  object: ObjectInfo;
  userRole: 'ADMIN' | 'DEPUTY' | 'DEPUTY_ADMIN' | 'MANAGER' | 'CLIENT';
  userId: string;
}

export default function ReportingObjectDetail({ object, userRole, userId }: ReportingObjectDetailProps) {
  const [tasks, setTasks] = useState<ReportingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState(object.managerId);
  const [newTaskIsRecurring, setNewTaskIsRecurring] = useState(false);
  const [newTaskFrequency, setNewTaskFrequency] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [newTaskWeekDay, setNewTaskWeekDay] = useState<number>(1); // Понедельник по умолчанию
  const [creating, setCreating] = useState(false);
  
  // Состояние для модального окна задач
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      console.log('🔄 Загружаем задачи для объекта:', object.id);
      const response = await fetch(`/api/reporting/objects/${object.id}/tasks`, {
        credentials: 'include'
      });
      
      console.log('📊 Статус ответа:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Данные получены:', data);
        const sortedTasks = (data.tasks || []).sort((a: ReportingTask, b: ReportingTask) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setTasks(sortedTasks);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Ошибка ответа:', response.status, errorData);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки задач:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      setCreating(true);
      const response = await fetch(`/api/reporting/objects/${object.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDescription,
          assignedToId: newTaskAssignedTo,
          priority: newTaskPriority,
          dueDate: newTaskDueDate || undefined,
          isRecurring: newTaskIsRecurring,
          frequency: newTaskIsRecurring ? newTaskFrequency : undefined,
          weekDay: newTaskIsRecurring && newTaskFrequency === 'WEEKLY' ? newTaskWeekDay : undefined
        })
      });

      if (response.ok) {
        setNewTaskTitle('');
        setNewTaskDescription('');
        setNewTaskPriority('MEDIUM');
        setNewTaskDueDate('');
        setNewTaskAssignedTo(object.managerId);
        setNewTaskIsRecurring(false);
        setNewTaskFrequency('DAILY');
        setNewTaskWeekDay(1);
        setShowCreateDialog(false);
        await loadTasks();
        alert('Задача создана успешно!');
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.message || 'Не удалось создать задачу'}`);
      }
    } catch (error) {
      console.error('Ошибка создания задачи:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowTaskModal(true);
  };

  const handleTaskModalClose = () => {
    setShowTaskModal(false);
    setSelectedTaskId(null);
  };

  const handleTaskUpdated = () => {
    loadTasks();
  };

  const handleStopRecurring = async (task: ReportingTask) => {
    // Если это виртуальная задача, останавливаем родительскую
    const taskIdToStop = task.parentTaskId || task.id;
    
    if (!confirm(`Остановить повторение задачи "${task.title}"?\n\nНа следующий день/период эта задача больше не будет создаваться автоматически.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/reporting/tasks/${taskIdToStop}/stop`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        alert('Повторение задачи остановлено');
        await loadTasks();
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.message || 'Не удалось остановить задачу'}`);
      }
    } catch (error) {
      console.error('Ошибка остановки задачи:', error);
      alert('Произошла ошибка при остановке задачи');
    }
  };

  const getFrequencyLabel = (frequency?: string, weekDay?: number) => {
    if (!frequency) return null;
    
    if (frequency === 'DAILY') {
      return 'Ежедневно';
    } else if (frequency === 'WEEKLY' && weekDay !== undefined) {
      const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
      return `Еженедельно (${days[weekDay]})`;
    }
    return frequency;
  };

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const formatSelectedDate = () => {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const dayName = days[selectedDate.getDay()];
    const day = selectedDate.getDate();
    const month = months[selectedDate.getMonth()];
    const year = selectedDate.getFullYear();
    return `${dayName}, ${day} ${month} ${year}`;
  };

  const handleReturnToGeneral = async () => {
    if (!confirm('Вернуть объект в общую работу? Для него снова будут создаваться автоматические задачи.')) {
      return;
    }

    try {
      const response = await fetch('/api/reporting/objects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          objectIds: [object.id],
          exclude: false
        })
      });

      if (response.ok) {
        alert('Объект возвращен в общую работу');
        window.location.href = '/reporting';
      }
    } catch (error) {
      console.error('Ошибка возврата объекта:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING': { label: 'Ожидает', variant: 'secondary' as const },
      'IN_PROGRESS': { label: 'В работе', variant: 'default' as const },
      'COMPLETED': { label: 'Выполнено', variant: 'secondary' as const },
      'CANCELLED': { label: 'Отменено', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      'LOW': { label: 'Низкий', color: 'text-green-600 bg-green-50' },
      'MEDIUM': { label: 'Средний', color: 'text-yellow-600 bg-yellow-50' },
      'HIGH': { label: 'Высокий', color: 'text-red-600 bg-red-50' }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.MEDIUM;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  // Фильтрация задач по выбранной дате
  const filterTasksByDate = (taskList: ReportingTask[]) => {
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    return taskList.filter(task => {
      const taskDateStr = new Date(task.createdAt).toISOString().split('T')[0];
      return taskDateStr === selectedDateStr;
    });
  };

  // Разделение задач на активные и выполненные
  const allActiveTasks = tasks.filter(task => 
    task.status !== 'COMPLETED' && task.status !== 'CANCELLED'
  );
  
  const allCompletedTasks = tasks.filter(task => 
    task.status === 'COMPLETED' || task.status === 'CANCELLED'
  );

  // Фильтруем по выбранной дате
  const activeTasks = filterTasksByDate(allActiveTasks);
  const completedTasks = filterTasksByDate(allCompletedTasks);

  // Фильтрация по поиску и датам
  const filterTasks = (taskList: ReportingTask[]) => {
    return taskList.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (dateFrom || dateTo) {
        const taskDate = new Date(task.completedAt || task.createdAt);
        if (dateFrom) {
          matchesDate = matchesDate && taskDate >= new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && taskDate <= endDate;
        }
      }
      
      return matchesSearch && matchesDate;
    });
  };

  const filteredActiveTasks = filterTasks(activeTasks);
  const filteredCompletedTasks = filterTasks(completedTasks);

  return (
    <div className="space-y-6">
      {/* Заголовок и навигация */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reporting">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              К списку объектов
            </Button>
          </Link>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{object.name}</h1>
            <p className="text-gray-600">{object.address}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Админы и заместители могут создавать задачи и возвращать объекты */}
          {(userRole === 'ADMIN' || userRole === 'DEPUTY_ADMIN') && (
            <>
              <Button
                onClick={handleReturnToGeneral}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Вернуть в общую работу
              </Button>
              
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Создать задачу
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Новая задача</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="task-title">Название задачи</Label>
                      <Input
                        id="task-title"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Введите название задачи"
                      />
                    </div>
                    <div>
                      <Label htmlFor="task-description">Описание</Label>
                      <Textarea
                        id="task-description"
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                        placeholder="Подробное описание задачи"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="task-priority">Приоритет</Label>
                      <Select value={newTaskPriority} onValueChange={(value: any) => setNewTaskPriority(value)}>
                        <SelectTrigger id="task-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Низкий</SelectItem>
                          <SelectItem value="MEDIUM">Средний</SelectItem>
                          <SelectItem value="HIGH">Высокий</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="task-duedate">Срок выполнения (необязательно)</Label>
                      <Input
                        id="task-duedate"
                        type="datetime-local"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="task-recurring"
                          checked={newTaskIsRecurring}
                          onChange={(e) => setNewTaskIsRecurring(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="task-recurring" className="cursor-pointer">
                          Повторяющаяся задача
                        </Label>
                      </div>
                      {newTaskIsRecurring && (
                        <>
                          <div>
                            <Label htmlFor="task-frequency">Периодичность</Label>
                            <Select value={newTaskFrequency} onValueChange={(value: any) => setNewTaskFrequency(value)}>
                              <SelectTrigger id="task-frequency">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DAILY">Ежедневно</SelectItem>
                                <SelectItem value="WEEKLY">Еженедельно</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {newTaskFrequency === 'WEEKLY' && (
                            <div>
                              <Label htmlFor="task-weekday">День недели</Label>
                              <Select value={newTaskWeekDay.toString()} onValueChange={(value) => setNewTaskWeekDay(parseInt(value))}>
                                <SelectTrigger id="task-weekday">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Понедельник</SelectItem>
                                  <SelectItem value="2">Вторник</SelectItem>
                                  <SelectItem value="3">Среда</SelectItem>
                                  <SelectItem value="4">Четверг</SelectItem>
                                  <SelectItem value="5">Пятница</SelectItem>
                                  <SelectItem value="6">Суббота</SelectItem>
                                  <SelectItem value="0">Воскресенье</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                      >
                        Отмена
                      </Button>
                      <Button
                        onClick={handleCreateTask}
                        disabled={creating || !newTaskTitle.trim()}
                      >
                        {creating ? 'Создание...' : 'Создать'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Информация об объекте */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Объект</p>
                <p className="font-medium">{object.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Адрес</p>
                <p className="font-medium">{object.address}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Менеджер</p>
                <p className="font-medium">{object.manager.name}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Навигация по дням */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevDay}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Предыдущий день
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold text-lg">{formatSelectedDate()}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
              >
                Сегодня
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextDay}
              className="flex items-center gap-1"
            >
              Следующий день
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Фильтры и поиск */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Поиск задач..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Input
            type="date"
            placeholder="От"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
          <Input
            type="date"
            placeholder="До"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
            >
              Сбросить
            </Button>
          )}
        </div>
      </div>

      {/* Вкладки с задачами */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="text-blue-600">
              Новые задачи ({filteredActiveTasks.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-green-600">
              Выполненные ({filteredCompletedTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-4">
            {filteredActiveTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {activeTasks.length === 0 ? 'Нет активных задач' : 'Задачи не найдены'}
                  </h3>
                  <p className="text-gray-600 text-center">
                    {activeTasks.length === 0 
                      ? 'Создайте первую задачу для этого объекта'
                      : 'Попробуйте изменить критерии поиска'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredActiveTasks.map((task) => (
            <Card 
              key={task.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleTaskClick(task.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      {/* Показываем бейдж для родительских повторяющихся задач */}
                      {task.isRecurring && !task.stoppedAt && (
                        <Badge variant="outline" className="flex items-center gap-1 text-blue-600 border-blue-300">
                          <Repeat className="h-3 w-3" />
                          {getFrequencyLabel(task.frequency, task.weekDay)}
                        </Badge>
                      )}
                      {/* Показываем бейдж для виртуальных задач (из повторяющихся) */}
                      {task.isVirtual && task.parentTaskId && (
                        <Badge variant="outline" className="flex items-center gap-1 text-blue-600 border-blue-300">
                          <Repeat className="h-3 w-3" />
                          Повторяющаяся
                        </Badge>
                      )}
                      {task.isRecurring && task.stoppedAt && (
                        <Badge variant="outline" className="flex items-center gap-1 text-gray-500 border-gray-300">
                          <StopCircle className="h-3 w-3" />
                          Остановлено
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {getStatusBadge(task.status)}
                    {getPriorityBadge(task.priority)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span>Создал: {task.createdBy.name}</span>
                    <span>Исполнитель: {task.assignedTo.name}</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Показываем кнопку остановки для родительских и виртуальных повторяющихся задач */}
                    {((task.isRecurring && !task.stoppedAt) || (task.parentTaskId && task.isVirtual)) && (userRole === 'ADMIN' || userRole === 'DEPUTY_ADMIN') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStopRecurring(task);
                        }}
                        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title={task.isVirtual ? "Остановить повторение (остановит родительскую задачу)" : "Остановить повторение"}
                      >
                        <StopCircle className="h-3 w-3 mr-1" />
                        Остановить
                      </Button>
                    )}
                    <div className="flex items-center gap-1 text-gray-500">
                      <MessageSquare className="h-3 w-3" />
                      <span>{task._count.comments}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <FileText className="h-3 w-3" />
                      <span>{task._count.attachments}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            {filteredCompletedTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {completedTasks.length === 0 ? 'Нет выполненных задач' : 'Задачи не найдены'}
                  </h3>
                  <p className="text-gray-600 text-center">
                    {completedTasks.length === 0 
                      ? 'Выполненные задачи появятся здесь'
                      : 'Попробуйте изменить критерии поиска или фильтры по датам'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredCompletedTasks.map((task) => (
                  <Card 
                    key={task.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleTaskClick(task.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">{task.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {getStatusBadge(task.status)}
                          {getPriorityBadge(task.priority)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span>Создал: {task.createdBy.name}</span>
                          <span>Исполнитель: {task.assignedTo.name}</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {task.completedAt 
                                ? `Завершена: ${new Date(task.completedAt).toLocaleDateString()}`
                                : `Создана: ${new Date(task.createdAt).toLocaleDateString()}`
                              }
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-gray-500">
                            <MessageSquare className="h-3 w-3" />
                            <span>{task._count.comments}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-500">
                            <FileText className="h-3 w-3" />
                            <span>{task._count.attachments}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Модальное окно задачи */}
      <ReportingTaskModal
        taskId={selectedTaskId}
        isOpen={showTaskModal}
        onClose={handleTaskModalClose}
        onTaskUpdated={handleTaskUpdated}
        currentUser={{
          id: userId,
          name: 'Current User', // Это нужно будет получать из контекста
          role: userRole
        }}
      />
    </div>
  );
}
