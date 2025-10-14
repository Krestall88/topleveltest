'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2, 
  CheckCircle2, 
  Clock,
  Download,
  Filter,
  Calendar,
  Target,
  Zap,
  PieChart,
  LineChart
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalObjects: number;
    totalManagers: number;
    totalTasks: number;
    completionRate: number;
    avgTasksPerDay: number;
    avgCompletionTime: number;
  };
  charts: {
    dailyTasks: Array<{
      date: string;
      completed: number;
      created: number;
      overdue: number;
    }>;
    managerPerformance: Array<{
      id: string;
      name: string;
      completedTasks: number;
      completionRate: number;
      avgTime: number;
    }>;
    objectsStats: Array<{
      id: string;
      name: string;
      tasksCount: number;
      completionRate: number;
      efficiency: number;
    }>;
    tasksByStatus: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
  };
  trends: {
    weeklyCompletion: Array<{
      week: string;
      rate: number;
    }>;
    monthlyTasks: Array<{
      month: string;
      total: number;
      completed: number;
    }>;
  };
}

interface AdvancedAnalyticsProps {
  userRole: 'ADMIN' | 'DEPUTY' | 'MANAGER' | 'CLIENT';
  userId: string;
}

export default function AdvancedAnalytics({ userRole, userId }: AdvancedAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    period: '30',
    objectId: 'all',
    managerId: 'all',
    status: 'all'
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [filters, userRole, userId]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...filters,
        role: userRole,
        userId: userId
      });
      
      const response = await fetch(`/api/analytics/advanced?${params}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const params = new URLSearchParams({
        ...filters,
        role: userRole,
        userId: userId,
        format: 'excel'
      });
      
      const response = await fetch(`/api/analytics/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Ошибка экспорта:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Нет данных для анализа</h2>
        <p className="text-gray-600">Попробуйте изменить фильтры или период</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Заголовок и фильтры */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            📊 Детальная аналитика
          </h1>
          <p className="text-gray-600 mt-1">
            Глубокий анализ производительности и эффективности
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Select value={filters.period} onValueChange={(value) => setFilters({...filters, period: value})}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 дней</SelectItem>
              <SelectItem value="30">30 дней</SelectItem>
              <SelectItem value="90">3 месяца</SelectItem>
              <SelectItem value="365">Год</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.objectId} onValueChange={(value) => setFilters({...filters, objectId: value})}>
            <SelectTrigger className="w-40">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Объект" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все объекты</SelectItem>
              {/* Здесь будут загружаться объекты */}
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="completed">Выполнено</SelectItem>
              <SelectItem value="overdue">Просрочено</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Сводные метрики */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Объекты</p>
                <p className="text-2xl font-bold text-blue-600">{data.summary.totalObjects}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Менеджеры</p>
                <p className="text-2xl font-bold text-green-600">{data.summary.totalManagers}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Всего задач</p>
                <p className="text-2xl font-bold text-purple-600">{data.summary.totalTasks}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Выполнение</p>
                <p className="text-2xl font-bold text-orange-600">{data.summary.completionRate}%</p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Задач/день</p>
                <p className="text-2xl font-bold text-indigo-600">{data.summary.avgTasksPerDay}</p>
              </div>
              <Zap className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ср. время</p>
                <p className="text-2xl font-bold text-red-600">{data.summary.avgCompletionTime}ч</p>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Графики и диаграммы */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* График выполнения задач по дням */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LineChart className="h-5 w-5 text-blue-500" />
              <span>Динамика выполнения задач</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">График будет здесь</p>
                <p className="text-sm text-gray-500">
                  {data.charts.dailyTasks.length} точек данных
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Распределение задач по статусам */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-green-500" />
              <span>Статусы задач</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.charts.tasksByStatus.map((item, index) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-green-500' : 
                      index === 1 ? 'bg-blue-500' : 
                      index === 2 ? 'bg-red-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="font-medium">{item.status}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold">{item.count}</span>
                    <Badge variant="secondary">{item.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Производительность менеджеров */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-purple-500" />
            <span>🏆 Рейтинг менеджеров</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.charts.managerPerformance.map((manager, index) => (
              <div key={manager.id} className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">
                  <Badge variant={index < 3 ? "default" : "secondary"} className="w-8 h-8 rounded-full flex items-center justify-center">
                    {index + 1}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {manager.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {manager.completedTasks} задач выполнено
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {manager.completionRate}%
                    </div>
                    <div className="text-xs text-gray-500">выполнение</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {manager.avgTime}ч
                    </div>
                    <div className="text-xs text-gray-500">ср. время</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Эффективность объектов */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            <span>📈 Эффективность объектов</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.charts.objectsStats.map((object, index) => (
              <div key={object.id} className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">
                  <Badge variant={index < 3 ? "default" : "secondary"} className="w-8 h-8 rounded-full flex items-center justify-center">
                    {index + 1}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {object.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {object.tasksCount} задач
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {object.completionRate}%
                    </div>
                    <div className="text-xs text-gray-500">выполнение</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-600">
                      {object.efficiency}
                    </div>
                    <div className="text-xs text-gray-500">эффективность</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Тренды */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span>Недельные тренды</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.trends.weeklyCompletion.map((week, index) => (
                <div key={week.week} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{week.week}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${week.rate}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-green-600">{week.rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <span>Месячная динамика</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.trends.monthlyTasks.map((month, index) => (
                <div key={month.month} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{month.month}</span>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-600">{month.total}</div>
                      <div className="text-xs text-gray-500">всего</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">{month.completed}</div>
                      <div className="text-xs text-gray-500">выполнено</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
