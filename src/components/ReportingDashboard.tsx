'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Building2, 
  Plus, 
  Search, 
  Calendar,
  User,
  FileText,
  Settings
} from 'lucide-react';

interface ReportingObject {
  id: string;
  name: string;
  address: string;
  managerId: string;
  manager: {
    name: string;
  };
  _count: {
    reportingTasks: number;
  };
}

interface ReportingDashboardProps {
  userRole: 'ADMIN' | 'DEPUTY' | 'DEPUTY_ADMIN' | 'MANAGER' | 'CLIENT';
  userId: string;
}

export default function ReportingDashboard({ userRole, userId }: ReportingDashboardProps) {
  const [objects, setObjects] = useState<ReportingObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadReportingObjects();
  }, []);

  const loadReportingObjects = async () => {
    try {
      setLoading(true);
      console.log('🔍 Загружаем объекты отчетности...');
      
      const response = await fetch('/api/reporting/objects', {
        credentials: 'include'
      });
      
      console.log('🔍 Ответ API отчетности:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Данные отчетности:', data);
        setObjects(data.objects || []);
      } else {
        const errorText = await response.text();
        console.error('❌ Ошибка API отчетности:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки объектов отчетности:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnObject = async (objectId: string) => {
    if (!confirm('Вернуть объект в общую работу? Для него снова будут создаваться автоматические задачи.')) {
      return;
    }

    try {
      const response = await fetch('/api/reporting/objects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          objectIds: [objectId],
          exclude: false
        })
      });

      if (response.ok) {
        alert('Объект возвращен в общую работу');
        await loadReportingObjects();
      }
    } catch (error) {
      console.error('Ошибка возврата объекта:', error);
    }
  };

  const filteredObjects = objects.filter(obj =>
    obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.manager.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
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

  return (
    <div className="space-y-6">
      {/* Заголовок и настройки */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Поиск объектов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Настроить объекты
          </Button>
          
          {userRole !== 'MANAGER' && (
            <Button
              onClick={() => window.location.href = '/objects/reporting-settings'}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Добавить объекты
            </Button>
          )}
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего объектов</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{objects.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных задач</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {objects.reduce((sum, obj) => sum + obj._count.reportingTasks, 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Менеджеров</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(objects.map(obj => obj.managerId)).size}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">За сегодня</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      {/* Список объектов */}
      {filteredObjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {objects.length === 0 ? 'Нет объектов для отчетности' : 'Объекты не найдены'}
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {objects.length === 0 
                ? 'Настройте объекты, которые будут исключены из автоматического создания задач'
                : 'Попробуйте изменить критерии поиска'
              }
            </p>
            {objects.length === 0 && (
              <Button onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Настроить объекты
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredObjects.map((object) => (
            <Card key={object.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                      {object.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600">{object.address}</p>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {object._count.reportingTasks} задач
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>{object.manager.name}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.location.href = `/reporting/objects/${object.id}`}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Открыть
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleReturnObject(object.id)}
                      title="Вернуть в общую работу"
                    >
                      ↩️
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Модальное окно настроек будет добавлено позже */}
    </div>
  );
}
