'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface TelegramBindingsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TelegramBindingsManager({ isOpen, onClose }: TelegramBindingsManagerProps) {
  const [bindings, setBindings] = useState<ClientBinding[]>([]);
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Форма редактирования
  const [editForm, setEditForm] = useState({
    objectId: '',
    telegramUsername: '',
    firstName: '',
    lastName: ''
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
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bindingsRes, objectsRes] = await Promise.all([
        fetch('/api/admin/client-bindings'),
        fetch('/api/objects')
      ]);

      if (bindingsRes.ok) {
        const data = await bindingsRes.json();
        setBindings(data);
      }

      if (objectsRes.ok) {
        const data = await objectsRes.json();
        setObjects(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить привязку? Пользователь сможет выбрать объект заново.')) return;

    try {
      const res = await fetch(`/api/admin/client-bindings/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setBindings(bindings.filter(b => b.id !== id));
      } else {
        alert('Ошибка удаления привязки');
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка удаления привязки');
    }
  };

  const startEdit = (binding: ClientBinding) => {
    setEditingId(binding.id);
    setEditForm({
      objectId: binding.objectId,
      telegramUsername: binding.telegramUsername || '',
      firstName: binding.firstName || '',
      lastName: binding.lastName || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      objectId: '',
      telegramUsername: '',
      firstName: '',
      lastName: ''
    });
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/client-bindings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        const updated = await res.json();
        setBindings(bindings.map(b => b.id === id ? updated : b));
        cancelEdit();
      } else {
        alert('Ошибка обновления привязки');
      }
    } catch (error) {
      console.error('Ошибка обновления:', error);
      alert('Ошибка обновления привязки');
    }
  };

  const handleCreate = async () => {
    if (!createForm.telegramId || !createForm.objectId) {
      alert('Заполните обязательные поля: Telegram ID и Объект');
      return;
    }

    try {
      const res = await fetch('/api/admin/client-bindings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });

      if (res.ok) {
        const newBinding = await res.json();
        setBindings([newBinding, ...bindings]);
        setShowCreateForm(false);
        setCreateForm({
          telegramId: '',
          telegramUsername: '',
          firstName: '',
          lastName: '',
          objectId: ''
        });
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка создания привязки');
      }
    } catch (error) {
      console.error('Ошибка создания:', error);
      alert('Ошибка создания привязки');
    }
  };

  const getUserDisplay = (binding: ClientBinding) => {
    if (binding.firstName || binding.lastName) {
      return `${binding.firstName || ''} ${binding.lastName || ''}`.trim();
    }
    if (binding.telegramUsername) {
      return `@${binding.telegramUsername}`;
    }
    return `ID: ${binding.telegramId}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Управление Telegram аккаунтами</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Кнопка создания */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Всего привязок: {bindings.length}
            </p>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              size="sm"
              variant={showCreateForm ? "outline" : "default"}
            >
              {showCreateForm ? (
                <><X className="w-4 h-4 mr-2" /> Отмена</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Создать привязку</>
              )}
            </Button>
          </div>

          {/* Форма создания */}
          {showCreateForm && (
            <div className="p-4 border rounded-lg bg-blue-50 space-y-3">
              <h3 className="font-medium">Новая привязка</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telegram ID *</Label>
                  <Input
                    value={createForm.telegramId}
                    onChange={(e) => setCreateForm({ ...createForm, telegramId: e.target.value })}
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <Label>Username</Label>
                  <Input
                    value={createForm.telegramUsername}
                    onChange={(e) => setCreateForm({ ...createForm, telegramUsername: e.target.value })}
                    placeholder="username"
                  />
                </div>
                <div>
                  <Label>Имя</Label>
                  <Input
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    placeholder="Иван"
                  />
                </div>
                <div>
                  <Label>Фамилия</Label>
                  <Input
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    placeholder="Иванов"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Объект *</Label>
                  <Select value={createForm.objectId} onValueChange={(value) => setCreateForm({ ...createForm, objectId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите объект" />
                    </SelectTrigger>
                    <SelectContent>
                      {objects.map(obj => (
                        <SelectItem key={obj.id} value={obj.id}>
                          {obj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full">
                Создать привязку
              </Button>
            </div>
          )}

          {/* Таблица привязок */}
          {loading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : bindings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Нет привязанных аккаунтов
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Пользователь</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Объект</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Менеджер</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Дата</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bindings.map(binding => (
                    <tr key={binding.id} className="hover:bg-gray-50">
                      {editingId === binding.id ? (
                        <>
                          <td className="px-4 py-3">
                            <Input
                              value={editForm.firstName}
                              onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                              placeholder="Имя"
                              size={10}
                            />
                            <Input
                              value={editForm.lastName}
                              onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                              placeholder="Фамилия"
                              size={10}
                              className="mt-1"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={editForm.telegramUsername}
                              onChange={(e) => setEditForm({ ...editForm, telegramUsername: e.target.value })}
                              placeholder="username"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Select value={editForm.objectId} onValueChange={(value) => setEditForm({ ...editForm, objectId: value })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {objects.map(obj => (
                                  <SelectItem key={obj.id} value={obj.id}>
                                    {obj.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {binding.object.manager?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(binding.createdAt).toLocaleDateString('ru-RU')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="ghost" onClick={() => saveEdit(binding.id)}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <div className="font-medium">{getUserDisplay(binding)}</div>
                            <div className="text-xs text-gray-500">ID: {binding.telegramId}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {binding.telegramUsername ? `@${binding.telegramUsername}` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{binding.object.name}</div>
                            {binding.object.address && (
                              <div className="text-xs text-gray-500">{binding.object.address}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {binding.object.manager?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(binding.createdAt).toLocaleDateString('ru-RU')}
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(binding)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(binding.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
