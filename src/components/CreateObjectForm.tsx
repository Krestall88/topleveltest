'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface TechCard {
  id: string;
  name: string;
  description: string;
  frequency: string;
  workType: string;
  period: string;
  seasonality: string;
  notes: string;
}

interface Room {
  id: string;
  name: string;
  area: number;
  description: string;
  zoneName: string;
  roomGroupName: string;
  techCards: TechCard[];
}

interface Manager {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface CreateObjectFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const WORK_TYPES = [
  'Влажная уборка',
  'Сухая уборка',
  'Мойка поверхностей',
  'Обеспыливание',
  'Дезинфекция',
  'Уборка мусора',
  'Уход за мебелью',
  'Мойка окон',
  'Санитарная обработка',
  'Специальная обработка',
  'Общая уборка'
];

const FREQUENCIES = [
  'Ежедневно',
  'Два раза в день',
  'Еженедельно',
  'Ежемесячно',
  'Ежеквартально',
  'Два раза в год',
  'По мере необходимости',
  'По графику'
];

const PERIODS = [
  'Ежедневно',
  'Два раза в день',
  'Еженедельно',
  'Ежемесячно',
  'Ежеквартально',
  'Два раза в год',
  'По мере необходимости',
  'По графику'
];

const SEASONALITY_OPTIONS = [
  'Общий',
  'Зимний период',
  'Летний период'
];

const WORKING_DAYS = [
  { id: 'MONDAY', label: 'Понедельник' },
  { id: 'TUESDAY', label: 'Вторник' },
  { id: 'WEDNESDAY', label: 'Среда' },
  { id: 'THURSDAY', label: 'Четверг' },
  { id: 'FRIDAY', label: 'Пятница' },
  { id: 'SATURDAY', label: 'Суббота' },
  { id: 'SUNDAY', label: 'Воскресенье' }
];

export default function CreateObjectForm({ onSuccess, onCancel }: CreateObjectFormProps) {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  
  // Основные данные объекта
  const [objectName, setObjectName] = useState('');
  const [objectAddress, setObjectAddress] = useState('');
  const [objectDescription, setObjectDescription] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  
  // Настройки работы
  const [workingHours, setWorkingHours] = useState({ start: '08:00', end: '18:00' });
  const [workingDays, setWorkingDays] = useState<string[]>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
  const [autoChecklistEnabled, setAutoChecklistEnabled] = useState(true);
  const [requirePhotoForCompletion, setRequirePhotoForCompletion] = useState(false);
  
  // Помещения и техкарты
  const [rooms, setRooms] = useState<Room[]>([]);

  // Загрузка менеджеров
  useEffect(() => {
    loadManagers();
  }, []);

  const loadManagers = async () => {
    try {
      const response = await fetch('/api/users?role=MANAGER', {
        credentials: 'include' // Включаем cookies
      });

      if (response.ok) {
        const data = await response.json();
        setManagers(data || []);
      } else {
        console.error('Ошибка загрузки менеджеров:', response.status);
      }
    } catch (error) {
      console.error('Ошибка загрузки менеджеров:', error);
    }
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addRoom = () => {
    const newRoom: Room = {
      id: generateId(),
      name: '',
      area: 0,
      description: '',
      zoneName: '',
      roomGroupName: '',
      techCards: []
    };
    setRooms([...rooms, newRoom]);
  };

  const updateRoom = (roomId: string, field: keyof Room, value: any) => {
    setRooms(rooms.map(room => 
      room.id === roomId ? { ...room, [field]: value } : room
    ));
  };

  const removeRoom = (roomId: string) => {
    setRooms(rooms.filter(room => room.id !== roomId));
  };

  const addTechCard = (roomId: string) => {
    const newTechCard: TechCard = {
      id: generateId(),
      name: '',
      description: '',
      frequency: 'Ежедневно',
      workType: 'Общая уборка',
      period: 'Ежедневно',
      seasonality: 'Общий',
      notes: ''
    };

    setRooms(rooms.map(room => 
      room.id === roomId 
        ? { ...room, techCards: [...room.techCards, newTechCard] }
        : room
    ));
  };

  const updateTechCard = (roomId: string, techCardId: string, field: keyof TechCard, value: string) => {
    setRooms(rooms.map(room => 
      room.id === roomId 
        ? {
            ...room,
            techCards: room.techCards.map(tc => 
              tc.id === techCardId ? { ...tc, [field]: value } : tc
            )
          }
        : room
    ));
  };

  const removeTechCard = (roomId: string, techCardId: string) => {
    setRooms(rooms.map(room => 
      room.id === roomId 
        ? { ...room, techCards: room.techCards.filter(tc => tc.id !== techCardId) }
        : room
    ));
  };

  const handleWorkingDayChange = (dayId: string, checked: boolean) => {
    if (checked) {
      setWorkingDays([...workingDays, dayId]);
    } else {
      setWorkingDays(workingDays.filter(day => day !== dayId));
    }
  };

  const validateForm = () => {
    // Валидация основной информации
    if (!objectName.trim()) {
      toast.error('Название объекта обязательно');
      return false;
    }
    
    if (objectName.trim().length < 3) {
      toast.error('Название объекта должно содержать минимум 3 символа');
      return false;
    }
    
    if (!objectAddress.trim()) {
      toast.error('Адрес объекта обязателен');
      return false;
    }

    if (objectAddress.trim().length < 5) {
      toast.error('Адрес объекта должен содержать минимум 5 символов');
      return false;
    }

    // Валидация рабочих дней
    if (workingDays.length === 0) {
      toast.error('Необходимо выбрать хотя бы один рабочий день');
      return false;
    }

    // Валидация помещений
    if (rooms.length === 0) {
      toast.error('Необходимо добавить хотя бы одно помещение');
      return false;
    }

    // Проверка уникальности названий помещений
    const roomNames = rooms.map(room => room.name.trim().toLowerCase());
    const uniqueRoomNames = new Set(roomNames);
    if (roomNames.length !== uniqueRoomNames.size) {
      toast.error('Названия помещений должны быть уникальными');
      return false;
    }

    for (const room of rooms) {
      if (!room.name.trim()) {
        toast.error('Все помещения должны иметь название');
        return false;
      }

      if (room.name.trim().length < 2) {
        toast.error('Название помещения должно содержать минимум 2 символа');
        return false;
      }
      
      if (room.area <= 0) {
        toast.error('Площадь помещений должна быть больше 0');
        return false;
      }

      if (room.area > 10000) {
        toast.error('Площадь помещения не может превышать 10,000 м²');
        return false;
      }

      if (!room.zoneName.trim()) {
        toast.error('Все помещения должны иметь название зоны');
        return false;
      }

      if (!room.roomGroupName.trim()) {
        toast.error('Все помещения должны иметь группу помещений');
        return false;
      }

      if (room.techCards.length === 0) {
        toast.error(`Помещение "${room.name}" должно иметь хотя бы одну техкарту`);
        return false;
      }

      // Проверка уникальности названий техкарт в рамках помещения
      const techCardNames = room.techCards.map(tc => tc.name.trim().toLowerCase());
      const uniqueTechCardNames = new Set(techCardNames);
      if (techCardNames.length !== uniqueTechCardNames.size) {
        toast.error(`В помещении "${room.name}" названия техкарт должны быть уникальными`);
        return false;
      }

      for (const techCard of room.techCards) {
        if (!techCard.name.trim()) {
          toast.error(`Все техкарты в помещении "${room.name}" должны иметь название`);
          return false;
        }

        if (techCard.name.trim().length < 3) {
          toast.error(`Название техкарты должно содержать минимум 3 символа`);
          return false;
        }

        if (!techCard.frequency || Number(techCard.frequency) <= 0) {
          toast.error(`Все техкарты должны иметь частоту выполнения больше 0`);
          return false;
        }

        if (!techCard.workType.trim()) {
          toast.error(`Все техкарты должны иметь тип работы`);
          return false;
        }

        if (!techCard.period.trim()) {
          toast.error(`Все техкарты должны иметь период выполнения`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    const createObjectPromise = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/objects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: objectName,
          address: objectAddress,
          description: objectDescription,
          managerId: selectedManagerId || undefined,
          workingHours,
          workingDays,
          autoChecklistEnabled,
          requirePhotoForCompletion,
          rooms: rooms.map(room => ({
            name: room.name,
            area: room.area,
            description: room.description,
            zoneName: room.zoneName,
            roomGroupName: room.roomGroupName,
            techCards: room.techCards.map(tc => ({
              name: tc.name,
              description: tc.description,
              frequency: tc.frequency,
              workType: tc.workType,
              period: tc.period,
              seasonality: tc.seasonality,
              notes: tc.notes
            }))
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании объекта');
      }

      return data;
    };

    try {
      await toast.promise(createObjectPromise(), {
        loading: `Создание объекта "${objectName}"...`,
        success: (data) => {
          if (onSuccess) {
            onSuccess();
          }
          return `Объект "${objectName}" успешно создан!`;
        },
        error: (error) => {
          console.error('Ошибка создания объекта:', error);
          return error instanceof Error ? error.message : 'Ошибка при создании объекта';
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          )}
          <h1 className="text-2xl font-bold">Создание нового объекта</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основная информация */}
        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="objectName">Название объекта *</Label>
                <Input
                  id="objectName"
                  value={objectName}
                  onChange={(e) => setObjectName(e.target.value)}
                  placeholder="Например: ООО «Пример»"
                  required
                />
              </div>
              <div>
                <Label htmlFor="objectAddress">Адрес *</Label>
                <Input
                  id="objectAddress"
                  value={objectAddress}
                  onChange={(e) => setObjectAddress(e.target.value)}
                  placeholder="г. Самара, ул. Примерная, 1"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="objectDescription">Описание</Label>
              <Textarea
                id="objectDescription"
                value={objectDescription}
                onChange={(e) => setObjectDescription(e.target.value)}
                placeholder="Краткое описание объекта"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="managerId">Менеджер</Label>
              <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите менеджера" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name} ({manager.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Настройки работы */}
        <Card>
          <CardHeader>
            <CardTitle>Настройки работы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="workStart">Начало работы</Label>
                <Input
                  id="workStart"
                  type="time"
                  value={workingHours.start}
                  onChange={(e) => setWorkingHours({...workingHours, start: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="workEnd">Окончание работы</Label>
                <Input
                  id="workEnd"
                  type="time"
                  value={workingHours.end}
                  onChange={(e) => setWorkingHours({...workingHours, end: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Рабочие дни</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {WORKING_DAYS.map((day) => (
                  <div key={day.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={day.id}
                      checked={workingDays.includes(day.id)}
                      onCheckedChange={(checked) => handleWorkingDayChange(day.id, checked as boolean)}
                    />
                    <Label htmlFor={day.id} className="text-sm">{day.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoChecklist"
                  checked={autoChecklistEnabled}
                  onCheckedChange={(checked) => setAutoChecklistEnabled(checked === true)}
                />
                <Label htmlFor="autoChecklist">Автоматическое планирование задач</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requirePhoto"
                  checked={requirePhotoForCompletion}
                  onCheckedChange={(checked) => setRequirePhotoForCompletion(checked === true)}
                />
                <Label htmlFor="requirePhoto">Обязательные фото</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Помещения */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Помещения и техкарты</CardTitle>
              <Button type="button" onClick={addRoom} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Добавить помещение
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {rooms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Добавьте хотя бы одно помещение для создания объекта
              </div>
            ) : (
              rooms.map((room, roomIndex) => (
                <Card key={room.id} className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Помещение {roomIndex + 1}
                        {room.name && `: ${room.name}`}
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeRoom(room.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Данные помещения */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Название помещения *</Label>
                        <Input
                          value={room.name}
                          onChange={(e) => updateRoom(room.id, 'name', e.target.value)}
                          placeholder="Например: Офис 1"
                          required
                        />
                      </div>
                      <div>
                        <Label>Площадь (м²) *</Label>
                        <Input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={room.area || ''}
                          onChange={(e) => updateRoom(room.id, 'area', parseFloat(e.target.value) || 0)}
                          placeholder="100"
                          required
                        />
                      </div>
                      <div>
                        <Label>Зона *</Label>
                        <Input
                          value={room.zoneName}
                          onChange={(e) => updateRoom(room.id, 'zoneName', e.target.value)}
                          placeholder="Например: Офисная зона"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Группа помещений *</Label>
                        <Input
                          value={room.roomGroupName}
                          onChange={(e) => updateRoom(room.id, 'roomGroupName', e.target.value)}
                          placeholder="Например: Офисные помещения"
                          required
                        />
                      </div>
                      <div>
                        <Label>Описание</Label>
                        <Input
                          value={room.description}
                          onChange={(e) => updateRoom(room.id, 'description', e.target.value)}
                          placeholder="Дополнительная информация"
                        />
                      </div>
                    </div>

                    {/* Техкарты */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Техкарты</h4>
                        <Button
                          type="button"
                          onClick={() => addTechCard(room.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Добавить техкарту
                        </Button>
                      </div>

                      {room.techCards.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                          Добавьте хотя бы одну техкарту для этого помещения
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {room.techCards.map((techCard, tcIndex) => (
                            <Card key={techCard.id} className="bg-gray-50">
                              <CardContent className="pt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <Badge variant="secondary">
                                    Техкарта {tcIndex + 1}
                                  </Badge>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeTechCard(room.id, techCard.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="md:col-span-2">
                                    <Label>Название техкарты *</Label>
                                    <Input
                                      value={techCard.name}
                                      onChange={(e) => updateTechCard(room.id, techCard.id, 'name', e.target.value)}
                                      placeholder="Например: Влажная уборка пола"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <Label>Тип работ</Label>
                                    <Select
                                      value={techCard.workType}
                                      onValueChange={(value) => updateTechCard(room.id, techCard.id, 'workType', value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="z-[60]">
                                        {WORK_TYPES.map((type) => (
                                          <SelectItem key={type} value={type}>
                                            {type}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label>Периодичность</Label>
                                    <Select
                                      value={techCard.frequency}
                                      onValueChange={(value) => {
                                        updateTechCard(room.id, techCard.id, 'frequency', value);
                                        updateTechCard(room.id, techCard.id, 'period', value);
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="z-[60]">
                                        {FREQUENCIES.map((freq) => (
                                          <SelectItem key={freq} value={freq}>
                                            {freq}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label>Сезонность</Label>
                                    <Select
                                      value={techCard.seasonality}
                                      onValueChange={(value) => updateTechCard(room.id, techCard.id, 'seasonality', value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="z-[60]">
                                        {SEASONALITY_OPTIONS.map((season) => (
                                          <SelectItem key={season} value={season}>
                                            {season}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="md:col-span-2">
                                    <Label>Описание</Label>
                                    <Textarea
                                      value={techCard.description}
                                      onChange={(e) => updateTechCard(room.id, techCard.id, 'description', e.target.value)}
                                      placeholder="Подробное описание работ"
                                      rows={2}
                                    />
                                  </div>

                                  <div className="md:col-span-2">
                                    <Label>Примечания</Label>
                                    <Input
                                      value={techCard.notes}
                                      onChange={(e) => updateTechCard(room.id, techCard.id, 'notes', e.target.value)}
                                      placeholder="Дополнительные примечания"
                                    />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Кнопки управления */}
        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>Создание...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Создать объект
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
