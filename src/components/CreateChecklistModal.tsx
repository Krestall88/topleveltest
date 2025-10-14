'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, MapPin, User } from 'lucide-react';

interface CleaningObject {
  id: string;
  name: string;
  address: string;
  manager?: {
    name: string;
  };
}

interface CreateChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChecklist: (objectId: string, date: string) => void;
  isPending: boolean;
}

export default function CreateChecklistModal({ 
  isOpen, 
  onClose, 
  onCreateChecklist, 
  isPending 
}: CreateChecklistModalProps) {
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchObjects();
    }
  }, [isOpen]);

  const fetchObjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/objects');
      if (response.ok) {
        const data = await response.json();
        setObjects(data);
      }
    } catch (error) {
      console.error('Ошибка при загрузке объектов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedObjectId && selectedDate) {
      onCreateChecklist(selectedObjectId, selectedDate);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Создать чек-лист</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дата
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Выберите объект
            </label>
            {loading ? (
              <div className="text-center py-4">Загрузка объектов...</div>
            ) : (
              <div className="grid gap-3 max-h-60 overflow-y-auto">
                {objects.map((object) => (
                  <Card
                    key={object.id}
                    className={`cursor-pointer transition-colors ${
                      selectedObjectId === object.id
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedObjectId(object.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{object.name}</h3>
                          <div className="flex items-center space-x-1 text-sm text-gray-600 mt-1">
                            <MapPin className="h-4 w-4" />
                            <span>{object.address}</span>
                          </div>
                          {object.manager && (
                            <div className="flex items-center space-x-1 text-sm text-gray-600 mt-1">
                              <User className="h-4 w-4" />
                              <span>{object.manager.name}</span>
                            </div>
                          )}
                        </div>
                        <input
                          type="radio"
                          name="object"
                          value={object.id}
                          checked={selectedObjectId === object.id}
                          onChange={() => setSelectedObjectId(object.id)}
                          className="text-blue-600"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!selectedObjectId || !selectedDate || isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Создание...' : 'Создать чек-лист'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
