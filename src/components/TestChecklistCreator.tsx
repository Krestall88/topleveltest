'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, MapPin, TestTube } from 'lucide-react';

interface TestChecklistCreatorProps {
  objects: Array<{
    id: string;
    name: string;
    address: string;
    timezone?: string;
  }>;
  onChecklistCreated?: () => void;
}

export default function TestChecklistCreator({ objects, onChecklistCreated }: TestChecklistCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    objectId: '',
    roomId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    timezone: 'Europe/Moscow',
    taskDuration: 60, // минуты
    overdueTesting: false
  });
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);

  const fetchRooms = async (objectId: string) => {
    if (!objectId) {
      setRooms([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/rooms?objectId=${objectId}`);
      if (response.ok) {
        const roomsData = await response.json();
        setRooms(roomsData);
      }
    } catch (error) {
      console.error('Ошибка загрузки помещений:', error);
    }
  };

  const handleObjectChange = (objectId: string) => {
    setFormData(prev => ({ ...prev, objectId, roomId: '' }));
    fetchRooms(objectId);
    
    // Автоматически устанавливаем часовой пояс объекта
    const selectedObject = objects.find(obj => obj.id === objectId);
    if (selectedObject?.timezone) {
      setFormData(prev => ({ ...prev, timezone: selectedObject.timezone! }));
    }
  };

  const handleCreateTestChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.objectId) {
      alert('Выберите объект');
      return;
    }

    setIsLoading(true);
    
    try {
      // Создаем дату и время в указанном часовом поясе
      const dateTime = new Date(`${formData.date}T${formData.time}:00`);
      
      // Если тестируем просрочки, создаем задачи в прошлом
      if (formData.overdueTesting) {
        dateTime.setHours(dateTime.getHours() - 2); // 2 часа назад
      }

      const response = await fetch('/api/checklists/test-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectId: formData.objectId,
          roomId: formData.roomId || null,
          date: formData.date,
          scheduledStart: dateTime.toISOString(),
          scheduledEnd: new Date(dateTime.getTime() + formData.taskDuration * 60000).toISOString(),
          timezone: formData.timezone,
          testMode: true,
          overdueTesting: formData.overdueTesting
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка создания тестового чек-листа');
      }

      const result = await response.json();
      
      alert(`✅ Тестовый чек-лист создан!\n\nID: ${result.id}\nЗадач: ${result.tasksCount}\nВремя: ${formData.time} (${formData.timezone})\n${formData.overdueTesting ? '⚠️ Режим тестирования просрочек' : ''}`);
      
      setIsOpen(false);
      setFormData({
        objectId: '',
        roomId: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        timezone: 'Europe/Moscow',
        taskDuration: 60,
        overdueTesting: false
      });
      setRooms([]);
      
      if (onChecklistCreated) {
        onChecklistCreated();
      }
      
    } catch (error) {
      console.error('Ошибка создания тестового чек-листа:', error);
      alert(error instanceof Error ? error.message : 'Не удалось создать тестовый чек-лист');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="mb-4"
      >
        <TestTube className="h-4 w-4 mr-2" />
        Создать тестовый чек-лист
      </Button>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Создание тестового чек-листа
        </CardTitle>
        <p className="text-sm text-gray-600">
          Создайте чек-лист с настраиваемым временем для тестирования просрочек и уведомлений
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateTestChecklist} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                Объект
              </label>
              <select
                value={formData.objectId}
                onChange={(e) => handleObjectChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Выберите объект</option>
                {objects.map((object) => (
                  <option key={object.id} value={object.id}>
                    {object.name} ({object.address})
                  </option>
                ))}
              </select>
            </div>

            {rooms.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Помещение (опционально)</label>
                <select
                  value={formData.roomId}
                  onChange={(e) => setFormData(prev => ({ ...prev, roomId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Все помещения</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Дата
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Время начала
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Часовой пояс</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Europe/Moscow">Москва (UTC+3)</option>
                <option value="Europe/Samara">Самара (UTC+4)</option>
                <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
                <option value="Asia/Novosibirsk">Новосибирск (UTC+7)</option>
                <option value="Asia/Vladivostok">Владивосток (UTC+10)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Длительность задач (мин)</label>
              <input
                type="number"
                min="15"
                max="480"
                value={formData.taskDuration}
                onChange={(e) => setFormData(prev => ({ ...prev, taskDuration: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="overdueTesting"
              checked={formData.overdueTesting}
              onChange={(e) => setFormData(prev => ({ ...prev, overdueTesting: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="overdueTesting" className="text-sm font-medium">
              🔴 Режим тестирования просрочек (создать задачи в прошлом)
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Создание...' : 'Создать тестовый чек-лист'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
