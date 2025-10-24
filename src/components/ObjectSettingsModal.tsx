'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Camera, Clock, Calendar, Zap } from 'lucide-react';

interface ObjectSettings {
  id: string;
  name: string;
  requirePhotoForCompletion: boolean;
  requireCommentForCompletion: boolean;
  completionRequirements?: {
    photo: boolean;
    comment: boolean;
    minPhotos?: number;
    photoDescription?: string;
    commentDescription?: string;
  };
  workingHours?: {
    start: string;
    end: string;
  };
  workingDays?: string[];
  autoChecklistEnabled: boolean;
  timezone?: string;
}

interface ObjectSettingsModalProps {
  objectId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Понедельник' },
  { value: 'TUESDAY', label: 'Вторник' },
  { value: 'WEDNESDAY', label: 'Среда' },
  { value: 'THURSDAY', label: 'Четверг' },
  { value: 'FRIDAY', label: 'Пятница' },
  { value: 'SATURDAY', label: 'Суббота' },
  { value: 'SUNDAY', label: 'Воскресенье' },
];

export default function ObjectSettingsModal({ 
  objectId, 
  isOpen, 
  onClose, 
  onUpdate 
}: ObjectSettingsModalProps) {
  const [settings, setSettings] = useState<ObjectSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && objectId) {
      fetchSettings();
    }
  }, [isOpen, objectId]);

  const fetchSettings = async () => {
    if (!objectId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/objects/${objectId}/settings`);
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.object);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Ошибка при загрузке настроек');
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек:', error);
      setError('Ошибка при загрузке настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!objectId || !settings) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/objects/${objectId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirePhotoForCompletion: settings.requirePhotoForCompletion,
          requireCommentForCompletion: settings.requireCommentForCompletion,
          completionRequirements: settings.completionRequirements,
          workingHours: settings.workingHours,
          workingDays: settings.workingDays,
          autoChecklistEnabled: settings.autoChecklistEnabled,
        }),
      });

      if (response.ok) {
        onUpdate();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Ошибка при сохранении настроек');
      }
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      setError('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkingDayToggle = (day: string) => {
    if (!settings) return;

    const currentDays = settings.workingDays || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];

    setSettings({
      ...settings,
      workingDays: newDays
    });
  };

  const handleWorkingHoursChange = (field: 'start' | 'end', value: string) => {
    if (!settings) return;

    setSettings({
      ...settings,
      workingHours: {
        ...settings.workingHours,
        [field]: value
      } as { start: string; end: string }
    });
  };

  const handleClose = () => {
    setSettings(null);
    setError(null);
    onClose();
  };

  if (!settings && !loading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Настройки объекта</span>
          </DialogTitle>
          {settings && (
            <div className="text-sm text-gray-600">{settings.name}</div>
          )}
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">Загрузка настроек...</div>
        ) : settings ? (
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Требования к завершению */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Camera className="w-4 h-4" />
                  <span>Требования к завершению чек-листов</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Обязательность фото */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="require-photo" className="text-sm font-medium">
                      Обязательное фото для закрытия чек-листов
                    </Label>
                    <div className="text-xs text-gray-600 mt-1">
                      Менеджеры не смогут завершить чек-листы без загрузки фотографий
                    </div>
                  </div>
                  <Switch
                    id="require-photo"
                    checked={settings.requirePhotoForCompletion}
                    onCheckedChange={(checked: boolean) => 
                      setSettings({ ...settings, requirePhotoForCompletion: checked })
                    }
                  />
                </div>

                {/* Обязательность комментария */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="require-comment" className="text-sm font-medium">
                      Обязательный комментарий для закрытия чек-листов
                    </Label>
                    <div className="text-xs text-gray-600 mt-1">
                      Менеджеры должны оставить комментарий при завершении чек-листа
                    </div>
                  </div>
                  <Switch
                    id="require-comment"
                    checked={settings.requireCommentForCompletion}
                    onCheckedChange={(checked: boolean) => 
                      setSettings({ ...settings, requireCommentForCompletion: checked })
                    }
                  />
                </div>

                {/* Детальные требования */}
                {(settings.requirePhotoForCompletion || settings.requireCommentForCompletion) && (
                  <div className="border-t pt-4 space-y-3">
                    <Label className="text-sm font-medium">Детальные настройки</Label>
                    
                    {settings.requirePhotoForCompletion && (
                      <div className="space-y-2">
                        <Label htmlFor="min-photos" className="text-xs">Минимальное количество фото</Label>
                        <Input
                          id="min-photos"
                          type="number"
                          min="1"
                          max="10"
                          value={settings.completionRequirements?.minPhotos || 1}
                          onChange={(e) => setSettings({
                            ...settings,
                            completionRequirements: {
                              ...settings.completionRequirements,
                              photo: settings.requirePhotoForCompletion,
                              comment: settings.requireCommentForCompletion,
                              minPhotos: parseInt(e.target.value) || 1
                            }
                          })}
                          className="w-20"
                        />
                      </div>
                    )}

                    {settings.requireCommentForCompletion && (
                      <div className="space-y-2">
                        <Label htmlFor="comment-hint" className="text-xs">Подсказка для комментария</Label>
                        <Input
                          id="comment-hint"
                          placeholder="Например: Опишите качество уборки..."
                          value={settings.completionRequirements?.commentDescription || ''}
                          onChange={(e) => setSettings({
                            ...settings,
                            completionRequirements: {
                              ...settings.completionRequirements,
                              photo: settings.requirePhotoForCompletion,
                              comment: settings.requireCommentForCompletion,
                              commentDescription: e.target.value
                            }
                          })}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Рабочие часы */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Clock className="w-4 h-4" />
                  <span>Рабочие часы</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-time" className="text-sm">Начало работы</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={settings.workingHours?.start || '08:00'}
                      onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time" className="text-sm">Окончание работы</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={settings.workingHours?.end || '20:00'}
                      onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Рабочие дни */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Calendar className="w-4 h-4" />
                  <span>Рабочие дни</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={day.value}
                        checked={settings.workingDays?.includes(day.value) || false}
                        onChange={() => handleWorkingDayToggle(day.value)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label htmlFor={day.value} className="text-sm">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Настройки планирования */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Zap className="w-4 h-4" />
                  <span>Автоматизация</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-checklist" className="text-sm font-medium">
                      Автоматическое создание чек-листов
                    </Label>
                    <div className="text-xs text-gray-600 mt-1">
                      Система будет автоматически создавать чек-листы в рабочие дни
                    </div>
                  </div>
                  <Switch
                    id="auto-checklist"
                    checked={settings.autoChecklistEnabled}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, autoChecklistEnabled: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Информация о часовом поясе */}
            {settings.timezone && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-600">
                    <strong>Часовой пояс:</strong> {settings.timezone}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Кнопки действий */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={saving}
              >
                Отмена
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Сохранение...' : 'Сохранить настройки'}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
