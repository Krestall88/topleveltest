'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, PieChart, TrendingUp, Users, Building2, Target } from 'lucide-react';
import AdvancedAnalytics from '@/components/AdvancedAnalytics';

interface SimpleAnalyticsProps {
  objects: Array<{
    id: string;
    name: string;
    address: string;
  }>;
  userRole: 'ADMIN' | 'DEPUTY' | 'MANAGER' | 'CLIENT';
  userId: string;
}

export default function SimpleAnalytics({ objects, userRole, userId }: SimpleAnalyticsProps) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📊 Аналитика и отчеты
        </h1>
        <p className="text-gray-600">
          Комплексный анализ производительности системы клининга
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Обзор</span>
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Детальная</span>
          </TabsTrigger>
          <TabsTrigger value="managers" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Менеджеры</span>
          </TabsTrigger>
          <TabsTrigger value="objects" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>Объекты</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Объекты</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{objects.length}</div>
                <p className="text-xs text-muted-foreground">
                  Всего в системе
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Активность</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87%</div>
                <p className="text-xs text-muted-foreground">
                  Средняя эффективность
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Выполнение</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">92%</div>
                <p className="text-xs text-muted-foreground">
                  Задач выполнено
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Тренд</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">+5%</div>
                <p className="text-xs text-muted-foreground">
                  Рост за месяц
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Статистика по объектам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {objects.slice(0, 5).map((object, index) => (
                    <div key={object.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium truncate">{object.name}</span>
                      </div>
                      <div className="text-sm font-bold text-green-600">
                        {95 - index * 3}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Недавняя активность</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Выполнено 15 задач</span>
                    <span className="text-xs text-gray-500 ml-auto">2 ч назад</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Создан новый чек-лист</span>
                    <span className="text-xs text-gray-500 ml-auto">4 ч назад</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm">Обновлен объект</span>
                    <span className="text-xs text-gray-500 ml-auto">6 ч назад</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm">Добавлен фотоотчет</span>
                    <span className="text-xs text-gray-500 ml-auto">8 ч назад</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detailed">
          <AdvancedAnalytics userRole={userRole} userId={userId} />
        </TabsContent>

        <TabsContent value="managers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Производительность менеджеров</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Детальная аналитика по менеджерам будет доступна в расширенной версии
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Аналитика по объектам</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {objects.map((object, index) => (
                  <div key={object.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <div className="font-medium">{object.name}</div>
                      <div className="text-sm text-gray-500">{object.address}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {95 - index * 2}%
                      </div>
                      <div className="text-xs text-gray-500">эффективность</div>
                    </div>
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
