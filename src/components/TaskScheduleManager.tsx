'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Calendar, 
  Repeat, 
  Bell, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Edit,
  Save,
  X
} from 'lucide-react';

interface TaskSchedule {
  id: string;
  name: string;
  description: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  timeSlots: Array<{
    startTime: string;
    endTime: string;
    days?: number[]; // 0-6 (воскресенье-суббота)
  }>;
  reminderSettings: {
    enabled: boolean;
    beforeMinutes: number[];
    overdueMinutes: number[];
  };
  isActive: boolean;
  objectIds: string[];
  roomIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface TaskScheduleManagerProps {
  isOpen: boolean;
  onClose: () => void;
  objectId?: string;
  roomId?: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Ежедневно' },
  { value: 'WEEKLY', label: 'Еженедельно' },
  { value: 'MONTHLY', label: 'Ежемесячно' },
  { value: 'CUSTOM', label: 'Настраиваемо' }
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Воскресенье' },
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' }
];

const REMINDER_PRESETS = [
  { value: 15, label: '15 минут' },
  { value: 30, label: '30 минут' },
  { value: 60, label: '1 час' },
  { value: 120, label: '2 часа' },
  { value: 240, label: '4 часа' },
  { value: 480, label: '8 часов' },
  { value: 1440, label: '1 день' }
];

export default function TaskScheduleManager({ 
  isOpen, 
  onClose, 
  objectId, 
  roomId 
}: TaskScheduleManagerProps) {
  const [schedules, setSchedules] = useState<TaskSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<TaskSchedule | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: 'DAILY' as TaskSchedule['frequency'],
    timeSlots: [{
      startTime: '09:00',
      endTime: '17:00',
      days: [1, 2, 3, 4, 5] as number[] // Рабочие дни по умолчанию
    }],
    reminderSettings: {
      enabled: true,
      beforeMinutes: [30, 60],
      overdueMinutes: [15, 60, 240]
    },
    isActive: true
  });

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (objectId) params.append('objectId', objectId);
      if (roomId) params.append('roomId', roomId);

      const response = await fetch(`/api/task-schedules?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки расписаний:', error);
      setError('Не удалось загрузить расписания');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && schedules.length === 0) {
      fetchSchedules();
    }
  }, [isOpen, objectId, roomId]);

  const handleSaveSchedule = async () => {
    try {
      setError(null);
      
      const scheduleData = {
        ...formData,
        objectIds: objectId ? [objectId] : [],
        roomIds: roomId ? [roomId] : []
      };

      const url = editingSchedule 
        ? `/api/task-schedules/${editingSchedule.id}`
        : '/api/task-schedules';
      
      const method = editingSchedule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка сохранения');
      }

      await fetchSchedules();
      resetForm();
    } catch (error) {
      console.error('Ошибка сохранения расписания:', error);
      setError(error instanceof Error ? error.message : 'Ошибка сохранения');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Удалить это расписание?')) return;

    try {
      const response = await fetch(`/api/task-schedules/${scheduleId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления');
      }

      await fetchSchedules();
    } catch (error) {
      console.error('Ошибка удаления расписания:', error);
      setError('Не удалось удалить расписание');
    }
  };

  const handleToggleActive = async (scheduleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/task-schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });

      if (!response.ok) {
        throw new Error('Ошибка обновления');
      }

      await fetchSchedules();
    } catch (error) {
      console.error('Ошибка обновления расписания:', error);
      setError('Не удалось обновить расписание');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      frequency: 'DAILY',
      timeSlots: [{
        startTime: '09:00',
        endTime: '17:00',
        days: [1, 2, 3, 4, 5] as number[]
      }],
      reminderSettings: {
        enabled: true,
        beforeMinutes: [30, 60],
        overdueMinutes: [15, 60, 240]
      },
      isActive: true
    });
    setEditingSchedule(null);
    setShowCreateForm(false);
    setError(null);
  };

  const startEdit = (schedule: TaskSchedule) => {
    setFormData({
      name: schedule.name,
      description: schedule.description,
      frequency: schedule.frequency,
      timeSlots: schedule.timeSlots,
      reminderSettings: schedule.reminderSettings,
      isActive: schedule.isActive
    });
    setEditingSchedule(schedule);
    setShowCreateForm(true);
  };

  const addTimeSlot = () => {
    setFormData({
      ...formData,
      timeSlots: [
        ...formData.timeSlots,
        {
          startTime: '09:00',
          endTime: '17:00',
          days: [1, 2, 3, 4, 5] as number[]
        }
      ]
    });
  };

  const removeTimeSlot = (index: number) => {
    setFormData({
      ...formData,
      timeSlots: formData.timeSlots.filter((_, i) => i !== index)
    });
  };

  const updateTimeSlot = (index: number, field: string, value: any) => {
    const newTimeSlots = [...formData.timeSlots];
    newTimeSlots[index] = { ...newTimeSlots[index], [field]: value };
    setFormData({ ...formData, timeSlots: newTimeSlots });
  };

  const toggleDay = (slotIndex: number, day: number) => {
    const newTimeSlots = [...formData.timeSlots];
    const currentDays = newTimeSlots[slotIndex].days || [];
    
    if (currentDays.includes(day)) {
      newTimeSlots[slotIndex].days = currentDays.filter(d => d !== day);
    } else {
      newTimeSlots[slotIndex].days = [...currentDays, day].sort();
    }
    
    setFormData({ ...formData, timeSlots: newTimeSlots });
  };

  const getFrequencyLabel = (frequency: string) => {
    return FREQUENCY_OPTIONS.find(f => f.value === frequency)?.label || frequency;
  };

  const formatTimeSlots = (timeSlots: TaskSchedule['timeSlots']) => {
    return timeSlots.map(slot => {
      const days = slot.days?.map(d => DAYS_OF_WEEK[d]?.label.slice(0, 2)).join(', ') || 'Все дни';
      return `${slot.startTime}-${slot.endTime} (${days})`;
    }).join('; ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Управление расписанием задач</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Кнопка создания */}
          {!showCreateForm && (
            <Button
              onClick={() => setShowCreateForm(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать новое расписание
            </Button>
          )}

          {/* Форма создания/редактирования */}
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingSchedule ? 'Редактировать расписание' : 'Новое расписание'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Основная информация */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Название</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Например: Ежедневная уборка офиса"
                    />
                  </div>
                  <div>
                    <Label htmlFor="frequency">Периодичность</Label>
                    <Select
                      value={formData.frequency}
                      onValueChange={(value) => setFormData({ ...formData, frequency: value as TaskSchedule['frequency'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Подробное описание задач..."
                    rows={3}
                  />
                </div>

                {/* Временные слоты */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Временные слоты</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTimeSlot}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Добавить слот
                    </Button>
                  </div>

                  {formData.timeSlots.map((slot, index) => (
                    <div key={index} className="border rounded-lg p-4 mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Слот {index + 1}</h4>
                        {formData.timeSlots.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeTimeSlot(index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <Label>Время начала</Label>
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateTimeSlot(index, 'startTime', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Время окончания</Label>
                          <Input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateTimeSlot(index, 'endTime', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="mb-2 block">Дни недели</Label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map(day => (
                            <Button
                              key={day.value}
                              type="button"
                              variant={slot.days?.includes(day.value) ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleDay(index, day.value)}
                            >
                              {day.label.slice(0, 2)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Настройки уведомлений */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label>Уведомления</Label>
                    <Switch
                      checked={formData.reminderSettings.enabled}
                      onCheckedChange={(enabled) => 
                        setFormData({
                          ...formData,
                          reminderSettings: { ...formData.reminderSettings, enabled }
                        })
                      }
                    />
                  </div>

                  {formData.reminderSettings.enabled && (
                    <div className="space-y-3">
                      <div>
                        <Label className="mb-2 block">Напоминания до начала</Label>
                        <div className="flex flex-wrap gap-2">
                          {REMINDER_PRESETS.map(preset => (
                            <Button
                              key={`before-${preset.value}`}
                              type="button"
                              variant={formData.reminderSettings.beforeMinutes.includes(preset.value) ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                const current = formData.reminderSettings.beforeMinutes;
                                const newBefore = current.includes(preset.value)
                                  ? current.filter(v => v !== preset.value)
                                  : [...current, preset.value].sort((a, b) => a - b);
                                
                                setFormData({
                                  ...formData,
                                  reminderSettings: {
                                    ...formData.reminderSettings,
                                    beforeMinutes: newBefore
                                  }
                                });
                              }}
                            >
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="mb-2 block">Напоминания о просрочке</Label>
                        <div className="flex flex-wrap gap-2">
                          {REMINDER_PRESETS.map(preset => (
                            <Button
                              key={`overdue-${preset.value}`}
                              type="button"
                              variant={formData.reminderSettings.overdueMinutes.includes(preset.value) ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => {
                                const current = formData.reminderSettings.overdueMinutes;
                                const newOverdue = current.includes(preset.value)
                                  ? current.filter(v => v !== preset.value)
                                  : [...current, preset.value].sort((a, b) => a - b);
                                
                                setFormData({
                                  ...formData,
                                  reminderSettings: {
                                    ...formData.reminderSettings,
                                    overdueMinutes: newOverdue
                                  }
                                });
                              }}
                            >
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Кнопки действий */}
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Отмена
                  </Button>
                  <Button
                    onClick={handleSaveSchedule}
                    disabled={!formData.name.trim()}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingSchedule ? 'Обновить' : 'Создать'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Список существующих расписаний */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Существующие расписания</h3>
            
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Загрузка расписаний...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Расписания не созданы</p>
              </div>
            ) : (
              schedules.map(schedule => (
                <Card key={schedule.id} className={`${!schedule.isActive ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium">{schedule.name}</h4>
                          <Badge variant={schedule.isActive ? "default" : "secondary"}>
                            {schedule.isActive ? 'Активно' : 'Неактивно'}
                          </Badge>
                          <Badge variant="outline">
                            {getFrequencyLabel(schedule.frequency)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{schedule.description}</p>
                        
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {formatTimeSlots(schedule.timeSlots)}
                          </div>
                          {schedule.reminderSettings.enabled && (
                            <div>
                              <Bell className="w-3 h-3 inline mr-1" />
                              Уведомления: до начала ({schedule.reminderSettings.beforeMinutes.join(', ')} мин), 
                              при просрочке ({schedule.reminderSettings.overdueMinutes.join(', ')} мин)
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Switch
                          checked={schedule.isActive}
                          onCheckedChange={(checked) => handleToggleActive(schedule.id, checked)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(schedule)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
