'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import RoomManager from '@/components/RoomManager';
import CreateObjectForm from '@/components/CreateObjectForm';
import ObjectEditModal from '@/components/ObjectEditModal';
import SimpleExcelUpload from '@/components/SimpleExcelUpload';

interface CleaningObject {
  id: string;
  name: string;
  address: string;
  allowManagerEdit?: boolean;
  manager?: { id: string; name: string | null } | null;
}

export default function ObjectsClientPage() {
  const router = useRouter();
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedObject, setSelectedObject] = useState<CleaningObject | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingObject, setEditingObject] = useState<CleaningObject | null>(null);
  const [isNewEditModalOpen, setIsNewEditModalOpen] = useState(false);
  const [editingObjectId, setEditingObjectId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    managerId: '',
    workingHours: { start: '08:00', end: '20:00' },
    workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    timezone: ''
  });
  const [managers, setManagers] = useState<{id: string, name: string}[]>([]);
  const [rooms, setRooms] = useState<{name: string, description: string, area: number}[]>([]);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState<string>('');

  const fetchUserInfo = async () => {
    try {
      console.log('🔍 Загружаем информацию о пользователе...');
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        console.log('👤 Роль пользователя:', userData.user.role);
        setUserRole(userData.user.role);
      } else {
        console.error('❌ Ошибка API /api/auth/me:', response.status);
      }
    } catch (error) {
      console.error('❌ Ошибка получения информации о пользователе:', error);
    }
  };

  const fetchObjects = async () => {
    try {
      const response = await fetch('/api/objects');
      if (!response.ok) {
        throw new Error('Ошибка загрузки объектов');
      }
      const data = await response.json();
      setObjects(data);
    } catch (error) {
      console.error('Ошибка при загрузке объектов:', error);
      setError('Не удалось загрузить объекты');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await fetch('/api/users?role=MANAGER');
      if (response.ok) {
        const data = await response.json();
        setManagers(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки менеджеров:', error);
    }
  };

  useEffect(() => {
    fetchUserInfo();
    fetchObjects();
    fetchManagers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/objects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          rooms: rooms
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при создании объекта');
      }

      const newObject = await response.json();
      setObjects([...objects, newObject]);
      setIsAddModalOpen(false);
      setFormData({ 
        name: '', 
        address: '', 
        managerId: '',
        workingHours: { start: '08:00', end: '20:00' },
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        timezone: ''
      });
      setRooms([]);
    } catch (error) {
      console.error('Ошибка при создании объекта:', error);
      alert('Не удалось создать объект');
    }
  };

  const handleEdit = (object: CleaningObject) => {
    setEditingObjectId(object.id);
    setIsNewEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingObject) return;
    
    try {
      // Автоматически определяем часовой пояс при изменении адреса
      let timezone = formData.timezone;
      if (formData.address !== editingObject.address) {
        try {
          const timezoneResponse = await fetch('/api/objects/timezone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: formData.address })
          });
          
          if (timezoneResponse.ok) {
            const timezoneData = await timezoneResponse.json();
            timezone = timezoneData.timezone;
          }
        } catch (timezoneError) {
          console.warn('Не удалось определить часовой пояс:', timezoneError);
        }
      }

      const response = await fetch(`/api/objects/${editingObject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          timezone
        })
      });

      if (!response.ok) throw new Error('Ошибка при обновлении объекта');

      const updatedObject = await response.json();
      setObjects(objects.map(obj => obj.id === editingObject.id ? updatedObject : obj));
      setIsEditModalOpen(false);
      setEditingObject(null);
      setFormData({ 
        name: '', 
        address: '', 
        managerId: '',
        workingHours: { start: '08:00', end: '20:00' },
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        timezone: ''
      });
      setRooms([]);
    } catch (error) {
      console.error('Ошибка при обновлении объекта:', error);
      setError('Не удалось обновить объект');
    }
  };

  const handleDelete = async (objectId: string) => {
    if (!confirm('Удалить объект? Все связанные данные также будут удалены.')) return;
    
    try {
      const response = await fetch(`/api/objects/${objectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Ошибка удаления');
      
      setObjects(objects.filter(obj => obj.id !== objectId));
    } catch (error) {
      console.error('Ошибка при удалении объекта:', error);
      setError('Не удалось удалить объект');
    }
  };

  const addRoom = () => {
    setRooms([...rooms, { name: '', description: '', area: 0 }]);
  };

  const updateRoom = (index: number, field: string, value: string | number) => {
    const updatedRooms = [...rooms];
    updatedRooms[index] = { ...updatedRooms[index], [field]: value };
    setRooms(updatedRooms);
  };

  const removeRoom = (index: number) => {
    setRooms(rooms.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка объектов...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Заголовок и кнопки */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {userRole === 'MANAGER' ? 'Мои объекты' : 'Управление объектами'}
        </h2>
        {/* DEBUG: Роль пользователя: {userRole || 'не загружена'} */}
        {userRole !== 'MANAGER' && (
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="default"
            >
              + Создать объект с техкартами
            </Button>
          </div>
        )}
      </div>

      {/* Excel управление - только для админов */}
      {userRole !== 'MANAGER' && (
        <div className="mb-6">
          <SimpleExcelUpload onImportComplete={fetchObjects} />
        </div>
      )}

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Поиск по названию или адресу..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Список объектов */}
      {objects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            Объекты не добавлены
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {objects
            .filter((obj) => {
              const query = searchQuery.toLowerCase();
              return (
                obj.name.toLowerCase().includes(query) ||
                obj.address.toLowerCase().includes(query)
              );
            })
            .map((obj) => (
            <Card key={obj.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{obj.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => router.push(`/objects/${obj.id}`)}
                      size="sm"
                    >
                      Подробнее
                    </Button>
                    {(userRole !== 'MANAGER' || (userRole === 'MANAGER' && obj.allowManagerEdit)) && (
                      <Button
                        onClick={() => handleEdit(obj)}
                        size="sm"
                        variant="outline"
                      >
                        Редактировать
                      </Button>
                    )}
                    {userRole !== 'MANAGER' && (
                      <Button
                        onClick={() => handleDelete(obj.id)}
                        size="sm"
                        variant="destructive"
                      >
                        Удалить
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Менеджеры:</span>
                    {(() => {
                      const managers: Array<{name: string, site?: string, role?: string}> = [];
                      
                      // Менеджер объекта
                      if (obj.manager?.name) {
                        managers.push({ 
                          name: obj.manager.name, 
                          role: obj.manager.role === 'SENIOR_MANAGER' ? 'Старший' : undefined 
                        });
                      }
                      
                      // Менеджеры участков
                      if ((obj as any).sites) {
                        (obj as any).sites.forEach((site: any) => {
                          if (site.manager?.name && !site.name.includes('__VIRTUAL__')) {
                            managers.push({ 
                              name: site.manager.name, 
                              site: site.name,
                              role: site.manager.role === 'SENIOR_MANAGER' ? 'Старший' : undefined
                            });
                          }
                          if (site.seniorManager?.name && !site.name.includes('__VIRTUAL__')) {
                            managers.push({ 
                              name: site.seniorManager.name, 
                              site: site.name,
                              role: 'Старший'
                            });
                          }
                        });
                      }
                      
                      // Убираем дубликаты
                      const uniqueManagers = managers.filter((m, i, arr) => 
                        arr.findIndex(x => x.name === m.name && x.site === m.site) === i
                      );
                      
                      if (uniqueManagers.length === 0) {
                        return <span className="text-gray-500 ml-2">Не назначены</span>;
                      }
                      
                      if (uniqueManagers.length === 1 && !uniqueManagers[0].site) {
                        return <span className="ml-2">{uniqueManagers[0].name}</span>;
                      }
                      
                      return (
                        <div className="ml-2 space-y-1 mt-1">
                          {uniqueManagers.map((m, i) => (
                            <div key={i} className="text-xs">
                              • {m.name}
                              {m.role && <span className="text-blue-600 ml-1">({m.role})</span>}
                              {m.site && <span className="text-gray-500 ml-1">- {m.site}</span>}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Модальное окно добавления объекта */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Добавить новый объект</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название объекта *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Менеджер
                  </label>
                  <select
                    value={formData.managerId}
                    onChange={(e) => setFormData({...formData, managerId: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Выберите менеджера</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Адрес *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Рабочие часы и дни */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Рабочие часы
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="time"
                      value={formData.workingHours.start}
                      onChange={(e) => setFormData({
                        ...formData, 
                        workingHours: { ...formData.workingHours, start: e.target.value }
                      })}
                      className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-500">—</span>
                    <input
                      type="time"
                      value={formData.workingHours.end}
                      onChange={(e) => setFormData({
                        ...formData, 
                        workingHours: { ...formData.workingHours, end: e.target.value }
                      })}
                      className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Рабочие дни
                  </label>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {[
                      { key: 'MONDAY', label: 'Пн' },
                      { key: 'TUESDAY', label: 'Вт' },
                      { key: 'WEDNESDAY', label: 'Ср' },
                      { key: 'THURSDAY', label: 'Чт' },
                      { key: 'FRIDAY', label: 'Пт' },
                      { key: 'SATURDAY', label: 'Сб' },
                      { key: 'SUNDAY', label: 'Вс' }
                    ].map(day => (
                      <label key={day.key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.workingDays.includes(day.key)}
                          onChange={(e) => {
                            const newDays = e.target.checked
                              ? [...formData.workingDays, day.key]
                              : formData.workingDays.filter(d => d !== day.key);
                            setFormData({...formData, workingDays: newDays});
                          }}
                          className="mr-1"
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Секция помещений */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-md font-medium text-gray-700">Помещения</h4>
                  <Button
                    type="button"
                    onClick={addRoom}
                    size="sm"
                    variant="outline"
                  >
                    + Добавить помещение
                  </Button>
                </div>
                
                {rooms.map((room, index) => (
                  <div key={index} className="border border-gray-200 rounded p-3 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Помещение {index + 1}</span>
                      <Button
                        type="button"
                        onClick={() => removeRoom(index)}
                        size="sm"
                        variant="destructive"
                      >
                        Удалить
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Название помещения"
                        value={room.name}
                        onChange={(e) => updateRoom(index, 'name', e.target.value)}
                        className="p-2 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Площадь (м²)"
                        value={room.area || ''}
                        onChange={(e) => updateRoom(index, 'area', parseFloat(e.target.value) || 0)}
                        className="p-2 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Описание"
                        value={room.description}
                        onChange={(e) => updateRoom(index, 'description', e.target.value)}
                        className="p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setFormData({ 
                      name: '', 
                      address: '', 
                      managerId: '',
                      workingHours: { start: '08:00', end: '20:00' },
                      workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
                      timezone: ''
                    });
                    setRooms([]);
                  }}
                  variant="outline"
                >
                  Отмена
                </Button>
                <Button type="submit">
                  Создать объект
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Детальная информация об объекте */}
      {selectedObject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">{selectedObject.name}</h2>
              <button
                onClick={() => setSelectedObject(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold mb-3">Информация об объекте</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Адрес:</span> {selectedObject.address}</div>
                  <div><span className="font-medium">Менеджер:</span> {selectedObject.manager?.name || 'Не назначен'}</div>
                </div>
              </div>
              
              <div>
                <RoomManager 
                  objectId={selectedObject.id} 
                  objectName={selectedObject.name} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования объекта */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Редактировать объект</h2>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Основная информация */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Название объекта *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Менеджер
                  </label>
                  <select
                    value={formData.managerId}
                    onChange={(e) => setFormData({...formData, managerId: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    <option value="">Выберите менеджера</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Адрес *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Город, улица, дом"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  При изменении адреса часовой пояс обновится автоматически
                </p>
              </div>

              {/* Рабочие часы */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Начало работы
                  </label>
                  <input
                    type="time"
                    value={formData.workingHours.start}
                    onChange={(e) => setFormData({
                      ...formData, 
                      workingHours: {...formData.workingHours, start: e.target.value}
                    })}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Окончание работы
                  </label>
                  <input
                    type="time"
                    value={formData.workingHours.end}
                    onChange={(e) => setFormData({
                      ...formData, 
                      workingHours: {...formData.workingHours, end: e.target.value}
                    })}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Рабочие дни */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Рабочие дни
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'MONDAY', label: 'Пн' },
                    { value: 'TUESDAY', label: 'Вт' },
                    { value: 'WEDNESDAY', label: 'Ср' },
                    { value: 'THURSDAY', label: 'Чт' },
                    { value: 'FRIDAY', label: 'Пт' },
                    { value: 'SATURDAY', label: 'Сб' },
                    { value: 'SUNDAY', label: 'Вс' }
                  ].map((day) => (
                    <label key={day.value} className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        checked={formData.workingDays.includes(day.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              workingDays: [...formData.workingDays, day.value]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              workingDays: formData.workingDays.filter(d => d !== day.value)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Часовой пояс */}
              {formData.timezone && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Часовой пояс
                  </label>
                  <input
                    type="text"
                    value={formData.timezone}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded bg-gray-50"
                    placeholder="Определяется автоматически"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingObject(null);
                    setFormData({ 
                      name: '', 
                      address: '', 
                      managerId: '',
                      workingHours: { start: '08:00', end: '20:00' },
                      workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
                      timezone: ''
                    });
                  }}
                  variant="outline"
                >
                  Отмена
                </Button>
                <Button type="submit">
                  Сохранить изменения
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно создания объекта с техкартами */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-7xl max-h-[95vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Создание нового объекта</h3>
              <Button
                onClick={() => setIsCreateModalOpen(false)}
                variant="outline"
                size="sm"
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-visible">
              <CreateObjectForm
                onSuccess={() => {
                  setIsCreateModalOpen(false);
                  fetchObjects(); // Обновляем список объектов
                }}
                onCancel={() => setIsCreateModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Новое модальное окно редактирования объекта */}
      <ObjectEditModal
        isOpen={isNewEditModalOpen}
        onClose={() => setIsNewEditModalOpen(false)}
        objectId={editingObjectId}
        onUpdate={() => {
          fetchObjects();
          setIsNewEditModalOpen(false);
        }}
      />
    </div>
  );
}
