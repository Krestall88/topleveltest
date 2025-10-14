'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  User, 
  CheckSquare, 
  FileText, 
  Calendar,
  Filter,
  RefreshCw,
  Eye
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  details: any;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ManagerActivityLogProps {
  managerId?: string;
  objectId?: string;
  limit?: number;
}

export default function ManagerActivityLog({ 
  managerId, 
  objectId, 
  limit = 50 
}: ManagerActivityLogProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState({
    action: '',
    dateFrom: '',
    dateTo: ''
  });

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (managerId) params.append('userId', managerId);
      if (filter.action) params.append('action', filter.action);
      if (filter.dateFrom) params.append('dateFrom', filter.dateFrom);
      if (filter.dateTo) params.append('dateTo', filter.dateTo);
      params.append('limit', limit.toString());

      const response = await fetch(`/api/audit?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.auditLogs || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки логов:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [managerId, objectId]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'TASK_STATUS_CHANGED':
        return <CheckSquare className="w-4 h-4" />;
      case 'CHECKLIST_COMPLETED':
        return <FileText className="w-4 h-4" />;
      case 'CHECKLIST_AUTO_CREATED':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'TASK_STATUS_CHANGED':
        return 'bg-blue-100 text-blue-800';
      case 'CHECKLIST_COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CHECKLIST_AUTO_CREATED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'TASK_STATUS_CHANGED':
        return 'Изменение статуса задачи';
      case 'CHECKLIST_COMPLETED':
        return 'Завершение чек-листа';
      case 'CHECKLIST_AUTO_CREATED':
        return 'Автосоздание чек-листа';
      case 'SYSTEM_CLEANUP':
        return 'Системная очистка';
      default:
        return action;
    }
  };

  const formatLogDetails = (log: AuditLog) => {
    const details = log.details || {};
    
    switch (log.action) {
      case 'TASK_STATUS_CHANGED':
        return (
          <div className="text-sm space-y-1">
            <div><strong>Задача:</strong> {details.taskTitle}</div>
            <div><strong>Объект:</strong> {details.objectName}</div>
            {details.roomName && <div><strong>Помещение:</strong> {details.roomName}</div>}
            <div className="flex items-center space-x-2">
              <span>Статус:</span>
              <Badge variant="outline" className="text-xs">
                {details.previousStatus}
              </Badge>
              <span>→</span>
              <Badge variant="default" className="text-xs">
                {details.newStatus}
              </Badge>
            </div>
            {details.notes && <div><strong>Заметки:</strong> {details.notes}</div>}
            {details.hasPhoto && (
              <Badge variant="secondary" className="text-xs">
                📷 С фото
              </Badge>
            )}
          </div>
        );
      
      case 'CHECKLIST_COMPLETED':
        return (
          <div className="text-sm space-y-1">
            <div><strong>Объект:</strong> {details.objectName}</div>
            {details.roomName && <div><strong>Помещение:</strong> {details.roomName}</div>}
            <div><strong>Дата:</strong> {details.checklistDate}</div>
            <div><strong>Всего задач:</strong> {details.totalTasks}</div>
          </div>
        );
      
      case 'CHECKLIST_AUTO_CREATED':
        return (
          <div className="text-sm space-y-1">
            <div><strong>Объект:</strong> {details.objectName}</div>
            {details.roomName && <div><strong>Помещение:</strong> {details.roomName}</div>}
            <div><strong>Дата:</strong> {details.date}</div>
            <div><strong>Техкарт:</strong> {details.techCardsCount}</div>
            <Badge variant="secondary" className="text-xs">
              🤖 Автоматически
            </Badge>
          </div>
        );
      
      default:
        return (
          <div className="text-sm text-gray-600">
            {JSON.stringify(details, null, 2)}
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Журнал действий
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={fetchLogs}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-1">Действие</label>
            <select
              value={filter.action}
              onChange={(e) => setFilter(prev => ({ ...prev, action: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="">Все действия</option>
              <option value="TASK_STATUS_CHANGED">Изменение задач</option>
              <option value="CHECKLIST_COMPLETED">Завершение чек-листов</option>
              <option value="CHECKLIST_AUTO_CREATED">Автосоздание</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">С даты</label>
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">По дату</label>
            <input
              type="date"
              value={filter.dateTo}
              onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={fetchLogs}
              disabled={isLoading}
              size="sm"
              className="w-full"
            >
              <Filter className="w-4 h-4 mr-1" />
              Применить
            </Button>
          </div>
        </div>

        {/* Список логов */}
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {isLoading ? 'Загрузка...' : 'Нет записей в журнале'}
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-full ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                    </div>
                    <div>
                      <div className="font-medium">{getActionText(log.action)}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(log.createdAt).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  </div>
                  {log.user && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4 mr-1" />
                      {log.user.name}
                    </div>
                  )}
                </div>
                
                <div className="ml-10">
                  {formatLogDetails(log)}
                </div>
              </div>
            ))
          )}
        </div>

        {logs.length >= limit && (
          <div className="text-center mt-4">
            <Button variant="outline" size="sm">
              Показать больше
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
