'use client';

import { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus, X, Check } from 'lucide-react';

interface ClientBinding {
  id: string;
  createdAt: string;
  telegramId: string;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
  objectId: string;
  object: {
    id: string;
    name: string;
    address?: string;
    manager?: {
      id: string;
      name: string;
      email: string;
    };
  };
}

interface CleaningObject {
  id: string;
  name: string;
  address?: string;
}

export default function TelegramClientBindings() {
  const [bindings, setBindings] = useState<ClientBinding[]>([]);
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Форма редактирования
  const [editForm, setEditForm] = useState({
    telegramId: '',
    telegramUsername: '',
    firstName: '',
    lastName: '',
    objectId: ''
  });

  // Форма создания
  const [createForm, setCreateForm] = useState({
    telegramId: '',
    telegramUsername: '',
    firstName: '',
    lastName: '',
    objectId: ''
  });

  useEffect(() => {
    loadBindings();
    loadObjects();
  }, []);

  const loadBindings = async () => {
    try {
      const response = await fetch('/api/client-bindings');
      if (response.ok) {
        const data = await response.json();
        setBindings(data);
      }
    } catch (error) {
      console.error('Error loading bindings:', error);
    }
  };

  const loadObjects = async () => {
    try {
      const response = await fetch('/api/objects');
      if (response.ok) {
        const data = await response.json();
        setObjects(Array.isArray(data) ? data : data.objects || []);
      }
    } catch (error) {
      console.error('Error loading objects:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту привязку?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/client-bindings/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadBindings();
      } else {
        alert('Ошибка при удалении');
      }
    } catch (error) {
      console.error('Error deleting binding:', error);
      alert('Ошибка при удалении');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (binding: ClientBinding) => {
    setEditingId(binding.id);
    setEditForm({
      telegramId: binding.telegramId,
      telegramUsername: binding.telegramUsername || '',
      firstName: binding.firstName || '',
      lastName: binding.lastName || '',
      objectId: binding.objectId
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      telegramId: '',
      telegramUsername: '',
      firstName: '',
      lastName: '',
      objectId: ''
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/client-bindings/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        await loadBindings();
        cancelEdit();
      } else {
        alert('Ошибка при сохранении');
      }
    } catch (error) {
      console.error('Error saving binding:', error);
      alert('Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.telegramId || !createForm.objectId) {
      alert('Заполните обязательные поля');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/client-bindings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });

      if (response.ok) {
        await loadBindings();
        setShowCreateForm(false);
        setCreateForm({
          telegramId: '',
          telegramUsername: '',
          firstName: '',
          lastName: '',
          objectId: ''
        });
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка при создании');
      }
    } catch (error) {
      console.error('Error creating binding:', error);
      alert('Ошибка при создании');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Кнопка добавления */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Привязки клиентов ({bindings.length})
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showCreateForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showCreateForm ? 'Отмена' : 'Добавить привязку'}
        </button>
      </div>

      {/* Форма создания */}
      {showCreateForm && (
        <div className="mb-6 bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Новая привязка</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telegram ID *
              </label>
              <input
                type="text"
                value={createForm.telegramId}
                onChange={(e) => setCreateForm({ ...createForm, telegramId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={createForm.telegramUsername}
                onChange={(e) => setCreateForm({ ...createForm, telegramUsername: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="@username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Имя
              </label>
              <input
                type="text"
                value={createForm.firstName}
                onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Фамилия
              </label>
              <input
                type="text"
                value={createForm.lastName}
                onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Объект *
              </label>
              <select
                value={createForm.objectId}
                onChange={(e) => setCreateForm({ ...createForm, objectId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Выберите объект</option>
                {objects.map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    {obj.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </div>
      )}

      {/* Список привязок */}
      <div className="space-y-4">
        {bindings.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Нет привязок</p>
            <p className="text-sm text-gray-400 mt-2">
              Добавьте первую привязку клиента к объекту
            </p>
          </div>
        ) : (
          bindings.map((binding) => (
            <div
              key={binding.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              {editingId === binding.id ? (
                // Режим редактирования
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telegram ID
                      </label>
                      <input
                        type="text"
                        value={editForm.telegramId}
                        onChange={(e) => setEditForm({ ...editForm, telegramId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={editForm.telegramUsername}
                        onChange={(e) => setEditForm({ ...editForm, telegramUsername: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Имя
                      </label>
                      <input
                        type="text"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Фамилия
                      </label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Объект
                      </label>
                      <select
                        value={editForm.objectId}
                        onChange={(e) => setEditForm({ ...editForm, objectId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {objects.map((obj) => (
                          <option key={obj.id} value={obj.id}>
                            {obj.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <X className="w-4 h-4 inline mr-1" />
                      Отмена
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 inline mr-1" />
                      Сохранить
                    </button>
                  </div>
                </div>
              ) : (
                // Режим просмотра
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {binding.firstName} {binding.lastName}
                      </h3>
                      {binding.telegramUsername && (
                        <span className="text-sm text-blue-600">
                          @{binding.telegramUsername}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Telegram ID:</span> {binding.telegramId}
                      </p>
                      <p>
                        <span className="font-medium">Объект:</span> {binding.object.name}
                      </p>
                      {binding.object.manager && (
                        <p>
                          <span className="font-medium">Менеджер:</span> {binding.object.manager.name}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        Создано: {new Date(binding.createdAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEdit(binding)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Редактировать"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(binding.id)}
                      disabled={loading}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
