'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, Eye, Download, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { getActionDescription, getResourceDescription } from '@/lib/audit';
import ManagerActivityLog from '@/components/ManagerActivityLog';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuditClientPageProps {
  users: User[];
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function AuditClientPage({ users }: AuditClientPageProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'managers'>('general');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters] = useState({
    search: '',
    userId: '',
    action: '',
    resource: '',
    dateFrom: '',
    dateTo: '',
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchAuditLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', pagination.limit.toString());
      
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.action) params.append('action', filters.action);
      if (filters.resource) params.append('resource', filters.resource);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await fetch(`/api/audit?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.auditLogs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Ошибка при загрузке аудит логов:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs(1);
  }, [filters]);

  const handlePageChange = (newPage: number) => {
    fetchAuditLogs(newPage);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      userId: '',
      action: '',
      resource: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const exportData = () => {
    const exportObj = {
      дата_экспорта: new Date().toLocaleString('ru-RU'),
      фильтры: filters,
      всего_записей: pagination.totalCount,
      записи: auditLogs.map(log => ({
        дата: new Date(log.createdAt).toLocaleString('ru-RU'),
        пользователь: log.user.name,
        действие: getActionDescription(log.action),
        ресурс: getResourceDescription(log.resource),
        идентификатор_ресурса: log.resourceId,
        детали: log.details,
        ip_адрес: log.ipAddress,
      })),
    };
    
    const dataStr = JSON.stringify(exportObj, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getUniqueActions = () => {
    const actions = [...new Set(auditLogs.map(log => log.action))];
    return actions.map(action => ({
      value: action,
      label: getActionDescription(action),
    }));
  };

  const getUniqueResources = () => {
    const resources = [...new Set(auditLogs.map(log => log.resource))];
    return resources.map(resource => ({
      value: resource,
      label: getResourceDescription(resource),
    }));
  };

  if (loading && auditLogs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Вкладки */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Search className="w-4 h-4 inline mr-2" />
            Общий журнал
          </button>
          <button
            onClick={() => setActiveTab('managers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'managers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Активность менеджеров
          </button>
        </nav>
      </div>

      {/* Контент вкладок */}
      {activeTab === 'managers' ? (
        <ManagerActivityLog />
      ) : (
        <>
          {/* Заголовок и статистика */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">
                Записи аудита ({pagination.totalCount})
              </h2>
              {(filters.userId || filters.action || filters.resource || filters.dateFrom || filters.dateTo) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
            <button
              onClick={exportData}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Экспорт</span>
            </button>
          </div>

      {/* Фильтры */}
      <div className="bg-white border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Пользователь */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Все пользователи</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Действие */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Все действия</option>
              {getUniqueActions().map((action) => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ресурс */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={filters.resource}
              onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Все ресурсы</option>
              {getUniqueResources().map((resource) => (
                <option key={resource.value} value={resource.value}>
                  {resource.label}
                </option>
              ))}
            </select>
          </div>

          {/* Дата от */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Дата до */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Размер страницы */}
          <div className="relative">
            <select
              value={pagination.limit}
              onChange={(e) => {
                setPagination({ ...pagination, limit: parseInt(e.target.value) });
                fetchAuditLogs(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value={25}>25 записей</option>
              <option value={50}>50 записей</option>
              <option value={100}>100 записей</option>
            </select>
          </div>
        </div>
      </div>

      {/* Таблица аудит логов */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {auditLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет записей</h3>
            <p>Записи аудита будут отображаться здесь</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Дата и время</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Пользователь</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Действие</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Ресурс</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">ID ресурса</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">IP адрес</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">
                        {formatTime(log.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{log.user.name}</div>
                          <div className="text-gray-500 text-xs">{log.user.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {getActionDescription(log.action)}
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {getResourceDescription(log.resource)}
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                        {log.resourceId || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                        {log.ipAddress || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Просмотреть детали"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            <div className="bg-gray-50 px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Показано {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalCount)} из {pagination.totalCount} записей
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev || loading}
                  className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-700">
                  Страница {pagination.page} из {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext || loading}
                  className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Модальное окно с деталями */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Детали записи аудита</h3>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Дата и время</label>
                  <p className="text-sm">{formatTime(selectedLog.createdAt)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Пользователь</label>
                  <p className="text-sm">{selectedLog.user.name} ({selectedLog.user.email})</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Действие</label>
                  <p className="text-sm">{getActionDescription(selectedLog.action)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Ресурс</label>
                  <p className="text-sm">{getResourceDescription(selectedLog.resource)}</p>
                </div>
                
                {selectedLog.resourceId && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">ID ресурса</label>
                    <p className="text-sm font-mono">{selectedLog.resourceId}</p>
                  </div>
                )}
                
                {selectedLog.ipAddress && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">IP адрес</label>
                    <p className="text-sm font-mono">{selectedLog.ipAddress}</p>
                  </div>
                )}
                
                {selectedLog.userAgent && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">User Agent</label>
                    <p className="text-sm font-mono text-xs break-all">{selectedLog.userAgent}</p>
                  </div>
                )}
                
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Дополнительные детали</label>
                    <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
