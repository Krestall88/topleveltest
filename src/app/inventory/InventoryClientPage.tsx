'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Фильтрация товаров по поисковому запросу
  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.unit.toLowerCase().includes(query)
    );
  });

  // Подсчет общей стоимости
  const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="responsive-container space-y-4 sm:space-y-6 py-4 sm:py-6">
      <h1 className="mobile-text-xl font-bold">Управление инвентарем</h1>
      
      {/* Дашборд */}
      <div className="mobile-grid-3 mobile-gap-sm">
        <Card>
          <CardContent className="mobile-card">
            <div className="mobile-text-2xl font-bold text-blue-600">{items.length}</div>
            <div className="mobile-text-xs text-gray-600 mt-1">Всего позиций</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="mobile-card">
            <div className="mobile-text-2xl font-bold text-green-600">
              {items.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
            <div className="mobile-text-xs text-gray-600 mt-1">Всего единиц</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="mobile-card">
            <div className="mobile-text-2xl font-bold text-purple-600">
              {totalValue.toLocaleString('ru-RU')} ₽
            </div>
            <div className="mobile-text-xs text-gray-600 mt-1">Общая стоимость</div>
          </CardContent>
        </Card>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 mobile-icon text-gray-400" />
        <Input
          type="text"
          placeholder="Поиск..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mobile-input pl-10"
        />
      </div>
      
      {isAdmin && (
        <form onSubmit={handleSubmit} className="mobile-card border rounded shadow-sm">
          <h2 className="mobile-text-base mb-3">Добавить новую позицию</h2>
          <div className="mobile-grid-4 mobile-gap-sm">
            <input type="text" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Название" className="mobile-input" required />
            <input type="number" value={quantity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(Number(e.target.value))} placeholder="Количество" className="mobile-input" required />
            <input type="text" value={unit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnit(e.target.value)} placeholder="Ед. изм." className="mobile-input" required />
            <input type="number" value={price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Цена" className="mobile-input" />
          </div>
          <button type="submit" className="mobile-button w-full sm:w-auto bg-blue-500 text-white rounded hover:bg-blue-600">Добавить</button>
        </form>
      )}

      <div className="overflow-x-auto -mx-3 md:mx-0 shadow-md sm:rounded-lg">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
              <th scope="col" className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Кол-во</th>
              <th scope="col" className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
              <th scope="col" className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                  <div className="text-xs md:text-sm font-medium text-gray-900 break-words max-w-[150px] md:max-w-none">{item.name}</div>
                </td>
                <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                  <div className="text-xs md:text-sm text-gray-900">{item.quantity} {item.unit}</div>
                </td>
                <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                  <div className="text-xs md:text-sm text-gray-900">{item.price ? `${item.price} р.` : '-'}</div>
                </td>
                <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 sm:space-x-2">
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
