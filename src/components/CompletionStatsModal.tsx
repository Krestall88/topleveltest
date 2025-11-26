'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, Calendar, ClipboardList, ListChecks } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';

interface CompletionStats {
  calendar: {
    total: number;
    completed: number;
    rate: number;
  };
  additional: {
    total: number;
    completed: number;
    rate: number;
  };
  checklists: {
    total: number;
    completed: number;
    rate: number;
  };
  overall: {
    total: number;
    completed: number;
    rate: number;
  };
  trend: Array<{
    date: string;
    rate: number;
  }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const COLORS = ['#8b5cf6', '#f59e0b', '#14b8a6'];

export default function CompletionStatsModal({ isOpen, onClose }: Props) {
  const [stats, setStats] = useState<CompletionStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard/completion-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching completion stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!stats && !loading) return null;

  const radialData = stats ? [
    {
      name: 'Календарь',
      value: stats.calendar.rate,
      fill: COLORS[0]
    },
    {
      name: 'Доп. задачи',
      value: stats.additional.rate,
      fill: COLORS[1]
    },
    {
      name: 'Чек-листы',
      value: stats.checklists.rate,
      fill: COLORS[2]
    }
  ] : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Детальная статистика выполнения
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Загрузка данных...</p>
          </div>
        ) : stats && (
          <div className="space-y-6">
            {/* Общий процент выполнения */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Target className="h-6 w-6 text-purple-600" />
                    <h3 className="text-lg font-semibold">Общий процент выполнения</h3>
                  </div>
                  <div className="text-5xl font-bold text-purple-600 mb-2">
                    {stats.overall.rate.toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-600">
                    {stats.overall.completed} из {stats.overall.total} задач выполнено
                  </p>
                  <Progress value={stats.overall.rate} className="h-3 mt-4" />
                </div>
              </CardContent>
            </Card>

            {/* Детализация по типам */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    Календарь
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {stats.calendar.rate.toFixed(1)}%
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {stats.calendar.completed} / {stats.calendar.total}
                      </p>
                    </div>
                    <Progress value={stats.calendar.rate} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="h-5 w-5 text-orange-500" />
                    Доп. задачи
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {stats.additional.rate.toFixed(1)}%
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {stats.additional.completed} / {stats.additional.total}
                      </p>
                    </div>
                    <Progress value={stats.additional.rate} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="h-5 w-5 text-teal-500" />
                    Чек-листы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-teal-600">
                        {stats.checklists.rate.toFixed(1)}%
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {stats.checklists.completed} / {stats.checklists.total}
                      </p>
                    </div>
                    <Progress value={stats.checklists.rate} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Графики */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Динамика выполнения (7 дней)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString('ru-RU')}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Выполнение']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="rate" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        name="Процент выполнения"
                        dot={{ fill: '#8b5cf6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Сравнение по типам</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadialBarChart 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="10%" 
                      outerRadius="80%" 
                      data={radialData}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar
                        label={{ position: 'insideStart', fill: '#fff' }}
                        background
                        dataKey="value"
                      />
                      <Legend 
                        iconSize={10}
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                      />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Сводка */}
            <Card>
              <CardHeader>
                <CardTitle>Сводная информация</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Лучший показатель</div>
                    <div className="font-semibold">
                      {Math.max(stats.calendar.rate, stats.additional.rate, stats.checklists.rate) === stats.calendar.rate && 'Календарь'}
                      {Math.max(stats.calendar.rate, stats.additional.rate, stats.checklists.rate) === stats.additional.rate && 'Доп. задачи'}
                      {Math.max(stats.calendar.rate, stats.additional.rate, stats.checklists.rate) === stats.checklists.rate && 'Чек-листы'}
                    </div>
                    <div className="text-2xl font-bold text-purple-600 mt-1">
                      {Math.max(stats.calendar.rate, stats.additional.rate, stats.checklists.rate).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Требует внимания</div>
                    <div className="font-semibold">
                      {Math.min(stats.calendar.rate, stats.additional.rate, stats.checklists.rate) === stats.calendar.rate && 'Календарь'}
                      {Math.min(stats.calendar.rate, stats.additional.rate, stats.checklists.rate) === stats.additional.rate && 'Доп. задачи'}
                      {Math.min(stats.calendar.rate, stats.additional.rate, stats.checklists.rate) === stats.checklists.rate && 'Чек-листы'}
                    </div>
                    <div className="text-2xl font-bold text-orange-600 mt-1">
                      {Math.min(stats.calendar.rate, stats.additional.rate, stats.checklists.rate).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Средний показатель</div>
                    <div className="font-semibold">По всем типам</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">
                      {((stats.calendar.rate + stats.additional.rate + stats.checklists.rate) / 3).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
