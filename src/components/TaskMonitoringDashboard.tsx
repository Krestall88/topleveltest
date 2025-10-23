'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Building, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Calendar,
  Activity,
  Target,
  BarChart3
} from 'lucide-react';

interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  pendingTasks: number;
  completionRate: number;
  averageCompletionTime: number;
}

interface ManagerPerformance {
  managerId: string;
  managerName: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  averageResponseTime: number;
  objectsCount: number;
}

interface ObjectPerformance {
  objectId: string;
  objectName: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  managerName: string;
}

interface RecentActivity {
  id: string;
  type: 'COMPLETED' | 'OVERDUE' | 'SKIPPED';
  taskName: string;
  objectName: string;
  managerName: string;
  timestamp: Date;
  comment?: string;
}

export default function TaskMonitoringDashboard() {
  const [stats, setStats] = useState<TaskStats>({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    pendingTasks: 0,
    completionRate: 0,
    averageCompletionTime: 0
  });
  
  const [managerPerformance, setManagerPerformance] = useState<ManagerPerformance[]>([]);
  const [objectPerformance, setObjectPerformance] = useState<ObjectPerformance[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedObject, setSelectedObject] = useState('');

  // Загрузка данных
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Здесь будут реальные API вызовы
      // Пока используем моковые данные для демонстрации
      
      // Общая статистика
      setStats({
        totalTasks: 156,
        completedTasks: 142,
        overdueTasks: 8,
        pendingTasks: 6,
        completionRate: 91.0,
        averageCompletionTime: 2.5
      });

      // Производительность менеджеров
      setManagerPerformance([
        {
          managerId: '1',
          managerName: 'Ягода Ирина Александровна',
          totalTasks: 45,
          completedTasks: 42,
          overdueTasks: 2,
          completionRate: 93.3,
          averageResponseTime: 1.8,
          objectsCount: 3
        },
        {
          managerId: '2',
          managerName: 'Гайнуллина Айна Алиевна',
          totalTasks: 38,
          completedTasks: 35,
          overdueTasks: 1,
          completionRate: 92.1,
          averageResponseTime: 2.1,
          objectsCount: 2
        },
        {
          managerId: '3',
          managerName: 'Исайчева Маргарита Николаевна',
          totalTasks: 52,
          completedTasks: 46,
          overdueTasks: 4,
          completionRate: 88.5,
          averageResponseTime: 3.2,
          objectsCount: 4
        }
      ]);

      // Производительность объектов
      setObjectPerformance([
        {
          objectId: '1',
          objectName: 'ТЦ Мелодия',
          totalTasks: 28,
          completedTasks: 26,
          overdueTasks: 1,
          completionRate: 92.9,
          managerName: 'Ягода И.А.'
        },
        {
          objectId: '2',
          objectName: 'АО «ГК «Электрощит»',
          totalTasks: 35,
          completedTasks: 32,
          overdueTasks: 2,
          completionRate: 91.4,
          managerName: 'Гайнуллина А.А.'
        },
        {
          objectId: '3',
          objectName: 'ООО «ПепсиКо Холдингс»',
          totalTasks: 22,
          completedTasks: 20,
          overdueTasks: 1,
          completionRate: 90.9,
          managerName: 'Исайчева М.Н.'
        }
      ]);

      // Недавняя активность
      setRecentActivity([
        {
          id: '1',
          type: 'COMPLETED',
          taskName: 'Уборка санузлов',
          objectName: 'ТЦ Мелодия',
          managerName: 'Ягода И.А.',
          timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 минут назад
          comment: 'Выполнено в срок'
        },
        {
          id: '2',
          type: 'OVERDUE',
          taskName: 'Мытье полов',
          objectName: 'Электрощит',
          managerName: 'Гайнуллина А.А.',
          timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 минут назад
        },
        {
          id: '3',
          type: 'COMPLETED',
          taskName: 'Протирка витрин',
          objectName: 'ПепсиКо',
          managerName: 'Исайчева М.Н.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 часа назад
        }
      ]);

    } catch (error) {
      console.error('Ошибка загрузки данных дашборда:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Автообновление каждые 30 секунд
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [selectedPeriod, selectedManager, selectedObject]);

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'OVERDUE':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'SKIPPED':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'SKIPPED':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'только что';
    if (diffInMinutes < 60) return `${diffInMinutes} мин назад`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ч назад`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} дн назад`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Загрузка панели мониторинга...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">📊 Мониторинг выполнения задач</h1>
          <p className="text-gray-600">Панель администратора для отслеживания производительности</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Сегодня</SelectItem>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-1" />
            Обновить
          </Button>
        </div>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
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
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Выполнено</p>
                <p className="text-xl font-bold text-green-600">{stats.completedTasks}</p>
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
                <p className="text-sm text-gray-600">В ожидании</p>
                <p className="text-xl font-bold text-orange-600">{stats.pendingTasks}</p>
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ср. время</p>
                <p className="text-xl font-bold text-indigo-600">{stats.averageCompletionTime}ч</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Детальная аналитика */}
      <Tabs defaultValue="managers" className="w-full">
        <TabsList>
          <TabsTrigger value="managers">Менеджеры</TabsTrigger>
          <TabsTrigger value="objects">Объекты</TabsTrigger>
          <TabsTrigger value="activity">Активность</TabsTrigger>
        </TabsList>

        <TabsContent value="managers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Производительность менеджеров
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {managerPerformance.map((manager) => (
                  <div key={manager.managerId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{manager.managerName}</h4>
                      <p className="text-sm text-gray-600">
                        {manager.objectsCount} объектов • Ср. время ответа: {manager.averageResponseTime}ч
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Задач</p>
                        <p className="font-bold">{manager.totalTasks}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Выполнено</p>
                        <p className="font-bold text-green-600">{manager.completedTasks}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Просрочено</p>
                        <p className="font-bold text-red-600">{manager.overdueTasks}</p>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={manager.completionRate >= 90 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}
                      >
                        {manager.completionRate}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Производительность объектов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {objectPerformance.map((object) => (
                  <div key={object.objectId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{object.objectName}</h4>
                      <p className="text-sm text-gray-600">Менеджер: {object.managerName}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Задач</p>
                        <p className="font-bold">{object.totalTasks}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Выполнено</p>
                        <p className="font-bold text-green-600">{object.completedTasks}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Просрочено</p>
                        <p className="font-bold text-red-600">{object.overdueTasks}</p>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={object.completionRate >= 90 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}
                      >
                        {object.completionRate}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Недавняя активность
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{activity.taskName}</span>
                        <Badge className={getActivityColor(activity.type)}>
                          {activity.type === 'COMPLETED' ? 'Выполнено' : 
                           activity.type === 'OVERDUE' ? 'Просрочено' : 'Пропущено'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {activity.objectName} • {activity.managerName}
                        {activity.comment && ` • ${activity.comment}`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
