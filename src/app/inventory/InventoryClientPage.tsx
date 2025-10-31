'use client';

import React, { useState, useEffect, FormEvent } from 'react';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  checklist: {
    object: {
      name: string;
    };
    room?: {
      name: string;
    };
  };
}

interface Expense {
  id: string;
  quantity: number;
  amount: number | null;
  createdAt: string;
  user: { name: string | null };
  task?: Task;
  description?: string;
}

interface Props {
  session: any; // TODO: Define a proper session type
}

export default function InventoryClientPage({ session }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState<number | ''>('');

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);

  // Expense modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseQuantity, setExpenseQuantity] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER';

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/inventory');
      if (!res.ok) throw new Error('Не удалось загрузить инвентарь');
      const data = await res.json();
      setItems(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks?status=NEW,IN_PROGRESS');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки задач:', err);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchTasks();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quantity, unit, price: Number(price) }),
      });
      if (!res.ok) throw new Error('Ошибка при добавлении');
      await fetchItems(); // Refresh list
      // Reset form
      setName('');
      setQuantity(0);
      setUnit('');
      setPrice('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentItem) return;
    try {
      const res = await fetch(`/api/inventory/${currentItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quantity, unit, price: Number(price) }),
      });
      if (!res.ok) throw new Error('Ошибка при обновлении');
      await fetchItems();
      setIsEditModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот элемент?')) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Ошибка при удалении');
      await fetchItems();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddExpense = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentItem) return;
    try {
      const body: any = { 
        itemId: currentItem.id, 
        quantity: expenseQuantity 
      };
      
      if (selectedTaskId) {
        body.taskId = selectedTaskId;
      }

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Ошибка при добавлении расхода');
      }
      await fetchItems();
      setIsExpenseModalOpen(false);
      setSelectedTaskId('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditModal = (item: InventoryItem) => {
    setCurrentItem(item);
    setName(item.name);
    setQuantity(item.quantity);
    setUnit(item.unit);
    setPrice(item.price);
    setIsEditModalOpen(true);
  };

  const openExpenseModal = (item: InventoryItem) => {
    setCurrentItem(item);
    setExpenseQuantity(0);
    setSelectedTaskId('');
    setIsExpenseModalOpen(true);
  };

  const openHistoryModal = async (item: InventoryItem) => {
    setCurrentItem(item);
    try {
      const res = await fetch(`/api/expenses?itemId=${item.id}`);
      if (!res.ok) throw new Error('Не удалось загрузить историю');
      const data = await res.json();
      setExpenses(data);
      setIsHistoryModalOpen(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isLoading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Управление инвентарем</h1>
      
      {isAdmin && (
        <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded shadow-sm">
          <h2 className="text-xl mb-4">Добавить новую позицию</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="text" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Название" className="p-2 border rounded" required />
            <input type="number" value={quantity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(Number(e.target.value))} placeholder="Количество" className="p-2 border rounded" required />
            <input type="text" value={unit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnit(e.target.value)} placeholder="Ед. изм." className="p-2 border rounded" required />
            <input type="number" value={price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Цена за ед." className="p-2 border rounded" />
          </div>
          <button type="submit" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Добавить</button>
        </form>
      )}

      <div className="overflow-x-auto shadow-md sm:rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Количество</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.quantity} {item.unit}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.price ? `${item.price} руб.` : 'Не указана'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    {isAdmin && (
                      <>
                        <button onClick={() => openEditModal(item)} className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">Изм.</button>
                        <button onClick={() => handleDelete(item.id)} className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">Удл.</button>
                        <button onClick={() => openExpenseModal(item)} className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">Расход</button>
                      </>
                    )}
                    <button onClick={() => openHistoryModal(item)} className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">История</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && currentItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h2 className="text-xl mb-4">Редактировать: {currentItem.name}</h2>
            <form onSubmit={handleUpdate}>
              <input type="text" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} className="w-full p-2 mb-2 border rounded" />
              <input type="number" value={quantity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(Number(e.target.value))} className="w-full p-2 mb-2 border rounded" />
              <input type="text" value={unit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnit(e.target.value)} className="w-full p-2 mb-2 border rounded" />
              <input type="number" value={price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 mb-2 border rounded" />
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded">Отмена</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && currentItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl mb-4">Добавить расход: {currentItem.name}</h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Количество *
                </label>
                <input 
                  type="number" 
                  value={expenseQuantity} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpenseQuantity(Number(e.target.value))} 
                  placeholder="Количество" 
                  className="w-full p-2 border rounded" 
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Связать с заданием (необязательно)
                </label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Не связывать с заданием</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title} - {task.checklist.object.name}
                      {task.checklist.room && ` (${task.checklist.room.name})`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                  Отмена
                </button>
                <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                  Добавить расход
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && currentItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl mb-4">История расходов: {currentItem.name}</h2>
            
            {expenses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Расходы не найдены</p>
            ) : (
              <div className="space-y-3">
                {expenses.map((exp) => (
                  <div key={exp.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">📅 Дата:</p>
                        <p className="font-medium">{new Date(exp.createdAt).toLocaleString('ru-RU')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">👤 Пользователь:</p>
                        <p className="font-medium">{exp.user.name || 'Не указан'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">📦 Количество:</p>
                        <p className="font-medium">{exp.quantity} {currentItem.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">💰 Сумма:</p>
                        <p className="font-medium">{exp.amount ? `${exp.amount} руб.` : 'Не указана'}</p>
                      </div>
                    </div>
                    
                    {exp.task && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-gray-600">🎯 Связанное задание:</p>
                        <p className="font-medium text-blue-600">
                          {exp.task.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {exp.task.checklist.object.name}
                          {exp.task.checklist.room && ` - ${exp.task.checklist.room.name}`}
                        </p>
                        <span className={`inline-block px-2 py-1 text-xs rounded mt-1 ${
                          exp.task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          exp.task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {exp.task.status}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setIsHistoryModalOpen(false)} 
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
