'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Search, 
  Save,
  ArrowLeft,
  User,
  MapPin
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CleaningObject {
  id: string;
  name: string;
  address: string;
  managerId: string;
  excludeFromTasks: boolean;
  manager: {
    name: string;
  };
}

export default function ReportingSettingsPage() {
  const router = useRouter();
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadObjects();
  }, []);

  const loadObjects = async () => {
    try {
      setLoading(true);
      console.log('🔍 Загружаем объекты для настроек отчетности...');
      
      const response = await fetch('/api/objects/all', {
        credentials: 'include'
      });
      
      console.log('🔍 Ответ API объектов:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Данные объектов:', data);
        setObjects(data.objects || []);
        
        // Устанавливаем уже исключенные объекты как выбранные
        const excluded = new Set<string>(
          data.objects
            .filter((obj: CleaningObject) => obj.excludeFromTasks)
            .map((obj: CleaningObject) => obj.id)
        );
        setSelectedObjects(excluded);
        console.log('🔍 Исключенные объекты:', excluded);
      } else {
        const errorText = await response.text();
        console.error('❌ Ошибка API объектов:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки объектов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleObjectToggle = (objectId: string) => {
    const newSelected = new Set(selectedObjects);
    if (newSelected.has(objectId)) {
      newSelected.delete(objectId);
    } else {
      newSelected.add(objectId);
    }
    setSelectedObjects(newSelected);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Получаем объекты, которые нужно исключить
      const objectsToExclude = Array.from(selectedObjects);
      
      // Получаем объекты, которые нужно включить обратно
      const objectsToInclude = objects
        .filter(obj => obj.excludeFromTasks && !selectedObjects.has(obj.id))
        .map(obj => obj.id);

      // Исключаем выбранные объекты
      if (objectsToExclude.length > 0) {
        await fetch('/api/reporting/objects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            objectIds: objectsToExclude,
            exclude: true
          })
        });
      }

      // Включаем обратно невыбранные объекты
      if (objectsToInclude.length > 0) {
        await fetch('/api/reporting/objects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            objectIds: objectsToInclude,
            exclude: false
          })
        });
      }

      // Перезагружаем данные
      await loadObjects();
      
      alert('Настройки сохранены успешно!');
      
      // Автоматический переход на страницу отчетности
      setTimeout(() => {
        router.push('/reporting');
      }, 1000);
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      alert('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const filteredObjects = objects.filter(obj =>
    obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (obj.manager?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и навигация */}
      <div className="flex items-center justify-between">
        <Link href="/objects">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Назад к объектам
          </Button>
        </Link>
        
        <div className="flex items-center gap-4">
          <Badge variant="secondary">
            Выбрано: {selectedObjects.size} из {objects.length}
          </Badge>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Поиск объектов..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Информационная карточка */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 mt-1">ℹ️</div>
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Что означает исключение объекта?</h3>
              <p className="text-sm text-blue-700">
                Исключенные объекты не будут участвовать в автоматическом создании задач по расписанию. 
                Вместо этого для них можно создавать индивидуальные задачи через систему отчетности.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список объектов */}
      <div className="space-y-3">
        {filteredObjects.map((object) => (
          <Card 
            key={object.id} 
            className={`transition-all cursor-pointer hover:shadow-md ${
              selectedObjects.has(object.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => handleObjectToggle(object.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Checkbox
                  checked={selectedObjects.has(object.id)}
                  onChange={() => handleObjectToggle(object.id)}
                  className="pointer-events-none"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <h3 className="font-medium text-gray-900 truncate">
                      {object.name}
                    </h3>
                    {object.excludeFromTasks && (
                      <Badge variant="secondary" className="text-xs">
                        Исключен
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{object.address}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{object.manager?.name || 'Менеджер не назначен'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredObjects.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {objects.length === 0 ? 'Объекты не загружены' : 'Объекты не найдены'}
            </h3>
            <p className="text-gray-600">
              {objects.length === 0 
                ? 'Проверьте консоль браузера для отладки или обновите страницу'
                : 'Попробуйте изменить критерии поиска'
              }
            </p>
            {objects.length === 0 && (
              <Button onClick={loadObjects} className="mt-4">
                Попробовать снова
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
