'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  Calendar,
  Edit,
  Plus,
  BarChart3,
  Users,
  Settings
} from 'lucide-react';
import ExpenseChart from './ExpenseChart';

interface InventoryBalance {
  objectId: string;
  objectName: string;
  objectAddress: string;
  limit: number;
  spent: number;
  balance: number;
  isOverBudget: boolean;
  month: number;
  year: number;
  expensesCount?: number;
}

interface InventoryFinancialReportProps {
  objectId?: string;
}

interface EditLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: InventoryBalance | null;
  onSave: (data: any) => void;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: InventoryBalance | null;
  onSave: (data: any) => void;
}

interface ExpenseChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: InventoryBalance | null;
}

interface BulkLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: InventoryBalance[];
  onSave: (data: any) => void;
}

// Модальное окно редактирования лимита
function EditLimitModal({ isOpen, onClose, balance, onSave }: EditLimitModalProps) {
  const [amount, setAmount] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [endMonth, setEndMonth] = useState('');
  const [endYear, setEndYear] = useState('');

  useEffect(() => {
    if (balance) {
      setAmount(balance.limit.toString());
    }
  }, [balance]);

  const handleSave = () => {
    onSave({
      objectId: balance?.objectId,
      amount: parseFloat(amount),
      month: balance?.month,
      year: balance?.year,
      isRecurring,
      endDate: isRecurring && endMonth && endYear ? 
        new Date(parseInt(endYear), parseInt(endMonth) - 1) : null
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать лимит - {balance?.objectName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Сумма лимита (руб.)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="40000"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="recurring"
              checked={isRecurring}
              onCheckedChange={(checked) => setIsRecurring(checked === true)}
            />
            <label htmlFor="recurring" className="text-sm">
              Повторять каждый месяц
            </label>
          </div>

          {isRecurring && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">До месяца</label>
                <Select value={endMonth} onValueChange={setEndMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Месяц" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(0, i).toLocaleString('ru', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">До года</label>
                <Select value={endYear} onValueChange={setEndYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Год" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Отмена</Button>
            <Button onClick={handleSave}>Сохранить</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Модальное окно добавления расхода
function AddExpenseModal({ isOpen, onClose, balance, onSave }: AddExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!amount || !description) {
      alert('Пожалуйста, заполните все поля');
      return;
    }
    
    const expenseData = {
      objectId: balance?.objectId,
      amount: parseFloat(amount),
      description,
      month: balance?.month,
      year: balance?.year
    };
    
    console.log('📝 Данные из модального окна:', expenseData);
    console.log('📊 Balance объект:', balance);
    
    onSave(expenseData);
    
    // Очищаем поля только после успешного сохранения
    setAmount('');
    setDescription('');
    // onClose() теперь вызывается в handleSaveExpense после успешного ответа
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить расход - {balance?.objectName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Сумма расхода (руб.)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Описание</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Закупка моющих средств..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Отмена</Button>
            <Button onClick={handleSave}>Добавить</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Модальное окно с графиком расходов
function ExpenseChartModal({ isOpen, onClose, balance }: ExpenseChartModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Детальная аналитика расходов</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {balance && (
            <ExpenseChart 
              objectId={balance.objectId} 
              objectName={balance.objectName}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Модальное окно массового выставления лимитов
function BulkLimitModal({ isOpen, onClose, balances, onSave }: BulkLimitModalProps) {
  const [amount, setAmount] = useState('');
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);

  const handleSave = () => {
    onSave({
      amount: parseFloat(amount),
      objectIds: selectedObjects,
      isRecurring
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Массовое выставление лимитов</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Сумма лимита (руб.)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="40000"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="bulk-recurring"
              checked={isRecurring}
              onCheckedChange={(checked) => setIsRecurring(checked === true)}
            />
            <label htmlFor="bulk-recurring" className="text-sm">
              Повторять каждый месяц
            </label>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Выберите объекты</label>
            <div className="max-h-48 overflow-y-auto space-y-2 border rounded p-2">
              {balances.map((balance) => (
                <div key={balance.objectId} className="flex items-center space-x-2">
                  <Checkbox
                    id={balance.objectId}
                    checked={selectedObjects.includes(balance.objectId)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedObjects([...selectedObjects, balance.objectId]);
                      } else {
                        setSelectedObjects(selectedObjects.filter(id => id !== balance.objectId));
                      }
                    }}
                  />
                  <label htmlFor={balance.objectId} className="text-sm">
                    {balance.objectName}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Отмена</Button>
            <Button onClick={handleSave}>Применить</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InventoryFinancialReport({ objectId }: InventoryFinancialReportProps) {
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Модальные окна
  const [editLimitModal, setEditLimitModal] = useState<{isOpen: boolean, balance: InventoryBalance | null}>({
    isOpen: false, balance: null
  });
  const [addExpenseModal, setAddExpenseModal] = useState<{isOpen: boolean, balance: InventoryBalance | null}>({
    isOpen: false, balance: null
  });
  const [chartModal, setChartModal] = useState<{isOpen: boolean, balance: InventoryBalance | null}>({
    isOpen: false, balance: null
  });
  const [bulkLimitModal, setBulkLimitModal] = useState(false);

  useEffect(() => {
    fetchBalances();
  }, [selectedMonth, selectedYear, objectId]);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (objectId) {
        params.append('objectId', objectId);
      }
      
      params.append('month', selectedMonth.toString());
      params.append('year', selectedYear.toString());

      const response = await fetch(`/api/inventory/financial-report?${params}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setBalances(data);
      }
    } catch (error) {
      console.error('Error fetching inventory balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  };

  const getBalanceStatus = (balance: InventoryBalance) => {
    if (balance.isOverBudget) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Превышение
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />
        В пределах лимита
      </Badge>
    );
  };

  const handleSaveLimit = async (data: any) => {
    try {
      const response = await fetch('/api/inventory/limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        fetchBalances();
        // Закрываем модальное окно
        setEditLimitModal({isOpen: false, balance: null});
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert(`Ошибка: ${errorData.error || 'Не удалось установить лимит'}`);
      }
    } catch (error) {
      console.error('Error saving limit:', error);
      alert('Ошибка сети при установке лимита');
    }
  };

  const handleSaveExpense = async (data: any) => {
    console.log('🔍 Отправляем данные расхода:', data);
    
    try {
      const response = await fetch('/api/inventory/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        fetchBalances();
        // Закрываем модальное окно
        setAddExpenseModal({isOpen: false, balance: null});
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert(`Ошибка: ${errorData.error || 'Не удалось создать расход'}`);
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Ошибка сети при создании расхода');
    }
  };

  const handleBulkSave = async (data: any) => {
    try {
      const response = await fetch('/api/inventory/bulk-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        fetchBalances();
        // Закрываем модальное окно
        setBulkLimitModal(false);
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert(`Ошибка: ${errorData.error || 'Не удалось установить лимиты'}`);
      }
    } catch (error) {
      console.error('Error saving bulk limits:', error);
      alert('Ошибка сети при установке лимитов');
    }
  };

  const totalLimit = balances.reduce((sum, item) => sum + item.limit, 0);
  const totalSpent = balances.reduce((sum, item) => sum + item.spent, 0);
  const totalBalance = totalLimit - totalSpent;
  const overBudgetCount = balances.filter(item => item.isOverBudget).length;

  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Загрузка финансовой отчетности...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">💰 Финансовая отчетность по инвентарю</h1>
          <p className="text-gray-600 mt-1">
            Лимиты, расходы и остатки по объектам
          </p>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            {months.map((month, index) => (
              <option key={index} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
          
          <Button
            onClick={() => setBulkLimitModal(true)}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Массовые лимиты
          </Button>
        </div>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Общий лимит</p>
                <p className="text-2xl font-bold">{formatCurrency(totalLimit)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Потрачено</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Остаток</p>
                <p className={`text-2xl font-bold ${totalBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(totalBalance)}
                </p>
              </div>
              <TrendingUp className={`w-8 h-8 ${totalBalance < 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Превышения</p>
                <p className="text-2xl font-bold text-red-600">{overBudgetCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Отчет по объектам */}
      {balances.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Данные не найдены
            </h3>
            <p className="text-gray-600 mb-4">
              Нет данных по лимитам и расходам за выбранный период
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {balances.map((balance) => (
            <Card key={balance.objectId} className={balance.isOverBudget ? 'border-red-200 bg-red-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-lg">{balance.objectName}</h3>
                      {getBalanceStatus(balance)}
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3">{balance.objectAddress}</p>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Лимит:</span>
                        <p className="font-medium text-blue-600">{formatCurrency(balance.limit)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Потрачено:</span>
                        <p className="font-medium text-red-600">{formatCurrency(balance.spent)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Остаток:</span>
                        <p className={`font-medium ${balance.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(balance.balance)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Прогресс-бар */}
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${balance.isOverBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                          style={{ 
                            width: `${Math.min(100, (balance.spent / balance.limit) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Использовано: {balance.limit > 0 ? Math.round((balance.spent / balance.limit) * 100) : 0}%
                      </div>
                    </div>

                    {/* Кнопки действий */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditLimitModal({isOpen: true, balance})}
                        className="flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        Лимит
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddExpenseModal({isOpen: true, balance})}
                        className="flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Расход
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setChartModal({isOpen: true, balance})}
                        className="flex items-center gap-1"
                      >
                        <BarChart3 className="w-3 h-3" />
                        Подробно
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Модальные окна */}
      <EditLimitModal
        isOpen={editLimitModal.isOpen}
        onClose={() => setEditLimitModal({isOpen: false, balance: null})}
        balance={editLimitModal.balance}
        onSave={handleSaveLimit}
      />

      <AddExpenseModal
        isOpen={addExpenseModal.isOpen}
        onClose={() => setAddExpenseModal({isOpen: false, balance: null})}
        balance={addExpenseModal.balance}
        onSave={handleSaveExpense}
      />

      <ExpenseChartModal
        isOpen={chartModal.isOpen}
        onClose={() => setChartModal({isOpen: false, balance: null})}
        balance={chartModal.balance}
      />

      <BulkLimitModal
        isOpen={bulkLimitModal}
        onClose={() => setBulkLimitModal(false)}
        balances={balances}
        onSave={handleBulkSave}
      />
    </div>
  );
}
