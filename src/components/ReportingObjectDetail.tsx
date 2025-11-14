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
  Trash2
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState(object.managerId);
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
        setTasks(data.tasks || []);
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
          dueDate: newTaskDueDate || undefined
        })
      });

      if (response.ok) {
        setNewTaskTitle('');
        setNewTaskDescription('');
        setNewTaskPriority('MEDIUM');
        setNewTaskDueDate('');
        setNewTaskAssignedTo(object.managerId);
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

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

      {/* Фильтры и поиск */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Поиск задач..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">Все статусы</option>
          <option value="PENDING">Ожидает</option>
          <option value="IN_PROGRESS">В работе</option>
          <option value="COMPLETED">Выполнено</option>
        </select>
      </div>

      {/* Список задач */}
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
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {tasks.length === 0 ? 'Нет задач' : 'Задачи не найдены'}
            </h3>
            <p className="text-gray-600 text-center">
              {tasks.length === 0 
                ? 'Создайте первую задачу для этого объекта'
                : 'Попробуйте изменить критерии поиска'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
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
                      <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Комментарии и вложения будут добавлены позже */}
                    <div className="flex items-center gap-1 text-gray-500">
                      <MessageSquare className="h-3 w-3" />
                      <span>0</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <FileText className="h-3 w-3" />
                      <span>0</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
