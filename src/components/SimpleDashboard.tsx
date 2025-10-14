'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Camera,
  MessageSquare,
  Package,
  BarChart3,
  Eye,
  ChevronRight,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import TaskNotifications from '@/components/TaskNotifications';

interface DashboardData {
  overview: {
    totalObjects: number;
    totalManagers: number;
    totalTasks: number;
    completionRate: number;
    trendsData: {
      objectsChange: number;
      managersChange: number;
      tasksChange: number;
      completionChange: number;
    };
  };
  realtime: {
    activeTasks: number;
    overdueTasks: number;
    newRequests: number;
    recentPhotos: number;
  };
  performance: {
    topManagers: Array<{
      id: string;
      name: string;
      completionRate: number;
      objectsCount: number;
    }>;
    topObjects: Array<{
      id: string;
      name: string;
      completionRate: number;
      tasksCount: number;
    }>;
  };
  quickStats: {
    todayTasks: number;
    weekTasks: number;
    monthTasks: number;
    totalInventory: number;
  };
}

interface SimpleDashboardProps {
  userRole: 'ADMIN' | 'DEPUTY' | 'MANAGER' | 'CLIENT';
  userId: string;
}

export default function SimpleDashboard({ userRole, userId }: SimpleDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Обновляем данные каждые 30 секунд
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [userRole, userId]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/dashboard/modern?role=${userRole}&userId=${userId}`);
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных дашборда:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
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
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Ошибка загрузки данных</h2>
        <p className="text-gray-600">Не удалось загрузить данные дашборда</p>
        <Button onClick={fetchDashboardData} className="mt-4">
          Попробовать снова
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Заголовок с real-time индикатором */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🚀 Интерактивный дашборд
          </h1>
          <p className="text-gray-600 mt-1">
            Полный контроль над системой клининга в реальном времени
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Real-time</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <Activity className="h-4 w-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      {/* Основные метрики */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/objects">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Объекты
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {data.overview.totalObjects}
              </div>
              <div className="flex items-center space-x-2">
                {getTrendIcon(data.overview.trendsData.objectsChange)}
                <span className={`text-sm font-medium ${getTrendColor(data.overview.trendsData.objectsChange)}`}>
                  {data.overview.trendsData.objectsChange > 0 ? '+' : ''}{data.overview.trendsData.objectsChange}%
                </span>
                <span className="text-sm text-gray-500">за месяц</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/managers">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Менеджеры
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-500" />
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-green-500 transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {data.overview.totalManagers}
              </div>
              <div className="flex items-center space-x-2">
                {getTrendIcon(data.overview.trendsData.managersChange)}
                <span className={`text-sm font-medium ${getTrendColor(data.overview.trendsData.managersChange)}`}>
                  {data.overview.trendsData.managersChange > 0 ? '+' : ''}{data.overview.trendsData.managersChange}%
                </span>
                <span className="text-sm text-gray-500">за месяц</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/checklists">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Задачи
              </CardTitle>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-purple-500" />
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {data.overview.totalTasks}
              </div>
              <div className="flex items-center space-x-2">
                {getTrendIcon(data.overview.trendsData.tasksChange)}
                <span className={`text-sm font-medium ${getTrendColor(data.overview.trendsData.tasksChange)}`}>
                  {data.overview.trendsData.tasksChange > 0 ? '+' : ''}{data.overview.trendsData.tasksChange}%
                </span>
                <span className="text-sm text-gray-500">за месяц</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Выполнение
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-orange-500" />
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {data.overview.completionRate}%
              </div>
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${data.overview.completionRate}%` }}
                  ></div>
                </div>
                <div className="flex items-center space-x-2">
                  {getTrendIcon(data.overview.trendsData.completionChange)}
                  <span className={`text-sm font-medium ${getTrendColor(data.overview.trendsData.completionChange)}`}>
                    {data.overview.trendsData.completionChange > 0 ? '+' : ''}{data.overview.trendsData.completionChange}%
                  </span>
                  <span className="text-sm text-gray-500">за месяц</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Real-time активность */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-blue-500" />
            <span>⚡ Активность в реальном времени</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Link href="/checklists" className="group">
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-white hover:bg-blue-50 transition-all duration-300 hover:scale-105 shadow-sm">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{data.realtime.activeTasks}</div>
                  <div className="text-sm text-gray-600">Активные задачи</div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors ml-auto" />
              </div>
            </Link>

            <Link href="/checklists?filter=overdue" className="group">
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-white hover:bg-red-50 transition-all duration-300 hover:scale-105 shadow-sm">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{data.realtime.overdueTasks}</div>
                  <div className="text-sm text-gray-600">Просрочено</div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors ml-auto" />
              </div>
            </Link>

            <Link href="/additional-tasks" className="group">
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-white hover:bg-green-50 transition-all duration-300 hover:scale-105 shadow-sm">
                <div className="p-3 bg-green-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{data.realtime.newRequests}</div>
                  <div className="text-sm text-gray-600">Новые заявки</div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-green-500 transition-colors ml-auto" />
              </div>
            </Link>

            <Link href="/photos" className="group">
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-white hover:bg-purple-50 transition-all duration-300 hover:scale-105 shadow-sm">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Camera className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{data.realtime.recentPhotos}</div>
                  <div className="text-sm text-gray-600">Фото сегодня</div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-purple-500 transition-colors ml-auto" />
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Топ менеджеры и объекты */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <span>🏆 Лучшие менеджеры</span>
            </CardTitle>
            <Link href="/managers">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Все менеджеры
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.performance.topManagers.map((manager, index) => (
              <Link key={manager.id} href={`/managers/${manager.id}`}>
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex-shrink-0">
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      #{index + 1}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {manager.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {manager.objectsCount} объектов
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-lg font-bold text-green-600">
                      {manager.completionRate}%
                    </div>
                    <div className="text-xs text-gray-500">рейтинг</div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <span>🔥 Активные объекты</span>
            </CardTitle>
            <Link href="/objects">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Все объекты
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.performance.topObjects.map((object, index) => (
              <Link key={object.id} href={`/objects/${object.id}`}>
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex-shrink-0">
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      #{index + 1}
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
                  <div className="flex-shrink-0 text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {object.completionRate}%
                    </div>
                    <div className="text-xs text-gray-500">выполнение</div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Быстрые действия */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/objects">
              <Button className="w-full h-16 text-left justify-start hover:scale-105 transition-transform" variant="outline">
                <Building2 className="h-6 w-6 mr-3" />
                <div>
                  <div className="font-medium">Новый объект</div>
                  <div className="text-sm text-gray-500">Добавить объект</div>
                </div>
              </Button>
            </Link>

            <Link href="/managers">
              <Button className="w-full h-16 text-left justify-start hover:scale-105 transition-transform" variant="outline">
                <Users className="h-6 w-6 mr-3" />
                <div>
                  <div className="font-medium">Менеджеры</div>
                  <div className="text-sm text-gray-500">Управление</div>
                </div>
              </Button>
            </Link>

            <Link href="/analytics">
              <Button className="w-full h-16 text-left justify-start hover:scale-105 transition-transform" variant="outline">
                <BarChart3 className="h-6 w-6 mr-3" />
                <div>
                  <div className="font-medium">Аналитика</div>
                  <div className="text-sm text-gray-500">Детальные отчеты</div>
                </div>
              </Button>
            </Link>

            <Link href="/inventory">
              <Button className="w-full h-16 text-left justify-start hover:scale-105 transition-transform" variant="outline">
                <Package className="h-6 w-6 mr-3" />
                <div>
                  <div className="font-medium">Инвентарь</div>
                  <div className="text-sm text-gray-500">Управление складом</div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Уведомления по задачам */}
      <div className="mt-6">
        <TaskNotifications userId={userId} limit={5} />
      </div>
    </div>
  );
}
