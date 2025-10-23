'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, TrendingUp, Building, Eye, ChevronRight } from 'lucide-react';
import { CalendarTask, formatTaskTime } from '@/lib/task-calendar-utils';

interface TaskPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  managerId?: string;
  objectId?: string;
}

interface PreviewData {
  period: {
    startDate: string;
    endDate: string;
    days: number;
    startDateFormatted: string;
    endDateFormatted: string;
  };
  stats: {
    totalTasks: number;
    dailyTasks: number;
    weeklyTasks: number;
    monthlyTasks: number;
    otherTasks: number;
    objectsCount: number;
    averageTasksPerDay: number;
  };
  dailyPreview: Array<{
    date: string;
    dateFormatted: string;
    tasksCount: number;
    tasks: CalendarTask[];
    summary: {
      daily: number;
      weekly: number;
      monthly: number;
      other: number;
    };
  }>;
  topObjects: Array<{
    objectId: string;
    objectName: string;
    tasksCount: number;
  }>;
}

export default function TaskPreviewModal({ isOpen, onClose, managerId, objectId }: TaskPreviewModalProps) {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        days: days.toString()
      });
      
      if (managerId) params.append('managerId', managerId);
      if (objectId) params.append('objectId', objectId);

      const response = await fetch(`/api/tasks/preview?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки предварительного просмотра:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPreview();
    }
  }, [isOpen, selectedDate, days, managerId, objectId]);

  const getFrequencyColor = (frequencyDays: number) => {
    if (frequencyDays === 1) return 'bg-red-100 text-red-800';
    if (frequencyDays === 7) return 'bg-blue-100 text-blue-800';
    if (frequencyDays === 30) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getFrequencyLabel = (frequencyDays: number) => {
    if (frequencyDays === 1) return 'Ежедневно';
    if (frequencyDays === 7) return 'Еженедельно';
    if (frequencyDays === 30) return 'Ежемесячно';
    return `Каждые ${frequencyDays} дней`;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Предварительный просмотр задач
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Настройки просмотра */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Период:</label>
              <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 дня</SelectItem>
                  <SelectItem value="7">Неделя</SelectItem>
                  <SelectItem value="14">2 недели</SelectItem>
                  <SelectItem value="30">Месяц</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Начиная с:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
              />
            </div>

            <Button onClick={loadPreview} disabled={loading} size="sm">
              {loading ? 'Загрузка...' : 'Обновить'}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Загрузка предварительного просмотра...</p>
              </div>
            </div>
          ) : previewData ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Обзор</TabsTrigger>
                <TabsTrigger value="daily">По дням</TabsTrigger>
                <TabsTrigger value="objects">По объектам</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Общая статистика */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Всего задач</p>
                          <p className="text-xl font-bold">{previewData.stats.totalTasks}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">В среднем в день</p>
                          <p className="text-xl font-bold">{previewData.stats.averageTasksPerDay}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Building className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Объектов</p>
                          <p className="text-xl font-bold">{previewData.stats.objectsCount}</p>
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
                          <p className="text-sm text-gray-600">Период</p>
                          <p className="text-xl font-bold">{previewData.period.days} дн.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Распределение по периодичности */}
                <Card>
                  <CardHeader>
                    <CardTitle>Распределение по периодичности</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{previewData.stats.dailyTasks}</div>
                        <div className="text-sm text-gray-600">Ежедневные</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{previewData.stats.weeklyTasks}</div>
                        <div className="text-sm text-gray-600">Еженедельные</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{previewData.stats.monthlyTasks}</div>
                        <div className="text-sm text-gray-600">Ежемесячные</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">{previewData.stats.otherTasks}</div>
                        <div className="text-sm text-gray-600">Другие</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="daily" className="space-y-4">
                <div className="space-y-4">
                  {previewData.dailyPreview.map((day) => (
                    <Card key={day.date}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{day.dateFormatted}</CardTitle>
                          <Badge variant="secondary">{day.tasksCount} задач</Badge>
                        </div>
                        <div className="flex gap-2 text-sm">
                          {day.summary.daily > 0 && (
                            <Badge className="bg-red-100 text-red-800">
                              Ежедневно: {day.summary.daily}
                            </Badge>
                          )}
                          {day.summary.weekly > 0 && (
                            <Badge className="bg-blue-100 text-blue-800">
                              Еженедельно: {day.summary.weekly}
                            </Badge>
                          )}
                          {day.summary.monthly > 0 && (
                            <Badge className="bg-green-100 text-green-800">
                              Ежемесячно: {day.summary.monthly}
                            </Badge>
                          )}
                          {day.summary.other > 0 && (
                            <Badge className="bg-gray-100 text-gray-800">
                              Другие: {day.summary.other}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {day.tasks.slice(0, 5).map((task) => (
                            <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{task.techCard.name}</div>
                                <div className="text-xs text-gray-600">{task.object.name}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getFrequencyColor(task.techCard.frequencyDays || 1)}>
                                  {getFrequencyLabel(task.techCard.frequencyDays || 1)}
                                </Badge>
                                <div className="text-xs text-gray-500">
                                  {formatTaskTime(task.scheduledFor, task.dueDate)}
                                </div>
                              </div>
                            </div>
                          ))}
                          {day.tasks.length > 5 && (
                            <div className="text-center text-sm text-gray-500 py-2">
                              ... и еще {day.tasks.length - 5} задач
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="objects" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Топ объектов по количеству задач</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {previewData.topObjects.map((obj, index) => (
                        <div key={obj.objectId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{obj.objectName}</div>
                              <div className="text-sm text-gray-600">{obj.tasksCount} задач</div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Нет данных для отображения</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
