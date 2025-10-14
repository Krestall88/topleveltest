'use client';

import React, { useState, useEffect } from 'react';

interface Room {
  id: string;
  name: string;
  description?: string;
  object: { name: string };
  _count: {
    checklists: number;
    tasks: number;
  };
}

interface RoomManagerProps {
  objectId: string;
  objectName: string;
}

export default function RoomManager({ objectId, objectName }: RoomManagerProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const fetchRooms = async () => {
    try {
      const response = await fetch(`/api/rooms?objectId=${objectId}`);
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error('Ошибка при загрузке помещений:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [objectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingRoom ? `/api/rooms/${editingRoom.id}` : '/api/rooms';
      const method = editingRoom ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...(editingRoom ? {} : { objectId })
        })
      });

      if (!response.ok) throw new Error('Ошибка сохранения');
      
      await fetchRooms();
      closeModal();
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
    }
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm('Удалить помещение? Все связанные чек-листы и задания также будут удалены.')) return;
    
    try {
      const response = await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка удаления');
      await fetchRooms();
    } catch (error) {
      console.error('Ошибка при удалении:', error);
    }
  };

  const openModal = (room?: Room) => {
    setEditingRoom(room || null);
    setFormData({
      name: room?.name || '',
      description: room?.description || ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
    setFormData({ name: '', description: '' });
  };

  if (isLoading) {
    return <div className="text-center py-4">Загрузка помещений...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Помещения объекта</h3>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700"
        >
          + Добавить помещение
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="bg-white border rounded-lg shadow">
          <div className="text-center py-8 text-gray-500">
            Помещения не добавлены
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white border rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-4 pb-2">
                <h4 className="text-base font-semibold">{room.name}</h4>
              </div>
              <div className="px-4 pb-4">
                {room.description && (
                  <p className="text-sm text-gray-600 mb-3">{room.description}</p>
                )}
                <div className="flex justify-between text-xs text-gray-500 mb-3">
                  <span>Чек-листов: {room._count.checklists}</span>
                  <span>Заданий: {room._count.tasks}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => openModal(room)} 
                    className="flex-1 px-3 py-1 text-sm border rounded hover:bg-gray-50"
                  >
                    Изменить
                  </button>
                  <button 
                    onClick={() => handleDelete(room.id)} 
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editingRoom ? 'Редактировать помещение' : 'Добавить помещение'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Название помещения *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  placeholder="Например: Офис 1, Склад, Коридор"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Описание
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  placeholder="Дополнительная информация о помещении"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                  {editingRoom ? 'Сохранить' : 'Добавить'}
                </button>
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded hover:bg-gray-50">
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
