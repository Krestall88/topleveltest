'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Clock, FileText } from 'lucide-react';

interface TechCard {
  id: string;
  name: string;
  description?: string;
  frequency: string;
  estimatedDuration?: number;
  instructions?: string;
  requiredTools?: string[];
  requiredMaterials?: string[];
  safetyNotes?: string;
  qualityStandards?: string;
  createdAt: string;
  updatedAt: string;
  objectId?: string;
}

interface TechCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (techCard: Partial<TechCard>) => void;
  techCard?: TechCard | null;
  objectId?: string;
}

export default function TechCardModal({ 
  isOpen, 
  onClose, 
  onSave, 
  techCard, 
  objectId 
}: TechCardModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: '',
    estimatedDuration: '',
    instructions: '',
    requiredTools: [] as string[],
    requiredMaterials: [] as string[],
    safetyNotes: '',
    qualityStandards: ''
  });

  const [newTool, setNewTool] = useState('');
  const [newMaterial, setNewMaterial] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (techCard) {
      setFormData({
        name: techCard.name || '',
        description: techCard.description || '',
        frequency: techCard.frequency || '',
        estimatedDuration: techCard.estimatedDuration?.toString() || '',
        instructions: techCard.instructions || '',
        requiredTools: techCard.requiredTools || [],
        requiredMaterials: techCard.requiredMaterials || [],
        safetyNotes: techCard.safetyNotes || '',
        qualityStandards: techCard.qualityStandards || ''
      });
    } else {
      resetForm();
    }
  }, [techCard, isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      frequency: '',
      estimatedDuration: '',
      instructions: '',
      requiredTools: [],
      requiredMaterials: [],
      safetyNotes: '',
      qualityStandards: ''
    });
    setNewTool('');
    setNewMaterial('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const techCardData: Partial<TechCard> = {
        name: formData.name,
        description: formData.description,
        frequency: formData.frequency,
        estimatedDuration: formData.estimatedDuration ? parseInt(formData.estimatedDuration) : undefined,
        instructions: formData.instructions,
        requiredTools: formData.requiredTools,
        requiredMaterials: formData.requiredMaterials,
        safetyNotes: formData.safetyNotes,
        qualityStandards: formData.qualityStandards,
        objectId: objectId
      };

      await onSave(techCardData);
      onClose();
    } catch (error) {
      console.error('Ошибка сохранения техкарты:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTool = () => {
    if (newTool.trim()) {
      setFormData({
        ...formData,
        requiredTools: [...formData.requiredTools, newTool.trim()]
      });
      setNewTool('');
    }
  };

  const removeTool = (index: number) => {
    setFormData({
      ...formData,
      requiredTools: formData.requiredTools.filter((_, i) => i !== index)
    });
  };

  const addMaterial = () => {
    if (newMaterial.trim()) {
      setFormData({
        ...formData,
        requiredMaterials: [...formData.requiredMaterials, newMaterial.trim()]
      });
      setNewMaterial('');
    }
  };

  const removeMaterial = (index: number) => {
    setFormData({
      ...formData,
      requiredMaterials: formData.requiredMaterials.filter((_, i) => i !== index)
    });
  };

  const frequencyOptions = [
    { value: 'daily', label: 'Ежедневно' },
    { value: 'weekly', label: 'Еженедельно' },
    { value: 'biweekly', label: 'Раз в две недели' },
    { value: 'monthly', label: 'Ежемесячно' },
    { value: 'quarterly', label: 'Ежеквартально' },
    { value: 'semiannually', label: 'Раз в полгода' },
    { value: 'yearly', label: 'Ежегодно' },
    { value: 'as_needed', label: 'По необходимости' }
  ];

  const commonTools = [
    'Пылесос', 'Швабра', 'Ведро', 'Тряпки', 'Губки', 'Щетки',
    'Перчатки', 'Совок', 'Метла', 'Стеклоочиститель', 'Лестница'
  ];

  const commonMaterials = [
    'Моющее средство', 'Дезинфицирующее средство', 'Стеклоочиститель',
    'Полироль', 'Освежитель воздуха', 'Мусорные пакеты', 'Салфетки',
    'Туалетная бумага', 'Мыло', 'Антисептик'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>{techCard ? 'Редактировать техкарту' : 'Создать новую техкарту'}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Основная информация</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="name">Название техкарты *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Например: Влажная уборка офиса"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="frequency">Периодичность *</Label>
                  <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите периодичность" />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="estimatedDuration">Время выполнения (минуты)</Label>
                  <Input
                    id="estimatedDuration"
                    type="number"
                    value={formData.estimatedDuration}
                    onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                    placeholder="60"
                    min="1"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Краткое описание работ"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Инструкции */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Инструкции по выполнению</h3>
              <Textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Подробные пошаговые инструкции..."
                rows={6}
              />
            </CardContent>
          </Card>

          {/* Инструменты */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Необходимые инструменты</h3>
              
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    value={newTool}
                    onChange={(e) => setNewTool(e.target.value)}
                    placeholder="Добавить инструмент"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())}
                  />
                  <Button type="button" onClick={addTool}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {commonTools.map((tool) => (
                    <div key={tool} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.requiredTools.includes(tool)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              requiredTools: [...formData.requiredTools, tool]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              requiredTools: formData.requiredTools.filter(t => t !== tool)
                            });
                          }
                        }}
                      />
                      <span className="text-sm">{tool}</span>
                    </div>
                  ))}
                </div>
                
                {formData.requiredTools.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Выбранные инструменты:</h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.requiredTools.map((tool, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                          <span>{tool}</span>
                          <button
                            type="button"
                            onClick={() => removeTool(index)}
                            className="ml-1 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Материалы */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Необходимые материалы</h3>
              
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    value={newMaterial}
                    onChange={(e) => setNewMaterial(e.target.value)}
                    placeholder="Добавить материал"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
                  />
                  <Button type="button" onClick={addMaterial}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {commonMaterials.map((material) => (
                    <div key={material} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.requiredMaterials.includes(material)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              requiredMaterials: [...formData.requiredMaterials, material]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              requiredMaterials: formData.requiredMaterials.filter(m => m !== material)
                            });
                          }
                        }}
                      />
                      <span className="text-sm">{material}</span>
                    </div>
                  ))}
                </div>
                
                {formData.requiredMaterials.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Выбранные материалы:</h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.requiredMaterials.map((material, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                          <span>{material}</span>
                          <button
                            type="button"
                            onClick={() => removeMaterial(index)}
                            className="ml-1 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Безопасность и качество */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Безопасность и стандарты качества</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="safetyNotes">Требования безопасности</Label>
                  <Textarea
                    id="safetyNotes"
                    value={formData.safetyNotes}
                    onChange={(e) => setFormData({ ...formData, safetyNotes: e.target.value })}
                    placeholder="Меры предосторожности, использование СИЗ..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="qualityStandards">Стандарты качества</Label>
                  <Textarea
                    id="qualityStandards"
                    value={formData.qualityStandards}
                    onChange={(e) => setFormData({ ...formData, qualityStandards: e.target.value })}
                    placeholder="Критерии оценки качества выполненной работы..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.name || !formData.frequency}
            >
              {loading ? 'Сохранение...' : techCard ? 'Обновить' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
