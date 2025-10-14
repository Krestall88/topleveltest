'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, FileText, Clock, Wrench } from 'lucide-react';

interface TechTask {
  id: string;
  name: string;
  workType: string;
  frequency: string;
  description: string;
}

interface TechTaskManagerProps {
  roomId: string;
  roomName: string;
  objectId: string;
}

export default function TechTaskManager({ roomId, roomName, objectId }: TechTaskManagerProps) {
  const [techTasks, setTechTasks] = useState<TechTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TechTask | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    workType: '',
    frequency: 'Ежедневно',
    description: ''
  });

  const fetchTechTasks = async () => {
    try {
      const response = await fetch(`/api/techcards?roomId=${roomId}`);
      if (response.ok) {
        const data = await response.json();
        setTechTasks(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки техзаданий:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTechCards();
  }, [roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingCard ? `/api/techcards/${editingCard.id}` : '/api/techcards';
      const method = editingCard ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          roomId,
          objectId,
        }),
      });

      if (response.ok) {
        const savedCard = await response.json();
        
        if (editingCard) {
          // Обновляем существующую техкарту локально
          setTechCards(prevCards => 
            prevCards.map(card => 
              card.id === editingCard.id ? savedCard : card
            )
          );
        } else {
          // Добавляем новую техкарту локально
          setTechCards(prevCards => [...prevCards, savedCard]);
        }
        
        setIsAddModalOpen(false);
        setEditingCard(null);
        setFormData({ name: '', workType: '', frequency: 'Ежедневно', description: '' });
      } else {
        throw new Error('Ошибка сохранения техкарты');
      }
    } catch (error) {
      console.error('Ошибка сохранения техкарты:', error);
      alert('Не удалось сохранить техкарту');
    }
  };

  const handleEdit = (card: TechCard) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      workType: card.workType,
      frequency: card.frequency,
      description: card.description,
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async (cardId: string) => {
    if (!confirm('Удалить техкарту?')) return;
    
    try {
      const response = await fetch(`/api/techcards/${cardId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Обновляем UI локально без перезагрузки
        setTechCards(prevCards => prevCards.filter(card => card.id !== cardId));
      } else {
        throw new Error('Ошибка удаления техкарты');
      }
    } catch (error) {
      console.error('Ошибка удаления техкарты:', error);
      alert('Не удалось удалить техкарту');
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency.toLowerCase()) {
      case 'ежедневно':
        return 'bg-red-100 text-red-800';
      case 'еженедельно':
        return 'bg-yellow-100 text-yellow-800';
      case 'ежемесячно':
        return 'bg-blue-100 text-blue-800';
      case 'по необходимости':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Загрузка техкарт...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          📝 Техкарты для помещения: {roomName}
        </h3>
        <Button
          onClick={() => {
            setEditingCard(null);
            setFormData({ name: '', workType: '', frequency: 'Ежедневно', description: '' });
            setIsAddModalOpen(true);
          }}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить техкарту
        </Button>
      </div>

      {techCards.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Техкарты не созданы</p>
            <p className="text-sm">Добавьте первую техкарту для этого помещения</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {techCards.map((card) => (
            <Card key={card.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Wrench className="w-5 h-5 mr-2 text-blue-600" />
                    {card.name}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleEdit(card)}
                      size="sm"
                      variant="outline"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(card.id)}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-1" />
                    {card.workType}
                  </div>
                  <Badge className={getFrequencyColor(card.frequency)}>
                    <Clock className="w-3 h-3 mr-1" />
                    {card.frequency}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-line text-sm bg-gray-50 p-3 rounded">
                  {card.description}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Модальное окно добавления/редактирования техкарты */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingCard ? 'Редактировать техкарту' : 'Добавить техкарту'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название техкарты *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Например: Влажная уборка пола"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип работ *
                </label>
                <input
                  type="text"
                  value={formData.workType}
                  onChange={(e) => setFormData({...formData, workType: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Например: Уборка помещения"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Периодичность *
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Ежедневно">Ежедневно</option>
                  <option value="Еженедельно">Еженедельно</option>
                  <option value="Ежемесячно">Ежемесячно</option>
                  <option value="По необходимости">По необходимости</option>
                  <option value="Годовые работы">Годовые работы</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание работ *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  placeholder="Подробное описание выполняемых работ..."
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingCard(null);
                  }}
                  variant="outline"
                >
                  Отмена
                </Button>
                <Button type="submit">
                  {editingCard ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
