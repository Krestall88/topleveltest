'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Phone, 
  User, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Settings
} from 'lucide-react';

interface ObjectCardProps {
  object: {
    id: string;
    name: string;
  };
  manager: {
    id: string;
    name: string;
    phone?: string;
  };
  stats: {
    total: number;
    completed: number;
    overdue: number;
    today: number;
  };
  byPeriodicity: Array<{
    frequency: string;
    count: number;
    tasks: any[];
  }>;
  tasks: any[];
  onViewPeriodTasks: (managerId: string, frequency: string, tasks: any[]) => void;
  onOpenSettings?: (objectId: string, objectName: string) => void;
}

const ObjectCard: React.FC<ObjectCardProps> = ({
  object,
  manager,
  stats,
  byPeriodicity,
  tasks,
  onViewPeriodTasks,
  onOpenSettings
}) => {
  const getFrequencyLabel = (frequency: string) => {
    const lowerFreq = frequency?.toLowerCase();
    switch (lowerFreq) {
      case 'daily': return 'Ежедневно';
      case 'weekly': return 'Еженедельно';
      case 'monthly': return 'Ежемесячно';
      case 'quarterly': return 'Ежеквартально';
      case 'yearly': return 'Ежегодно';
      case 'annual': return 'Ежегодно';
      case 'biweekly': return 'Раз в две недели';
      case 'bimonthly': return 'Раз в два месяца';
      case 'semiannual': return 'Полугодовые';
      case 'hourly': return 'Ежечасно';
      case 'minute': return 'Поминутно';
      case 'once': return 'Однократно';
      case 'as_needed': return 'По необходимости';
      case 'on_demand': return 'По требованию';
      default: return frequency || 'Неизвестно';
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'bg-red-100 text-red-800 border-red-300 border-2 shadow-md';
      case 'weekly': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'monthly': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'quarterly': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'yearly': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isDailyFrequency = (frequency: string) => {
    return frequency === 'daily' || frequency?.toLowerCase().includes('ежедневно');
  };

  const hasDailyTasks = byPeriodicity?.some(period => isDailyFrequency(period.frequency)) || false;

  return (
    <Card className={`w-full shadow-sm hover:shadow-md transition-shadow ${
      hasDailyTasks ? 'ring-2 ring-red-400 ring-opacity-30 border-red-200' : ''
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
              hasDailyTasks 
                ? 'bg-gradient-to-br from-red-100 to-red-200' 
                : 'bg-gradient-to-br from-blue-100 to-blue-200'
            }`}>
              <Building2 className={`w-6 h-6 ${hasDailyTasks ? 'text-red-600' : 'text-blue-600'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {object.name || 'Объект не найден'}
                </CardTitle>
                {hasDailyTasks && (
                  <div className="flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    ЕЖЕДНЕВНЫЕ ЗАДАЧИ
                  </div>
                )}
              </div>
              
              {/* Ответственный менеджер */}
              <div className="mt-1">
                <div className="flex items-center gap-1 text-sm text-gray-700">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Ответственный:</span>
                  <span>{manager.name}</span>
                </div>
                {manager.phone && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 ml-5">
                    <Phone className="w-3 h-3" />
                    <span>{manager.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Статистика и настройки */}
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                {stats.overdue}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-orange-600" />
                {stats.today}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
                {stats.completed}
              </Badge>
            </div>
            {onOpenSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenSettings(object.id, object.name)}
                className="flex items-center gap-1 text-xs"
                title="Настройки завершения задач"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Настройки</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Разбивка по периодичности */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Разбивка по периодичности ({byPeriodicity?.length || 0}):</span>
          </div>
          
          {byPeriodicity && byPeriodicity.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {byPeriodicity.map((period) => (
                <div
                  key={period.frequency}
                  className={`p-4 rounded-lg border-2 ${getFrequencyColor(period.frequency)} hover:shadow-md transition-shadow ${
                    isDailyFrequency(period.frequency) ? 'ring-2 ring-red-300 ring-opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isDailyFrequency(period.frequency) && (
                        <div className="flex items-center justify-center w-6 h-6 bg-red-600 rounded-full animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <span className={`text-sm font-semibold ${
                        isDailyFrequency(period.frequency) ? 'text-red-900 font-bold' : ''
                      }`}>
                        {getFrequencyLabel(period.frequency)}
                        {isDailyFrequency(period.frequency) && (
                          <span className="ml-2 text-xs bg-red-600 text-white px-2 py-1 rounded-full animate-pulse">
                            СРОЧНО
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                        <AlertTriangle className="w-2 h-2 mr-1" />
                        {period.tasks?.filter((t: any) => t.status === 'OVERDUE').length || 0}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                        <Clock className="w-2 h-2 mr-1" />
                        {period.tasks?.filter((t: any) => ['TODAY', 'AVAILABLE', 'IN_PROGRESS'].includes(t.status)).length || 0}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="w-2 h-2 mr-1" />
                        {period.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    variant={isDailyFrequency(period.frequency) ? "default" : "outline"}
                    size="sm"
                    className={`w-full text-xs font-medium ${
                      isDailyFrequency(period.frequency) 
                        ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 animate-pulse' 
                        : 'hover:bg-white/20'
                    }`}
                    onClick={() => onViewPeriodTasks(manager.id, period.frequency, period.tasks || [])}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    {isDailyFrequency(period.frequency) ? 'СРОЧНО - Подробнее' : 'Подробнее'}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm italic">Нет данных по периодичности</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ObjectCard;
