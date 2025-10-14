'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, DollarSign, Building, Users } from 'lucide-react';

interface CleaningObject {
  id: string;
  name: string;
  address: string;
}

interface InventoryLimit {
  id: string;
  amount: number;
  month: number;
  year: number;
  isRecurring: boolean;
  endDate?: string;
  object: CleaningObject;
  setBy: {
    name: string;
    email: string;
  };
  totalSpent: number;
  balance: number;
  isOverspent: boolean;
  expenses: any[];
}

export default function AccountantInterface() {
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [limits, setLimits] = useState<InventoryLimit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetLimitModal, setShowSetLimitModal] = useState(false);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [limitAmount, setLimitAmount] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isRecurring, setIsRecurring] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [isMassMode, setIsMassMode] = useState(false);

  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Загружаем объекты
      const objectsResponse = await fetch('/api/objects');
      if (objectsResponse.ok) {
        const objectsData = await objectsResponse.json();
        setObjects(objectsData);
      }

      // Загружаем лимиты
      const limitsResponse = await fetch(`/api/inventory/limits?month=${selectedMonth}&year=${selectedYear}`);
      if (limitsResponse.ok) {
        const limitsData = await limitsResponse.json();
        setLimits(limitsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetLimit = async () => {
    if (!limitAmount || selectedObjects.length === 0) {
      alert('Заполните все обязательные поля');
      return;
    }

    try {
      const response = await fetch('/api/inventory/limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objectIds: selectedObjects,
          amount: parseFloat(limitAmount),
          month: selectedMonth,
          year: selectedYear,
          isRecurring,
          endDate: endDate || null
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Успешно установлено ${result.limits.length} лимитов`);
        setShowSetLimitModal(false);
        resetForm();
        fetchData();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      console.error('Error setting limits:', error);
      alert('Произошла ошибка при установке лимитов');
    }
  };

  const resetForm = () => {
    setSelectedObjects([]);
    setLimitAmount('');
    setIsRecurring(false);
    setEndDate('');
    setIsMassMode(false);
  };

  const handleObjectSelection = (objectId: string) => {
    if (isMassMode) {
      setSelectedObjects(prev => 
        prev.includes(objectId) 
          ? prev.filter(id => id !== objectId)
          : [...prev, objectId]
      );
    } else {
      setSelectedObjects([objectId]);
    }
  };

  const selectAllObjects = () => {
    setSelectedObjects(objects.map(obj => obj.id));
  };

  const clearSelection = () => {
    setSelectedObjects([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  // Статистика
  const totalLimits = limits.reduce((sum, limit) => sum + limit.amount, 0);
  const totalSpent = limits.reduce((sum, limit) => sum + limit.totalSpent, 0);
  const totalBalance = totalLimits - totalSpent;
  const overspentCount = limits.filter(limit => limit.isOverspent).length;

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Управление лимитами инвентаря</h1>
          <p className="text-gray-600">
            {months[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Выбор месяца и года */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-3 py-2"
          >
            {months.map((month, index) => (
              <option key={index} value={index + 1}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-3 py-2"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <Button onClick={() => setShowSetLimitModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Установить лимит
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий лимит</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalLimits)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Потрачено</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Остаток</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(totalBalance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Превышений</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overspentCount}</div>
            <p className="text-xs text-muted-foreground">из {limits.length} объектов</p>
          </CardContent>
        </Card>
      </div>

      {/* Список лимитов */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Лимиты по объектам</h2>
        {limits.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Лимиты не установлены</h3>
              <p className="text-gray-500 mb-4">На выбранный период лимиты не установлены</p>
              <Button onClick={() => setShowSetLimitModal(true)}>
                Установить лимиты
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {limits.map((limit) => (
              <Card key={limit.id} className={`${limit.isOverspent ? 'border-red-200 bg-red-50' : ''}`}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">{limit.object.name}</CardTitle>
                  <p className="text-xs text-gray-500">{limit.object.address}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Лимит:</span>
                      <span className="font-medium">{formatCurrency(limit.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Потрачено:</span>
                      <span className="font-medium">{formatCurrency(limit.totalSpent)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm text-gray-600">Остаток:</span>
                      <span className={`font-bold ${limit.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(limit.balance)}
                      </span>
                    </div>
                    {limit.isRecurring && (
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        🔄 Повторяется ежемесячно
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Расходов: {limit.expenses.length}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно установки лимита */}
      {showSetLimitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Установить лимит</h2>
            
            {/* Переключатель режима */}
            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isMassMode}
                  onChange={(e) => {
                    setIsMassMode(e.target.checked);
                    setSelectedObjects([]);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">Массовая установка (одинаковая сумма для всех)</span>
              </label>
            </div>

            {/* Выбор объектов */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Выберите объекты {isMassMode && (
                  <span className="text-xs text-gray-500">
                    (выбрано: {selectedObjects.length})
                  </span>
                )}
              </label>
              {isMassMode && (
                <div className="mb-2 space-x-2">
                  <Button size="sm" variant="outline" onClick={selectAllObjects}>
                    Выбрать все
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearSelection}>
                    Очистить
                  </Button>
                </div>
              )}
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded p-2">
                {objects.map((object) => (
                  <label key={object.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                    <input
                      type={isMassMode ? "checkbox" : "radio"}
                      name="selectedObject"
                      checked={selectedObjects.includes(object.id)}
                      onChange={() => handleObjectSelection(object.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{object.name}</div>
                      <div className="text-xs text-gray-500">{object.address}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Сумма лимита */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Сумма лимита (руб.)</label>
              <input
                type="number"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Введите сумму"
                min="0"
                step="0.01"
              />
            </div>

            {/* Месяц и год */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Месяц</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Год</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Повторение */}
            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Повторять каждый месяц</span>
              </label>
              {isRecurring && (
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-2">До какой даты (необязательно)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              )}
            </div>

            {/* Кнопки */}
            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSetLimitModal(false);
                  resetForm();
                }}
              >
                Отмена
              </Button>
              <Button onClick={handleSetLimit}>
                Установить лимит
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
