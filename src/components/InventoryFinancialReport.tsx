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
  Settings,
  Search
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

interface ObjectInfo {
  id: string;
  name: string;
  address?: string | null;
  manager?: {
    id: string;
    name: string | null;
  } | null;
}

interface BulkLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: InventoryBalance[];
  onSave: (data: BulkLimitData) => void;
}

interface BulkLimitData {
  categoryId: string;
  periodType: 'MONTHLY' | 'DAILY' | 'SEMI_ANNUAL' | 'ANNUAL';
  amount: number;
  objectIds: string[];
  month?: number;
  year?: number;
  startDate?: Date;
  endDate?: Date;
  isRecurring?: boolean;
}

// Модальное окно редактирования лимита
function EditLimitModal({ isOpen, onClose, balance, onSave }: EditLimitModalProps) {
  const [amount, setAmount] = useState('');
  const [periodType, setPeriodType] = useState<'DAILY' | 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL'>('MONTHLY');
  const [isRecurring, setIsRecurring] = useState(false);
  const [endMonth, setEndMonth] = useState('');
  const [endYear, setEndYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [selectedLimitId, setSelectedLimitId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && balance) {
      resetForm(balance);
      loadCategories();
      loadUserRole();
      loadExistingLimits(balance);
    } else if (!isOpen) {
      resetForm(null);
    }
  }, [isOpen, balance]);

  const resetForm = (currentBalance: InventoryBalance | null) => {
    setAmount(currentBalance?.limit?.toString() || '');
    setPeriodType('MONTHLY');
    setIsRecurring(false);
    setEndMonth('');
    setEndYear('');
    setStartDate('');
    setEndDate('');
    setSelectedCategory('');
    setSelectedLimitId(null);
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/expense-categories?activeOnly=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadUserRole = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.user.role);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const loadExistingLimits = async (currentBalance: InventoryBalance) => {
    try {
      const response = await fetch(`/api/objects/${currentBalance.objectId}/expense-limits`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const limits = (data.limits || []) as any[];
        if (limits.length) {
          const matchingMonthly = limits.find((limit) =>
            limit.periodType === 'MONTHLY' &&
            limit.month === currentBalance.month &&
            limit.year === currentBalance.year
          );
          const selected = matchingMonthly || limits[0];
          applyLimitDefaults(selected);
        }
      }
    } catch (error) {
      console.error('Error loading object limits:', error);
    }
  };

  const applyLimitDefaults = (limit: any) => {
    if (!limit) return;
    if (limit.category?.id) {
      setSelectedCategory(limit.category.id);
    }
    setSelectedLimitId(limit.id || null);
    if (limit.amount) {
      setAmount(limit.amount.toString());
    }
    if (limit.periodType) {
      setPeriodType(limit.periodType);
    }
    setIsRecurring(Boolean(limit.isRecurring));

    if (limit.periodType === 'SEMI_ANNUAL' || limit.periodType === 'ANNUAL') {
      if (limit.startDate) {
        setStartDate(new Date(limit.startDate).toISOString().split('T')[0]);
      }
      if (limit.endDate) {
        setEndDate(new Date(limit.endDate).toISOString().split('T')[0]);
      }
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      console.error('Введите название категории');
      return;
    }

    setIsCreatingCategory(true);
    try {
      const response = await fetch('/api/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName,
          description: newCategoryDescription || null,
          sortOrder: categories.length
        })
      });

      if (response.ok) {
        const data = await response.json();
        await loadCategories();
        setSelectedCategory(data.category.id);
        setShowCreateCategory(false);
        setNewCategoryName('');
        setNewCategoryDescription('');
      } else {
        const data = await response.json();
        console.error('Ошибка создания категории:', data.message);
      }
    } catch (error) {
      console.error('Error creating category:', error);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSave = () => {
    if (!selectedCategory) {
      console.error('Выберите категорию расходов');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      console.error('Введите корректную сумму');
      return;
    }

    const saveData: any = {
      objectId: balance?.objectId,
      categoryId: selectedCategory,
      amount: parseFloat(amount),
      periodType,
      isRecurring
    };

    // Для MONTHLY - добавляем месяц и год
    if (periodType === 'MONTHLY') {
      saveData.month = balance?.month;
      saveData.year = balance?.year;
      if (isRecurring && endMonth && endYear) {
        saveData.endDate = new Date(parseInt(endYear), parseInt(endMonth) - 1);
      }
    }

    // Для SEMI_ANNUAL и ANNUAL - добавляем даты
    if (periodType === 'SEMI_ANNUAL' || periodType === 'ANNUAL') {
      // Если дата не выбрана, используем текущую
      const start = startDate ? new Date(startDate) : new Date();
      
      // Автоматически рассчитываем конечную дату
      const end = new Date(start);
      if (periodType === 'SEMI_ANNUAL') {
        end.setMonth(end.getMonth() + 6);
      } else if (periodType === 'ANNUAL') {
        end.setFullYear(end.getFullYear() + 1);
      }
      
      saveData.startDate = start;
      saveData.endDate = end;
    }

    onSave(saveData);
    onClose();
    setSelectedCategory('');
    setAmount('');
    setPeriodType('MONTHLY');
    setStartDate('');
    setEndDate('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать лимит - {balance?.objectName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Категория расходов *</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(userRole === 'ADMIN' || userRole === 'DEPUTY_ADMIN') && (
            <div>
              {!showCreateCategory ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateCategory(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать новую категорию
                </Button>
              ) : (
                <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                  <div>
                    <label className="text-sm font-medium">Название категории *</label>
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Например: Офисные принадлежности"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Описание</label>
                    <Input
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                      placeholder="Краткое описание"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateCategory}
                      disabled={isCreatingCategory}
                    >
                      {isCreatingCategory ? 'Создание...' : 'Создать'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCreateCategory(false);
                        setNewCategoryName('');
                        setNewCategoryDescription('');
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Тип периода *</label>
            <Select value={periodType} onValueChange={(val: any) => setPeriodType(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип периода" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Ежедневно</SelectItem>
                <SelectItem value="MONTHLY">Ежемесячно</SelectItem>
                <SelectItem value="SEMI_ANNUAL">Раз в 6 месяцев</SelectItem>
                <SelectItem value="ANNUAL">Годовой</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Сумма лимита (руб.) *</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="40000"
            />
          </div>

          {/* Для MONTHLY - показываем месяц/год и повторение */}
          {periodType === 'MONTHLY' && (
            <>
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
            </>
          )}

          {/* Для SEMI_ANNUAL и ANNUAL - показываем дату начала */}
          {(periodType === 'SEMI_ANNUAL' || periodType === 'ANNUAL') && (
            <div>
              <label className="text-sm font-medium">Дата начала</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Если не указана, используется текущая дата"
              />
              <p className="text-xs text-gray-500 mt-1">
                {periodType === 'SEMI_ANNUAL' 
                  ? 'Конечная дата будет автоматически установлена через 6 месяцев'
                  : 'Конечная дата будет автоматически установлена через 1 год'}
              </p>
            </div>
          )}

          {/* Для DAILY - показываем чекбокс повторения */}
          {periodType === 'DAILY' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring-daily"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked === true)}
              />
              <label htmlFor="recurring-daily" className="text-sm">
                Повторять ежедневно
              </label>
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
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setWarning(null);
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/expense-categories?activeOnly=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSave = () => {
    if (!amount) {
      console.error('Пожалуйста, укажите сумму расхода');
      return;
    }
    
    const expenseData = {
      objectId: balance?.objectId,
      categoryId: selectedCategory || null,
      amount: parseFloat(amount),
      description: '',
      month: balance?.month,
      year: balance?.year
    };
    
    console.log('📝 Данные из модального окна:', expenseData);
    console.log('📊 Balance объект:', balance);
    
    onSave(expenseData);
    
    // Очищаем поля только после успешного сохранения
    setAmount('');
    setSelectedCategory('');
    setWarning(null);
    // onClose() теперь вызывается в handleSaveExpense после успешного ответа
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить расход - {balance?.objectName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {warning && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
              ⚠️ {warning}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Категория расходов</label>
            <Select value={selectedCategory || 'none'} onValueChange={(val) => setSelectedCategory(val === 'none' ? '' : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию (опционально)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без категории</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Сумма расхода (руб.) *</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
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
  const [activeTab, setActiveTab] = useState<'general' | 'categories'>('general');
  const [categoryStats, setCategoryStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editingLimit, setEditingLimit] = useState<{limitId: string, categoryName: string, currentAmount: number} | null>(null);
  const [newLimitAmount, setNewLimitAmount] = useState('');
  const [editingSpent, setEditingSpent] = useState<{categoryId: string, categoryName: string, currentSpent: number} | null>(null);
  const [newSpentAmount, setNewSpentAmount] = useState('');
  const [objectInfo, setObjectInfo] = useState<ObjectInfo | null>(null);

  useEffect(() => {
    if (isOpen && balance && activeTab === 'categories') {
      loadCategoryStats();
    }
  }, [isOpen, balance, activeTab]);

  useEffect(() => {
    if (isOpen && balance?.objectId) {
      loadObjectInfo(balance.objectId);
    } else if (!isOpen) {
      setObjectInfo(null);
    }
  }, [isOpen, balance?.objectId]);

  const loadCategoryStats = async () => {
    if (!balance) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/expenses/stats/${balance.objectId}?month=${balance.month}&year=${balance.year}`
      );
      if (response.ok) {
        const data = await response.json();
        setCategoryStats(data);
      }
    } catch (error) {
      console.error('Error loading category stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLimit = (limitId: string, categoryName: string, currentAmount: number) => {
    setEditingLimit({ limitId, categoryName, currentAmount });
    setNewLimitAmount(currentAmount.toString());
  };

  const handleSaveLimit = async () => {
    if (!editingLimit || !newLimitAmount) return;

    try {
      const response = await fetch(`/api/expense-limits/${editingLimit.limitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(newLimitAmount) })
      });

      if (response.ok) {
        setEditingLimit(null);
        setNewLimitAmount('');
        await loadCategoryStats(); // Перезагружаем данные
      } else {
        const error = await response.json();
        console.error('Ошибка при сохранении лимита:', error.message);
      }
    } catch (error) {
      console.error('Error saving limit:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingLimit(null);
    setNewLimitAmount('');
  };

  const handleEditSpent = (categoryId: string, categoryName: string, currentSpent: number) => {
    setEditingSpent({ categoryId, categoryName, currentSpent });
    setNewSpentAmount(currentSpent.toString());
  };

  const handleSaveSpent = async () => {
    if (!editingSpent || !newSpentAmount || !balance) return;

    const newAmount = parseFloat(newSpentAmount);
    const currentAmount = editingSpent.currentSpent;
    const difference = newAmount - currentAmount;

    if (difference === 0) {
      setEditingSpent(null);
      setNewSpentAmount('');
      return;
    }

    try {
      // Создаем корректирующий расход
      const response = await fetch('/api/inventory/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectId: balance.objectId,
          amount: difference,
          description: `Корректировка суммы расходов по категории "${editingSpent.categoryName}". Было: ${currentAmount.toLocaleString('ru-RU')} ₽, стало: ${newAmount.toLocaleString('ru-RU')} ₽`,
          month: balance.month,
          year: balance.year,
          categoryId: editingSpent.categoryId
        })
      });

      if (response.ok) {
        setEditingSpent(null);
        setNewSpentAmount('');
        await loadCategoryStats(); // Обновляем статистику
      } else {
        const error = await response.json();
        console.error('Ошибка при корректировке суммы:', error.error);
      }
    } catch (error) {
      console.error('Error saving spent amount:', error);
    }
  };

  const handleCancelSpentEdit = () => {
    setEditingSpent(null);
    setNewSpentAmount('');
  };

  const loadObjectInfo = async (objectId: string) => {
    try {
      const response = await fetch(`/api/objects/${objectId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setObjectInfo({
          id: data.id,
          name: data.name,
          address: data.address,
          manager: data.manager
        });
      }
    } catch (error) {
      console.error('Error loading object info:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Детальная аналитика расходов - {objectInfo?.name || balance?.objectName}
          </DialogTitle>
          {(objectInfo?.address || objectInfo?.manager?.name) && (
            <p className="text-sm text-gray-500">
              {objectInfo?.address && <span>{objectInfo.address}</span>}
              {objectInfo?.address && objectInfo?.manager?.name && <span> • </span>}
              {objectInfo?.manager?.name && <span>Менеджер: {objectInfo.manager.name}</span>}
            </p>
          )}
        </DialogHeader>

        {/* Вкладки */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'general'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Общее
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'categories'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              По статьям
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          {/* Вкладка "Общее" */}
          {activeTab === 'general' && balance && (
            <ExpenseChart 
              objectId={balance.objectId} 
              objectName={balance.objectName}
            />
          )}

          {/* Вкладка "По статьям" */}
          {activeTab === 'categories' && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : categoryStats ? (
                <div className="space-y-6">
                  {/* Общая статистика */}
                  {categoryStats.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600 mb-1">Всего потрачено</div>
                          <div className="text-2xl font-bold text-gray-900">
                            {categoryStats.summary.totalSpent.toLocaleString('ru-RU')} ₽
                          </div>
                        </CardContent>
                      </Card>
                      {categoryStats.summary.totalLimit && (
                        <>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-gray-600 mb-1">Общий лимит</div>
                              <div className="text-2xl font-bold text-gray-900">
                                {categoryStats.summary.totalLimit.toLocaleString('ru-RU')} ₽
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-gray-600 mb-1">Остаток</div>
                              <div className={`text-2xl font-bold ${
                                categoryStats.summary.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {categoryStats.summary.totalRemaining.toLocaleString('ru-RU')} ₽
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      )}
                    </div>
                  )}

                  {/* Карточки по категориям */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryStats.categories?.map((cat: any) => (
                      <Card key={cat.category.id} className={cat.percentage >= 100 ? 'border-red-200 bg-red-50' : ''}>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-3">{cat.category.name}</h3>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Потрачено:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{cat.spent.toLocaleString('ru-RU')} ₽</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleEditSpent(cat.category.id, cat.category.name, cat.spent)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {cat.hasLimit && (
                              <>
                                {/* Тип периода и лимит */}
                                {cat.limits && cat.limits.length > 0 && (
                                  <>
                                    {/* Для годовых и полугодовых - показываем общую сумму */}
                                    {(cat.limits[0].periodType === 'ANNUAL' || cat.limits[0].periodType === 'SEMI_ANNUAL') && (
                                      <div className="bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                                        <div className="flex justify-between items-center text-xs text-blue-700 mb-1">
                                          <span className="font-medium">
                                            {cat.limits[0].periodType === 'ANNUAL' ? '📅 Годовой лимит' : '📅 Полугодовой лимит'}
                                          </span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-5 w-5 p-0 hover:bg-blue-100"
                                            onClick={() => handleEditLimit(cat.limits[0].id, cat.category.name, cat.limits[0].amount)}
                                          >
                                            <Edit className="h-3 w-3 text-blue-700" />
                                          </Button>
                                        </div>
                                        <div className="flex justify-between items-baseline">
                                          <span className="text-xs text-blue-600">Общая сумма:</span>
                                          <span className="text-sm font-bold text-blue-900">
                                            {cat.limits[0].amount.toLocaleString('ru-RU')} ₽
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-baseline mt-1">
                                          <span className="text-xs text-blue-600">На месяц:</span>
                                          <span className="text-sm font-medium text-blue-800">
                                            {cat.limit?.toLocaleString('ru-RU')} ₽
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Для месячных и дневных - обычное отображение */}
                                    {(cat.limits[0].periodType === 'MONTHLY' || cat.limits[0].periodType === 'DAILY') && (
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">
                                          {cat.limits[0].periodType === 'MONTHLY' ? '📅 Лимит (месяц):' : '📅 Лимит (день × ' + new Date(balance?.year || new Date().getFullYear(), balance?.month || new Date().getMonth() + 1, 0).getDate() + '):'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{cat.limit?.toLocaleString('ru-RU')} ₽</span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={() => handleEditLimit(cat.limits[0].id, cat.category.name, cat.limits[0].amount)}
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                                
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Остаток:</span>
                                  <span className={`font-medium ${
                                    (cat.remaining || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {cat.remaining?.toLocaleString('ru-RU')} ₽
                                  </span>
                                </div>
                                
                                {/* Прогресс-бар */}
                                <div className="mt-3">
                                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Использовано</span>
                                    <span>{cat.percentage.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        cat.percentage >= 100
                                          ? 'bg-red-600'
                                          : cat.percentage >= 90
                                          ? 'bg-yellow-600'
                                          : 'bg-green-600'
                                      }`}
                                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                                    />
                                  </div>
                                </div>

                                {cat.percentage >= 100 && (
                                  <div className="mt-2 text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                                    ⚠️ Лимит превышен
                                  </div>
                                )}
                                {cat.percentage >= 90 && cat.percentage < 100 && (
                                  <div className="mt-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                                    ⚠️ Лимит почти исчерпан
                                  </div>
                                )}
                              </>
                            )}

                            {!cat.hasLimit && (
                              <div className="mt-2 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                Лимит не установлен
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {(!categoryStats.categories || categoryStats.categories.length === 0) && (
                    <div className="text-center py-12 text-gray-500">
                      <p>Нет данных по категориям за выбранный период</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>Не удалось загрузить статистику</p>
                </div>
              )}
            </div>
          )}

        </div>
      </DialogContent>

      {/* Модальное окно редактирования лимита */}
      {editingLimit && (
        <Dialog open={!!editingLimit} onOpenChange={() => handleCancelEdit()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Редактировать лимит</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Категория</label>
                <div className="mt-1 text-sm text-gray-900">{editingLimit.categoryName}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Текущий лимит</label>
                <div className="mt-1 text-sm text-gray-500">
                  {editingLimit.currentAmount.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Новый лимит (₽)</label>
                <Input
                  type="number"
                  value={newLimitAmount}
                  onChange={(e) => setNewLimitAmount(e.target.value)}
                  placeholder="Введите новый лимит"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelEdit}>
                  Отмена
                </Button>
                <Button onClick={handleSaveLimit} disabled={!newLimitAmount}>
                  Сохранить
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Модальное окно редактирования суммы расходов */}
      {editingSpent && (
        <Dialog open={!!editingSpent} onOpenChange={() => handleCancelSpentEdit()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Редактировать сумму расходов</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Категория</label>
                <div className="mt-1 text-sm text-gray-900">{editingSpent.categoryName}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Текущая сумма</label>
                <div className="mt-1 text-sm text-gray-500">
                  {editingSpent.currentSpent.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Новая сумма (₽)</label>
                <Input
                  type="number"
                  value={newSpentAmount}
                  onChange={(e) => setNewSpentAmount(e.target.value)}
                  placeholder="Введите новую сумму"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelSpentEdit}>
                  Отмена
                </Button>
                <Button onClick={handleSaveSpent} disabled={!newSpentAmount}>
                  Сохранить
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

// Модальное окно массового выставления лимитов
function BulkLimitModal({ isOpen, onClose, balances, onSave }: BulkLimitModalProps) {
  const [categoryId, setCategoryId] = useState('');
  const [periodType, setPeriodType] = useState<'MONTHLY' | 'DAILY' | 'SEMI_ANNUAL' | 'ANNUAL'>('MONTHLY');
  const [amount, setAmount] = useState('');
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/expense-categories?activeOnly=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSave = () => {
    if (!categoryId || !amount || selectedObjects.length === 0) {
      console.error('Заполните все обязательные поля: категория, сумма и выберите объекты');
      return;
    }

    const data: BulkLimitData = {
      categoryId,
      periodType,
      amount: parseFloat(amount),
      objectIds: selectedObjects
    };

    if (periodType === 'MONTHLY') {
      data.month = month;
      data.year = year;
      data.isRecurring = isRecurring;
    } else if (periodType === 'SEMI_ANNUAL' || periodType === 'ANNUAL') {
      // Если дата не выбрана, используем текущую
      const start = startDate ? new Date(startDate) : new Date();
      
      // Автоматически рассчитываем конечную дату
      const end = new Date(start);
      if (periodType === 'SEMI_ANNUAL') {
        end.setMonth(end.getMonth() + 6);
      } else if (periodType === 'ANNUAL') {
        end.setFullYear(end.getFullYear() + 1);
      }
      
      data.startDate = start;
      data.endDate = end;
    }

    onSave(data);
    
    // Сброс формы
    setCategoryId('');
    setAmount('');
    setSelectedObjects([]);
    setIsRecurring(false);
    setStartDate('');
    setEndDate('');
  };

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Массовое выставление лимитов по категориям</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Выбор категории */}
          <div>
            <label className="text-sm font-medium">Категория расходов *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md"
            >
              <option value="">Выберите категорию</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Тип периода */}
          <div>
            <label className="text-sm font-medium">Тип периода *</label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as any)}
              className="w-full mt-1 px-3 py-2 border rounded-md"
            >
              <option value="MONTHLY">Ежемесячный</option>
              <option value="DAILY">Ежедневный</option>
              <option value="SEMI_ANNUAL">Полугодовой</option>
              <option value="ANNUAL">Годовой</option>
            </select>
          </div>

          {/* Сумма */}
          <div>
            <label className="text-sm font-medium">Сумма лимита (руб.) *</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10000"
            />
          </div>

          {/* Поля для MONTHLY */}
          {periodType === 'MONTHLY' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Месяц</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    {monthNames.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Год</label>
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                  />
                </div>
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
            </>
          )}

          {/* Поля для SEMI_ANNUAL и ANNUAL */}
          {(periodType === 'SEMI_ANNUAL' || periodType === 'ANNUAL') && (
            <div>
              <label className="text-sm font-medium">Дата начала</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Если не указана, используется текущая дата"
              />
              <p className="text-xs text-gray-500 mt-1">
                {periodType === 'SEMI_ANNUAL' 
                  ? 'Конечная дата будет автоматически установлена через 6 месяцев'
                  : 'Конечная дата будет автоматически установлена через 1 год'}
              </p>
            </div>
          )}

          {/* Выбор объектов */}
          <div>
            <label className="text-sm font-medium mb-2 block">Выберите объекты *</label>
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
  const [searchQuery, setSearchQuery] = useState('');
  
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
    console.log('🔍 Сохранение лимита, данные:', data);
    
    try {
      // Используем новый API для лимитов по категориям
      const payload: any = {
        categoryId: data.categoryId,
        amount: data.amount,
        periodType: data.periodType,
        isRecurring: data.isRecurring
      };

      // Добавляем поля в зависимости от типа периода
      if (data.periodType === 'MONTHLY') {
        payload.month = data.month;
        payload.year = data.year;
        if (data.endDate) {
          payload.endDate = data.endDate;
        }
      } else if (data.periodType === 'SEMI_ANNUAL' || data.periodType === 'ANNUAL') {
        // Конвертируем Date объекты в ISO строки
        payload.startDate = data.startDate instanceof Date ? data.startDate.toISOString() : data.startDate;
        payload.endDate = data.endDate instanceof Date ? data.endDate.toISOString() : data.endDate;
      }

      console.log('📤 Отправляем payload:', payload);

      const response = await fetch(`/api/objects/${data.objectId}/expense-limits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        // Обновляем данные без перезагрузки страницы
        await fetchBalances();
        setEditLimitModal({isOpen: false, balance: null});
      } else {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        // Показываем ошибку в консоли, но не блокируем UI
      }
    } catch (error) {
      console.error('❌ Error saving limit:', error);
      // Ошибка в консоли, но не блокируем UI
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
      
      const responseData = await response.json();
      
      if (response.ok) {
        fetchBalances();
        setAddExpenseModal({isOpen: false, balance: null});
        
        // Логируем предупреждение если есть
        if (responseData.warning) {
          console.warn('⚠️ Расход добавлен с предупреждением:', responseData.warning);
        }
      } else {
        console.error('Error response:', responseData);
        if (responseData.limitExceeded) {
          console.error('❌ Превышен лимит:', responseData.warning || responseData.message);
        } else {
          console.error('Ошибка:', responseData.error || responseData.message);
        }
      }
    } catch (error) {
      console.error('Error saving expense:', error);
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
        console.error('Ошибка:', errorData.error || 'Не удалось установить лимиты');
      }
    } catch (error) {
      console.error('Error saving bulk limits:', error);
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

  // Фильтрация балансов по поисковому запросу
  const filteredBalances = balances.filter(balance => {
    const query = searchQuery.toLowerCase();
    return (
      balance.objectName.toLowerCase().includes(query) ||
      balance.objectAddress.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Загрузка данных...</p>
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

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Поиск по названию объекта или адресу..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 py-6 text-base"
        />
      </div>

          {/* Отчет по объектам */}
          {filteredBalances.length === 0 ? (
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
          {filteredBalances.map((balance) => (
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
