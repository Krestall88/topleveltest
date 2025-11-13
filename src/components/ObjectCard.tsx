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
    <Card className={`w-full shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
      hasDailyTasks ? 'ring-2 ring-red-400 ring-opacity-30 border-red-200' : ''
    }`}>
      <CardHeader className="p-3 sm:p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full ${
              hasDailyTasks 
                ? 'bg-gradient-to-br from-red-100 to-red-200' 
                : 'bg-gradient-to-br from-blue-100 to-blue-200'
            }`}>
              <Building2 className={`w-4 h-4 sm:w-5 sm:h-5 ${hasDailyTasks ? 'text-red-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xs sm:text-lg font-semibold text-gray-900 line-clamp-1">
                {object.name || 'Объект не найден'}
              </CardTitle>
              {hasDailyTasks && (
                <div className="flex items-center gap-0.5 bg-red-600 text-white px-1 py-0.5 rounded text-[8px] sm:text-xs font-bold animate-pulse w-fit max-w-[90px] sm:max-w-none">
                  <AlertTriangle className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                  <span className="hidden sm:inline">ЕЖЕДНЕВНЫЕ</span>
                  <span className="sm:hidden truncate">ЕЖЕДН.</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Ответственный менеджер */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] sm:text-sm text-gray-700">
              <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">{manager.name}</span>
            </div>
            {manager.phone && (
              <div className="flex items-center gap-1 text-[10px] sm:text-sm text-gray-600">
                <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{manager.phone}</span>
              </div>
            )}
          </div>
          
          {/* Статистика и настройки */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              <Badge variant="outline" className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] sm:text-xs">
                <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                {stats.overdue}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] sm:text-xs">
                <Clock className="w-2.5 h-2.5 text-orange-600" />
                {stats.today}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] sm:text-xs">
                <CheckCircle className="w-2.5 h-2.5 text-green-600" />
                {stats.completed}
              </Badge>
            </div>
            {onOpenSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenSettings(object.id, object.name)}
                className="px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm flex items-center gap-1"
                title="Настройки завершения задач"
              >
                <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        {/* Разбивка по периодичности */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
            <span className="text-xs sm:text-sm font-medium text-gray-700">Периодичность ({byPeriodicity?.length || 0}):</span>
          </div>
          
          {byPeriodicity && byPeriodicity.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {byPeriodicity.map((period) => (
                <div
                  key={period.frequency}
                  className={`p-2 rounded-md border ${getFrequencyColor(period.frequency)} hover:shadow-md transition-shadow overflow-hidden ${
                    isDailyFrequency(period.frequency) ? 'ring-1 ring-red-300' : ''
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1">
                      {isDailyFrequency(period.frequency) && (
                        <div className="flex items-center justify-center w-4 h-4 bg-red-600 rounded-full animate-pulse">
                          <AlertTriangle className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      <span className={`text-[10px] sm:text-xs font-semibold truncate ${
                        isDailyFrequency(period.frequency) ? 'text-red-900 font-bold' : ''
                      }`}>
                        {getFrequencyLabel(period.frequency)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-red-50 text-red-700 border-red-200 px-1 py-0">
                        <AlertTriangle className="w-2 h-2" />
                        {period.tasks?.filter((t: any) => t.status === 'OVERDUE').length || 0}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-orange-50 text-orange-700 border-orange-200 px-1 py-0">
                        <Clock className="w-2 h-2" />
                        {period.tasks?.filter((t: any) => ['TODAY', 'AVAILABLE', 'IN_PROGRESS'].includes(t.status)).length || 0}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-green-50 text-green-700 border-green-200 px-1 py-0">
                        <CheckCircle className="w-2 h-2" />
                        {period.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0}
                      </Badge>
                    </div>
                    
                    <Button
                      variant={isDailyFrequency(period.frequency) ? "default" : "outline"}
                      size="sm"
                      className={`px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs w-full ${
                        isDailyFrequency(period.frequency) 
                          ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 animate-pulse' 
                          : 'hover:bg-white/20'
                      }`}
                      onClick={() => onViewPeriodTasks(manager.id, period.frequency, period.tasks || [])}
                    >
                      <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline ml-1">{isDailyFrequency(period.frequency) ? 'СРОЧНО' : 'Подробнее'}</span>
                    </Button>
                  </div>
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
