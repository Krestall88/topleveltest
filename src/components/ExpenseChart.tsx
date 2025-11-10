'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
  Filter,
  DollarSign
} from 'lucide-react';

// Динамический импорт Chart.js только на клиенте
let Chart: any = null;

interface ChartData {
  month: string;
  monthNumber: number;
  year: number;
  limit: number;
  spent: number;
  balance: number;
  isOverBudget: boolean;
  expenseDetails: Array<{
    amount: number;
    description: string;
    date: string;
    recordedBy: string;
  }>;
}

interface ChartSummary {
  totalLimit: number;
  totalSpent: number;
  totalBalance: number;
  overBudgetMonths: number;
}

interface ExpenseChartProps {
  objectId: string;
  objectName: string;
}

export default function ExpenseChart({ objectId, objectName }: ExpenseChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [summary, setSummary] = useState<ChartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthsCount, setMonthsCount] = useState(1);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [chartLoaded, setChartLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const chartInstance = useRef<any>(null);

  // Динамический импорт Chart.js
  useEffect(() => {
    setMounted(true);
    const loadChart = async () => {
      try {
        if (!Chart) {
          const ChartModule = await import('chart.js/auto');
          Chart = ChartModule.default;
        }
        setChartLoaded(true);
      } catch (error) {
        console.error('Ошибка загрузки Chart.js:', error);
      }
    };
    loadChart();
  }, []);

  useEffect(() => {
    if (objectId) {
      fetchChartData();
    }
  }, [objectId, monthsCount]);

  useEffect(() => {
    if (chartLoaded && Chart && chartData.length > 0 && chartRef.current) {
      renderChart();
    }
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [chartLoaded, chartData, chartType]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/inventory/chart-data?objectId=${objectId}&months=${monthsCount}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setChartData(data.chartData);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    if (!Chart || !chartRef.current || chartData.length === 0) return;

    // Уничтожаем предыдущий график
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const labels = chartData.map(item => item.month);
    const limitData = chartData.map(item => item.limit);
    const spentData = chartData.map(item => item.spent);
    const balanceData = chartData.map(item => item.balance);

    chartInstance.current = new Chart(ctx, {
      type: chartType,
      data: {
        labels,
        datasets: [
          {
            label: 'Лимит',
            data: limitData,
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
            tension: 0.4
          },
          {
            label: 'Потрачено',
            data: spentData,
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 2,
            tension: 0.4
          },
          {
            label: 'Остаток/Превышение',
            data: balanceData,
            backgroundColor: chartData.map(item => 
              item.balance >= 0 
                ? 'rgba(34, 197, 94, 0.8)'  // Зеленый для положительного остатка
                : 'rgba(220, 38, 127, 0.8)' // Ярко-розовый для превышения
            ),
            borderColor: chartData.map(item => 
              item.balance >= 0 
                ? 'rgba(34, 197, 94, 1)' 
                : 'rgba(220, 38, 127, 1)'
            ),
            borderWidth: 2,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          title: {
            display: true,
            text: `Финансовая отчетность - ${objectName}`,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const value = context.parsed.y;
                const datasetLabel = context.dataset.label;
                
                if (datasetLabel === 'Остаток/Превышение') {
                  const prefix = value >= 0 ? 'Остаток: ' : 'Превышение: ';
                  const absValue = Math.abs(value);
                  return `${prefix}${new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB'
                  }).format(absValue)}`;
                }
                
                return `${datasetLabel}: ${new Intl.NumberFormat('ru-RU', {
                  style: 'currency',
                  currency: 'RUB'
                }).format(value)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value: any) {
                return new Intl.NumberFormat('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(value as number);
              }
            }
          }
        }
      }
    });

    // Принудительное обновление размеров
    setTimeout(() => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    }, 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!mounted) return dateString;
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch {
      return dateString;
    }
  };

  const downloadChart = () => {
    if (chartInstance.current) {
      const link = document.createElement('a');
      link.download = `expense-chart-${objectName}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = chartInstance.current.toBase64Image();
      link.click();
    }
  };

  if (loading || !mounted || !chartLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Управление графиком */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            График расходов - {objectName}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Анализ лимитов и расходов за {monthsCount === 1 ? 'текущий месяц' : `${monthsCount} месяцев`}
          </p>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <Select value={monthsCount.toString()} onValueChange={(value) => setMonthsCount(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Текущий</SelectItem>
              <SelectItem value="3">3 месяца</SelectItem>
              <SelectItem value="6">6 месяцев</SelectItem>
              <SelectItem value="12">12 месяцев</SelectItem>
            </SelectContent>
          </Select>

          <Select value={chartType} onValueChange={(value: 'bar' | 'line') => setChartType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Столбцы</SelectItem>
              <SelectItem value="line">Линии</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={downloadChart}
            className="flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            Скачать
          </Button>
        </div>
      </div>

      {/* Сводная статистика */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Общий лимит</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(summary.totalLimit)}</p>
                </div>
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Потрачено</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(summary.totalSpent)}</p>
                </div>
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Остаток</p>
                  <p className={`text-lg font-bold ${summary.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.totalBalance)}
                  </p>
                </div>
                <TrendingUp className={`w-6 h-6 ${summary.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Превышение</p>
                  <p className="text-lg font-bold text-red-600">
                    {summary.totalBalance < 0 ? formatCurrency(Math.abs(summary.totalBalance)) : '—'}
                  </p>
                </div>
                <Calendar className="w-6 h-6 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* График */}
      <Card>
        <CardContent className="p-6">
          <div className="relative h-96 w-full">
            <canvas ref={chartRef}></canvas>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              💡 <strong>Пояснение:</strong> 
              <span className="text-blue-600"> Синие столбцы</span> - установленные лимиты, 
              <span className="text-red-600"> красные</span> - потраченные суммы, 
              <span className="text-green-600"> зеленые</span> - остаток средств, 
              <span className="text-pink-600"> розовые (вниз)</span> - превышение лимита
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Детальная информация по месяцам */}
      <div className="grid gap-4">
        {chartData.map((monthData, index) => (
          <Card key={index} className={monthData.isOverBudget ? 'border-red-200 bg-red-50' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{monthData.month}</CardTitle>
                {monthData.isOverBudget && (
                  <Badge variant="destructive">Превышение лимита</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Лимит</p>
                  <p className="font-medium text-blue-600">{formatCurrency(monthData.limit)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Потрачено</p>
                  <p className="font-medium text-red-600">{formatCurrency(monthData.spent)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Остаток</p>
                  <p className={`font-medium ${monthData.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(monthData.balance)}
                  </p>
                </div>
              </div>

            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
