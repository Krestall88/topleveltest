'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CheckCircle2, User, MapPin } from 'lucide-react';

interface UrgentTask {
  id: string;
  description: string;
  objectName: string;
  roomName?: string;
  managerName?: string;
  status: 'OVERDUE' | 'AVAILABLE' | 'COMPLETED';
  scheduledDate: Date;
  priority?: 'CRITICAL' | 'HIGH' | 'NORMAL';
  frequency?: string;
}

interface UrgentTasksPanelProps {
  overdueCount: number;
  todayCount: number;
  completedTodayCount: number;
  urgentTasks: UrgentTask[];
  onTaskClick: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

export default function UrgentTasksPanel({
  overdueCount,
  todayCount,
  completedTodayCount,
  urgentTasks,
  onTaskClick,
  onCompleteTask
}: UrgentTasksPanelProps) {
  
  const getPriorityColor = (priority: string | undefined, status: string) => {
    if (status === 'COMPLETED') return 'bg-green-50 border-green-200';
    
    switch (priority) {
      case 'CRITICAL': return 'bg-red-50 border-red-300 border-l-red-500';
      case 'HIGH': return 'bg-orange-50 border-orange-300 border-l-orange-500';
      default: return 'bg-gray-50 border-gray-200 border-l-gray-400';
    }
  };

  const getPriorityIcon = (priority: string | undefined, status: string) => {
    if (status === 'COMPLETED') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    
    switch (priority) {
      case 'CRITICAL': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'HIGH': return <Clock className="w-4 h-4 text-orange-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const overdueUrgentTasks = urgentTasks.filter(task => task.status === 'OVERDUE');
  const todayUrgentTasks = urgentTasks.filter(task => task.status === 'AVAILABLE');
  const completedUrgentTasks = urgentTasks.filter(task => task.status === 'COMPLETED');

  return (
    <div className="mb-6">
      {/* Статистика срочных задач */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Критически просрочено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{overdueCount}</div>
            <p className="text-xs text-red-600">Требует немедленного внимания</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Срочно на сегодня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{todayCount}</div>
            <p className="text-xs text-orange-600">Нужно выполнить сегодня</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Выполнено сегодня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{completedTodayCount}</div>
            <p className="text-xs text-green-600">Отличная работа!</p>
          </CardContent>
        </Card>
      </div>

      {/* Список срочных задач */}
      {(overdueUrgentTasks.length > 0 || todayUrgentTasks.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              🚨 Срочные задачи требуют внимания
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Просроченные задачи */}
            {overdueUrgentTasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-lg border-l-4 ${getPriorityColor(task.priority, task.status)} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => onTaskClick(task.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {getPriorityIcon(task.priority, task.status)}
                      <Badge variant="destructive" className="text-xs">
                        ПРОСРОЧЕНО
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(task.scheduledDate).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{task.description}</h4>
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {task.objectName}
                      </div>
                      {task.roomName && (
                        <span>• {task.roomName}</span>
                      )}
                      {task.managerName && (
                        <div className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {task.managerName}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-2 border-red-300 text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompleteTask(task.id);
                    }}
                  >
                    Выполнить
                  </Button>
                </div>
              </div>
            ))}

            {/* Сегодняшние задачи */}
            {todayUrgentTasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-lg border-l-4 ${getPriorityColor(task.priority, task.status)} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => onTaskClick(task.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {getPriorityIcon(task.priority, task.status)}
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                        СЕГОДНЯ
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(task.scheduledDate).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{task.description}</h4>
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {task.objectName}
                      </div>
                      {task.roomName && (
                        <span>• {task.roomName}</span>
                      )}
                      {task.managerName && (
                        <div className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {task.managerName}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="ml-2 bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompleteTask(task.id);
                    }}
                  >
                    Выполнить
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Выполненные задачи (свернутый список) */}
      {completedUrgentTasks.length > 0 && (
        <Card className="mt-4 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Выполнено сегодня ({completedUrgentTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedUrgentTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center space-x-2 text-sm text-green-700">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{task.description}</span>
                  <span className="text-green-600">• {task.objectName}</span>
                </div>
              ))}
              {completedUrgentTasks.length > 3 && (
                <div className="text-xs text-green-600">
                  и еще {completedUrgentTasks.length - 3} задач...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
