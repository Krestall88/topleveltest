'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Calendar, TrendingUp } from 'lucide-react';

interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
}

interface ExpenseCategoryLimit {
  id: string;
  amount: number;
  periodType: 'DAILY' | 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  month: number | null;
  year: number | null;
  startDate: string | null;
  endDate: string | null;
  isRecurring: boolean;
  category: ExpenseCategory;
  setBy: {
    id: string;
    name: string | null;
  };
}

interface ObjectExpenseLimitsSettingsProps {
  objectId: string;
}

const PERIOD_TYPE_LABELS = {
  DAILY: 'Ежедневно',
  MONTHLY: 'Ежемесячно',
  SEMI_ANNUAL: 'Раз в 6 месяцев',
  ANNUAL: 'Годовой'
};

export default function ObjectExpenseLimitsSettings({ objectId }: ObjectExpenseLimitsSettingsProps) {
  const [limits, setLimits] = useState<ExpenseCategoryLimit[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Форма
  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    periodType: 'MONTHLY' as 'DAILY' | 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    isRecurring: false
  });

  useEffect(() => {
    loadData();
  }, [objectId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Загружаем лимиты и категории параллельно
      const [limitsRes, categoriesRes] = await Promise.all([
        fetch(`/api/objects/${objectId}/expense-limits`),
        fetch('/api/expense-categories?activeOnly=true')
      ]);

      if (!limitsRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to load data');
      }

      const limitsData = await limitsRes.json();
      const categoriesData = await categoriesRes.json();

      setLimits(limitsData.limits);
      setCategories(categoriesData.categories);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.categoryId || !formData.amount) {
      setError('Заполните все обязательные поля');
      return;
    }

    try {
      const body: any = {
        categoryId: formData.categoryId,
        amount: parseFloat(formData.amount),
        periodType: formData.periodType,
        isRecurring: formData.isRecurring
      };

      if (formData.periodType === 'MONTHLY') {
        body.month = formData.month;
        body.year = formData.year;
      } else if (formData.periodType === 'SEMI_ANNUAL' || formData.periodType === 'ANNUAL') {
        if (!formData.startDate) {
          setError('Укажите дату начала периода');
          return;
        }
        body.startDate = formData.startDate;
        body.endDate = formData.endDate || null;
      }

      const response = await fetch(`/api/objects/${objectId}/expense-limits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create limit');
      }

      resetForm();
      await loadData();
    } catch (error: any) {
      console.error('Error creating limit:', error);
      setError(error.message || 'Ошибка создания лимита');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.amount) {
      setError('Укажите сумму');
      return;
    }

    try {
      const body: any = {
        amount: parseFloat(formData.amount),
        isRecurring: formData.isRecurring
      };

      if (formData.periodType === 'MONTHLY') {
        body.month = formData.month;
        body.year = formData.year;
      } else if (formData.periodType === 'SEMI_ANNUAL' || formData.periodType === 'ANNUAL') {
        body.startDate = formData.startDate || null;
        body.endDate = formData.endDate || null;
      }

      const response = await fetch(`/api/expense-limits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update limit');
      }

      resetForm();
      await loadData();
    } catch (error: any) {
      console.error('Error updating limit:', error);
      setError(error.message || 'Ошибка обновления лимита');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот лимит?')) {
      return;
    }

    try {
      const response = await fetch(`/api/expense-limits/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete limit');
      }

      await loadData();
    } catch (error) {
      console.error('Error deleting limit:', error);
      setError('Ошибка удаления лимита');
    }
  };

  const startEdit = (limit: ExpenseCategoryLimit) => {
    setEditingId(limit.id);
    setFormData({
      categoryId: limit.category.id,
      amount: limit.amount.toString(),
      periodType: limit.periodType,
      month: limit.month || new Date().getMonth() + 1,
      year: limit.year || new Date().getFullYear(),
      startDate: limit.startDate ? limit.startDate.split('T')[0] : '',
      endDate: limit.endDate ? limit.endDate.split('T')[0] : '',
      isRecurring: limit.isRecurring
    });
    setIsCreating(false);
  };

  const resetForm = () => {
    setFormData({
      categoryId: '',
      amount: '',
      periodType: 'MONTHLY',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      startDate: '',
      endDate: '',
      isRecurring: false
    });
    setIsCreating(false);
    setEditingId(null);
    setError(null);
  };

  const formatPeriod = (limit: ExpenseCategoryLimit) => {
    switch (limit.periodType) {
      case 'DAILY':
        return 'Ежедневно';
      case 'MONTHLY':
        return `${limit.month}/${limit.year}`;
      case 'SEMI_ANNUAL':
      case 'ANNUAL':
        if (limit.startDate && limit.endDate) {
          return `${new Date(limit.startDate).toLocaleDateString('ru-RU')} - ${new Date(limit.endDate).toLocaleDateString('ru-RU')}`;
        }
        return limit.startDate ? new Date(limit.startDate).toLocaleDateString('ru-RU') : '—';
      default:
        return '—';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Кнопка добавления */}
      {!isCreating && !editingId && (
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Добавить лимит
        </button>
      )}

      {/* Форма создания/редактирования */}
      {(isCreating || editingId) && (
        <div className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Редактировать лимит' : 'Новый лимит'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Категория *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!!editingId}
              >
                <option value="">Выберите категорию</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Сумма (₽) *
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип периода *
              </label>
              <select
                value={formData.periodType}
                onChange={(e) => setFormData({ ...formData, periodType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!!editingId}
              >
                <option value="DAILY">Ежедневно</option>
                <option value="MONTHLY">Ежемесячно</option>
                <option value="SEMI_ANNUAL">Раз в 6 месяцев</option>
                <option value="ANNUAL">Годовой</option>
              </select>
            </div>

            {formData.periodType === 'MONTHLY' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Месяц
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1).toLocaleDateString('ru-RU', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Год
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="2020"
                    max="2100"
                  />
                </div>
              </>
            )}

            {(formData.periodType === 'SEMI_ANNUAL' || formData.periodType === 'ANNUAL') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Дата начала *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Дата окончания
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Повторяющийся лимит</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => (editingId ? handleUpdate(editingId) : handleCreate())}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check className="h-5 w-5" />
              {editingId ? 'Сохранить' : 'Создать'}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список лимитов */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Категория
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Тип периода
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Период
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Сумма
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Повтор
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {limits.map((limit) => (
              <tr key={limit.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{limit.category.name}</div>
                  {limit.category.description && (
                    <div className="text-xs text-gray-500">{limit.category.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {PERIOD_TYPE_LABELS[limit.periodType]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatPeriod(limit)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                  {limit.amount.toLocaleString('ru-RU')} ₽
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {limit.isRecurring && (
                    <div title="Повторяющийся">
                      <TrendingUp className="h-5 w-5 text-green-600 mx-auto" />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => startEdit(limit)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Редактировать"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(limit.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Удалить"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {limits.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Нет настроенных лимитов</p>
            <p className="text-sm mt-2">Добавьте первый лимит для этого объекта</p>
          </div>
        )}
      </div>
    </div>
  );
}
