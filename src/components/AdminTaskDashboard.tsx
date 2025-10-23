'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, Building2, Clock, TrendingUp, AlertTriangle, CheckCircle, Settings, Play } from 'lucide-react';

interface AdminStats {
  totalObjects: number;
  activeManagers: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
}

interface ManagerPerformance {
  manager: {
    id: string;
    name: string;
  };
  stats: {
    total: number;
    completed: number;
    overdue: number;
    today: number;
  };
  objects: Array<{
    id: string;
    name: string;
    taskCount: number;
  }>;
}

export default function AdminTaskDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalObjects: 0,
    activeManagers: 0,
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    completionRate: 0
  });
  
  const [managers, setManagers] = useState<ManagerPerformance[]>([]);
  const [objects, setObjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  // Загрузка данных
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Загружаем статистику из правильного API
      const statsResponse = await fetch('/api/dashboard/modern', {
        credentials: 'include'
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats({
          totalObjects: statsData.overview.totalObjects,
          activeManagers: statsData.overview.totalManagers,
          totalTasks: statsData.overview.totalTasks,
          completedTasks: statsData.overview.totalTasks - statsData.realtime.activeTasks,
          overdueTasks: statsData.realtime.overdueTasks,
          completionRate: statsData.overview.completionRate
        });
        
        setObjects(statsData.objects || []);
      }

      // Загружаем данные календаря для группировки по менеджерам
      const calendarResponse = await fetch('/api/tasks/calendar-simple');
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        setManagers(calendarData.byManager || []);
      }

    } catch (error) {
      console.error('Ошибка загрузки данных дашборда:', error);
    } finally {
      setLoading(false);
    }
  };

  // Автогенерация задач
  const handleAutoGenerate = async () => {
    try {
      const response = await fetch('/api/tasks/auto-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          days: 7 // Генерируем на неделю вперед
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Сгенерировано ${result.generated} задач`);
        loadDashboardData(); // Обновляем данные
      } else {
        alert('Ошибка генерации задач');
      }
    } catch (error) {
      console.error('Ошибка автогенерации:', error);
      alert('Ошибка автогенерации задач');
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Автообновление каждые 30 секунд
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Загрузка панели администратора...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">🔧 Административная панель</h1>
          <p className="text-gray-600">Контроль календаря задач и отчетности</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Сегодня</SelectItem>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleAutoGenerate} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Автогенерация
          </Button>
          
          <Button variant="outline" onClick={loadDashboardData}>
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
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Объекты</p>
                <p className="text-xl font-bold text-blue-600">{stats.totalObjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Менеджеры</p>
                <p className="text-xl font-bold text-green-600">{stats.activeManagers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Всего задач</p>
                <p className="text-xl font-bold text-purple-600">{stats.totalTasks}</p>
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Выполнение</p>
                <p className="text-xl font-bold text-blue-600">{stats.completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Детальная информация */}
      <Tabs defaultValue="managers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="managers">По менеджерам</TabsTrigger>
          <TabsTrigger value="objects">По объектам</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>
        
        <TabsContent value="managers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Производительность менеджеров</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {managers.map((manager) => (
                  <div key={manager.manager.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{manager.manager.name}</h3>
                      <div className="flex gap-2">
                        <Badge variant="destructive">{manager.stats.overdue} просрочено</Badge>
                        <Badge variant="default">{manager.stats.today} сегодня</Badge>
                        <Badge variant="secondary">{manager.stats.completed} выполнено</Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      {manager.objects?.slice(0, 3).map((obj) => (
                        <div key={obj.id} className="p-2 bg-gray-50 rounded">
                          <span className="font-medium">{obj.name}</span>
                          <span className="text-gray-500 ml-2">({obj.taskCount} задач)</span>
                        </div>
                      ))}
                      {manager.objects?.length > 3 && (
                        <div className="p-2 bg-gray-50 rounded text-gray-500">
                          И еще {manager.objects.length - 3} объектов...
                        </div>
                      )}
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
              <CardTitle>Статус объектов</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {objects.map((object) => (
                  <div key={object.id} className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">{object.name}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Активные техкарты:</span>
                        <span className="font-medium">{object.activeTechCards}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Часовой пояс:</span>
                        <span className="text-gray-600">{object.timezone || 'Europe/Moscow'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Автогенерация:</span>
                        <Badge variant={object.autoGenerate ? 'default' : 'secondary'}>
                          {object.autoGenerate ? 'Включена' : 'Отключена'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Настройки системы
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Автогенерация задач</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Система автоматически создает задачи на основе периодичности техкарт с учетом часовых поясов и рабочих дней объектов.
                </p>
                <Button onClick={handleAutoGenerate} className="w-full">
                  Запустить автогенерацию на 7 дней
                </Button>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Статистика системы</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Объектов с автогенерацией:</span>
                    <span className="font-medium ml-2">{objects.filter(obj => obj.autoGenerate).length}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Общий процент выполнения:</span>
                    <span className="font-medium ml-2">{stats.completionRate}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
