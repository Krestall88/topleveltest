'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Calendar, TrendingUp } from 'lucide-react';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ExpenseChartModalProps {
  objectId: string;
  onClose: () => void;
}

interface ChartData {
  month: string;
  year: number;
  limit: number;
  spent: number;
  balance: number;
}

interface ObjectInfo {
  id: string;
  name: string;
  address: string;
}

export default function ExpenseChartModal({ objectId, onClose }: ExpenseChartModalProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [objectInfo, setObjectInfo] = useState<ObjectInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('3'); // По умолчанию 3 месяца
  const [startMonth, setStartMonth] = useState(new Date().getMonth() - 2); // 3 месяца назад
  const [startYear, setStartYear] = useState(new Date().getFullYear());

  const months = [
    'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
    'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
  ];

  const fullMonths = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  useEffect(() => {
    fetchData();
  }, [objectId, selectedPeriod, startMonth, startYear]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Получаем информацию об объекте
      const objectResponse = await fetch(`/api/objects/${objectId}`);
      if (objectResponse.ok) {
        const objectData = await objectResponse.json();
        setObjectInfo(objectData);
      }

      // Генерируем данные для графика
      const monthsCount = parseInt(selectedPeriod);
      const data: ChartData[] = [];
      
      let currentMonth = startMonth;
      let currentYear = startYear;
      
      // Корректируем отрицательные месяцы
      while (currentMonth < 0) {
        currentMonth += 12;
        currentYear -= 1;
      }

      for (let i = 0; i < monthsCount; i++) {
        const month = (currentMonth + i) % 12;
        const year = currentYear + Math.floor((currentMonth + i) / 12);
        
        // Получаем данные по балансу для каждого месяца
        const balanceResponse = await fetch(`/api/inventory/balance?objectId=${objectId}&month=${month + 1}&year=${year}`);
        
        let limitAmount = 0;
        let spentAmount = 0;
        
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          limitAmount = balanceData.limitAmount || 0;
          spentAmount = balanceData.totalSpent || 0;
        }
        
        data.push({
          month: `${months[month]} ${year}`,
          year: year,
          limit: limitAmount,
          spent: spentAmount,
          balance: limitAmount - spentAmount
        });
      }
      
      setChartData(data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    
    // Устанавливаем начальный месяц в зависимости от выбранного периода
    const currentDate = new Date();
    const monthsBack = parseInt(period) - 1;
    
    let newStartMonth = currentDate.getMonth() - monthsBack;
    let newStartYear = currentDate.getFullYear();
    
    while (newStartMonth < 0) {
      newStartMonth += 12;
      newStartYear -= 1;
    }
    
    setStartMonth(newStartMonth);
    setStartYear(newStartYear);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };


  // Подсчитываем общую статистику
  const totalLimit = chartData.reduce((sum, item) => sum + item.limit, 0);
  const totalSpent = chartData.reduce((sum, item) => sum + item.spent, 0);
  const totalBalance = totalLimit - totalSpent;
  const avgMonthlySpent = chartData.length > 0 ? totalSpent / chartData.length : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">Анализ расходов</h2>
            {objectInfo && (
              <p className="text-gray-600">{objectInfo.name}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6">
          {/* Фильтры */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium">Период:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1"
              >
                <option value="3">3 месяца</option>
                <option value="6">6 месяцев</option>
                <option value="12">12 месяцев</option>
              </select>
            </div>
            
            {/* Кастомный период */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">С:</label>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {fullMonths.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
              <select
                value={startYear}
                onChange={(e) => setStartYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Общий лимит</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalLimit)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Потрачено</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Остаток</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(totalBalance)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Средний расход</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(avgMonthlySpent)}</div>
                <p className="text-xs text-muted-foreground">в месяц</p>
              </CardContent>
            </Card>
          </div>

          {/* График */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Лимиты vs Расходы
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Загрузка данных...</div>
              ) : (
                <div className="space-y-4">
                  {/* Простая визуализация вместо графика */}
                  {chartData.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{item.month}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.balance < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {item.balance < 0 ? 'Превышение' : 'В норме'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Лимит</div>
                          <div className="font-medium text-blue-600">{formatCurrency(item.limit)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Потрачено</div>
                          <div className="font-medium text-red-600">{formatCurrency(item.spent)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Остаток</div>
                          <div className={`font-medium ${item.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(item.balance)}
                          </div>
                        </div>
                      </div>
                      {/* Простая полоса прогресса */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${item.balance < 0 ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ 
                              width: `${Math.min(100, (item.spent / item.limit) * 100)}%` 
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Использовано: {item.limit > 0 ? Math.round((item.spent / item.limit) * 100) : 0}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Таблица с детальными данными */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Детальная информация</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Период</th>
                      <th className="text-right py-2">Лимит</th>
                      <th className="text-right py-2">Потрачено</th>
                      <th className="text-right py-2">Остаток</th>
                      <th className="text-center py-2">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2">{item.month}</td>
                        <td className="text-right py-2">{formatCurrency(item.limit)}</td>
                        <td className="text-right py-2">{formatCurrency(item.spent)}</td>
                        <td className={`text-right py-2 font-medium ${item.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(item.balance)}
                        </td>
                        <td className="text-center py-2">
                          {item.balance < 0 ? (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                              Превышение
                            </span>
                          ) : item.limit === 0 ? (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                              Нет лимита
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                              В норме
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
