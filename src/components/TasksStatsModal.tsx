'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock, AlertCircle, Calendar, ListChecks, ClipboardList } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface TasksStats {
  calendar: {
    total: number;
    completed: number;
    active: number;
    overdue: number;
  };
  additional: {
    total: number;
    completed: number;
    active: number;
    overdue: number;
  };
  checklists: {
    total: number;
    completed: number;
    active: number;
    overdue: number;
  };
  totals: {
    all: number;
    completed: number;
    active: number;
    overdue: number;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const COLORS = {
  completed: '#10b981',
  active: '#3b82f6',
  overdue: '#ef4444'
};

export default function TasksStatsModal({ isOpen, onClose }: Props) {
  const [stats, setStats] = useState<TasksStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard/tasks-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching tasks stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!stats && !loading) return null;

  const chartData = stats ? [
    {
      name: 'Календарь',
      'Выполнено': stats.calendar.completed,
      'Активные': stats.calendar.active,
      'Просрочено': stats.calendar.overdue
    },
    {
      name: 'Доп. задачи',
      'Выполнено': stats.additional.completed,
      'Активные': stats.additional.active,
      'Просрочено': stats.additional.overdue
    },
    {
      name: 'Чек-листы',
      'Выполнено': stats.checklists.completed,
      'Активные': stats.checklists.active,
      'Просрочено': stats.checklists.overdue
    }
  ] : [];

  const pieData = stats ? [
    { name: 'Выполнено', value: stats.totals.completed, color: COLORS.completed },
    { name: 'Активные', value: stats.totals.active, color: COLORS.active },
    { name: 'Просрочено', value: stats.totals.overdue, color: COLORS.overdue }
  ] : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Детальная статистика задач
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Загрузка данных...</p>
          </div>
        ) : stats && (
          <div className="space-y-6">
            {/* Общая статистика */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Всего задач</p>
                      <p className="text-2xl font-bold">{stats.totals.all}</p>
                    </div>
                    <ClipboardList className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Выполнено</p>
                      <p className="text-2xl font-bold text-green-600">{stats.totals.completed}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Активные</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.totals.active}</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Просрочено</p>
                      <p className="text-2xl font-bold text-red-600">{stats.totals.overdue}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Детализация по типам */}
            <Card>
              <CardHeader>
                <CardTitle>Задачи по типам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-5 w-5 text-purple-500" />
                      <h4 className="font-semibold">Календарь</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Всего:</span>
                        <span className="font-medium">{stats.calendar.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">Выполнено:</span>
                        <span className="font-medium">{stats.calendar.completed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Активные:</span>
                        <span className="font-medium">{stats.calendar.active}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">Просрочено:</span>
                        <span className="font-medium">{stats.calendar.overdue}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <ClipboardList className="h-5 w-5 text-orange-500" />
                      <h4 className="font-semibold">Доп. задачи</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Всего:</span>
                        <span className="font-medium">{stats.additional.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">Выполнено:</span>
                        <span className="font-medium">{stats.additional.completed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Активные:</span>
                        <span className="font-medium">{stats.additional.active}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">Просрочено:</span>
                        <span className="font-medium">{stats.additional.overdue}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <ListChecks className="h-5 w-5 text-teal-500" />
                      <h4 className="font-semibold">Чек-листы</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Всего:</span>
                        <span className="font-medium">{stats.checklists.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">Выполнено:</span>
                        <span className="font-medium">{stats.checklists.completed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Активные:</span>
                        <span className="font-medium">{stats.checklists.active}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">Просрочено:</span>
                        <span className="font-medium">{stats.checklists.overdue}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Графики */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Распределение по типам</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Выполнено" fill={COLORS.completed} />
                      <Bar dataKey="Активные" fill={COLORS.active} />
                      <Bar dataKey="Просрочено" fill={COLORS.overdue} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Общее распределение</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
