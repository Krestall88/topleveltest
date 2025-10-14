'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, User } from 'lucide-react';

interface Room {
  id?: string;
  name: string;
  description: string;
  area: number;
  techCards: TechCard[];
}

interface TechCard {
  id?: string;
  name: string;
  workType: string;
  frequency: string;
  description: string;
}

interface ObjectTemplate {
  name: string;
  address: string;
  managerId?: string;
  rooms: Room[];
}

interface Manager {
  id: string;
  name: string;
  email: string;
}

interface ObjectTemplateFormProps {
  onSave: (template: ObjectTemplate) => void;
  initialData?: ObjectTemplate;
}

export default function ObjectTemplateForm({ onSave, initialData }: ObjectTemplateFormProps) {
  const [template, setTemplate] = useState<ObjectTemplate>(
    initialData || {
      name: '',
      address: '',
      managerId: '',
      rooms: []
    }
  );
  const [managers, setManagers] = useState<Manager[]>([]);

  useEffect(() => {
    // Загружаем список менеджеров
    const fetchManagers = async () => {
      try {
        const response = await fetch('/api/managers');
        if (response.ok) {
          const data = await response.json();
          setManagers(data);
        }
      } catch (error) {
        console.error('Ошибка загрузки менеджеров:', error);
      }
    };

    fetchManagers();
  }, []);

  const addRoom = () => {
    setTemplate(prev => ({
      ...prev,
      rooms: [...prev.rooms, {
        name: '',
        description: '',
        area: 0,
        techCards: []
      }]
    }));
  };

  const removeRoom = (roomIndex: number) => {
    setTemplate(prev => ({
      ...prev,
      rooms: prev.rooms.filter((_, index) => index !== roomIndex)
    }));
  };

  const updateRoom = (roomIndex: number, field: keyof Room, value: any) => {
    setTemplate(prev => ({
      ...prev,
      rooms: prev.rooms.map((room, index) => 
        index === roomIndex ? { ...room, [field]: value } : room
      )
    }));
  };

  const addTechCard = (roomIndex: number) => {
    setTemplate(prev => ({
      ...prev,
      rooms: prev.rooms.map((room, index) => 
        index === roomIndex 
          ? { 
              ...room, 
              techCards: [...room.techCards, {
                name: '',
                workType: '',
                frequency: '',
                description: ''
              }]
            }
          : room
      )
    }));
  };

  const removeTechCard = (roomIndex: number, techCardIndex: number) => {
    setTemplate(prev => ({
      ...prev,
      rooms: prev.rooms.map((room, index) => 
        index === roomIndex 
          ? { 
              ...room, 
              techCards: room.techCards.filter((_, tcIndex) => tcIndex !== techCardIndex)
            }
          : room
      )
    }));
  };

  const updateTechCard = (roomIndex: number, techCardIndex: number, field: keyof TechCard, value: string) => {
    setTemplate(prev => ({
      ...prev,
      rooms: prev.rooms.map((room, index) => 
        index === roomIndex 
          ? { 
              ...room, 
              techCards: room.techCards.map((tc, tcIndex) => 
                tcIndex === techCardIndex ? { ...tc, [field]: value } : tc
              )
            }
          : room
      )
    }));
  };

  const handleSave = () => {
    onSave(template);
  };

  return (
    <div className="space-y-6">
      {/* Основная информация об объекте */}
      <Card>
        <CardHeader>
          <CardTitle>🏢 Основная информация об объекте</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="objectName">Название объекта</Label>
            <Input
              id="objectName"
              value={template.name}
              onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Например: Самарский булочно-кондитерский комбинат"
            />
          </div>
          <div>
            <Label htmlFor="objectAddress">Адрес</Label>
            <Input
              id="objectAddress"
              value={template.address}
              onChange={(e) => setTemplate(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Например: г. Самара, ул. Промышленная, 15"
            />
          </div>
          <div>
            <Label htmlFor="managerId">Менеджер объекта</Label>
            <select
              id="managerId"
              value={template.managerId || ''}
              onChange={(e) => setTemplate(prev => ({ ...prev, managerId: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Выберите менеджера</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name} ({manager.email})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Помещения */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>🏠 Помещения объекта</CardTitle>
          <Button onClick={addRoom} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Добавить помещение
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {template.rooms.map((room, roomIndex) => (
            <Card key={roomIndex} className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg">Помещение #{roomIndex + 1}</CardTitle>
                <Button 
                  onClick={() => removeRoom(roomIndex)} 
                  variant="destructive" 
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Название помещения</Label>
                    <Input
                      value={room.name}
                      onChange={(e) => updateRoom(roomIndex, 'name', e.target.value)}
                      placeholder="Например: Силосное отделение"
                    />
                  </div>
                  <div>
                    <Label>Площадь (м²)</Label>
                    <Input
                      type="number"
                      value={room.area}
                      onChange={(e) => updateRoom(roomIndex, 'area', parseFloat(e.target.value) || 0)}
                      placeholder="473.7"
                    />
                  </div>
                </div>
                <div>
                  <Label>Описание помещения</Label>
                  <Textarea
                    value={room.description}
                    onChange={(e) => updateRoom(roomIndex, 'description', e.target.value)}
                    placeholder="Краткое описание назначения помещения"
                    rows={2}
                  />
                </div>

                {/* Технические карты для помещения */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">📋 Технические карты</h4>
                    <Button 
                      onClick={() => addTechCard(roomIndex)} 
                      variant="outline" 
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить техкарту
                    </Button>
                  </div>
                  
                  {room.techCards.map((techCard, techCardIndex) => (
                    <Card key={techCardIndex} className="mb-3 bg-gray-50">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <h5 className="font-medium text-sm">Техкарта #{techCardIndex + 1}</h5>
                        <Button 
                          onClick={() => removeTechCard(roomIndex, techCardIndex)} 
                          variant="ghost" 
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Название работ</Label>
                            <Input
                              value={techCard.name}
                              onChange={(e) => updateTechCard(roomIndex, techCardIndex, 'name', e.target.value)}
                              placeholder="Уборка силосного отделения"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Тип работ</Label>
                            <Input
                              value={techCard.workType}
                              onChange={(e) => updateTechCard(roomIndex, techCardIndex, 'workType', e.target.value)}
                              placeholder="Комплексная уборка"
                              className="text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Периодичность</Label>
                          <Input
                            value={techCard.frequency}
                            onChange={(e) => updateTechCard(roomIndex, techCardIndex, 'frequency', e.target.value)}
                            placeholder="Ежедневно"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Детальное описание работ</Label>
                          <Textarea
                            value={techCard.description}
                            onChange={(e) => updateTechCard(roomIndex, techCardIndex, 'description', e.target.value)}
                            placeholder="Подробное описание всех операций и их периодичности..."
                            rows={4}
                            className="text-sm"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {template.rooms.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Помещения не добавлены</p>
              <p className="text-sm">Нажмите "Добавить помещение" чтобы начать</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Кнопка сохранения */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" className="min-w-32">
          <Save className="w-4 h-4 mr-2" />
          Сохранить объект
        </Button>
      </div>
    </div>
  );
}
