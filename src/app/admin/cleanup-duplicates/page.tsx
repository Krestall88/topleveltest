'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DuplicateGroup {
  key: string;
  count: number;
  objectName: string;
  categoryName: string;
  periodType: string;
  limits: Array<{
    id: string;
    amount: string;
    createdAt: string;
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
  }>;
}

interface CleanupResult {
  totalLimits: number;
  duplicateGroups: number;
  totalDuplicates: number;
  duplicates: DuplicateGroup[];
}

export default function CleanupDuplicatesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [deleteResult, setDeleteResult] = useState<any>(null);

  const checkDuplicates = async () => {
    setLoading(true);
    setDeleteResult(null);
    try {
      const response = await fetch('/api/expense-limits/cleanup-duplicates', {
        method: 'GET'
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        alert('Ошибка: ' + response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Ошибка при проверке дубликатов');
    } finally {
      setLoading(false);
    }
  };

  const deleteDuplicates = async () => {
    if (!confirm('Вы уверены, что хотите удалить все дубликаты? Это действие необратимо!')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/expense-limits/cleanup-duplicates', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setDeleteResult(data);
        // Перезагружаем список после удаления
        await checkDuplicates();
      } else {
        alert('Ошибка: ' + response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Ошибка при удалении дубликатов');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Очистка дубликатов лимитов расходов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={checkDuplicates} 
                disabled={loading}
              >
                {loading ? 'Проверка...' : 'Проверить дубликаты'}
              </Button>
              
              {result && result.totalDuplicates > 0 && (
                <Button 
                  onClick={deleteDuplicates} 
                  disabled={loading}
                  variant="destructive"
                >
                  {loading ? 'Удаление...' : `Удалить ${result.totalDuplicates} дубликатов`}
                </Button>
              )}
            </div>

            {deleteResult && (
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800 font-semibold">
                  ✅ {deleteResult.message}
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600">Всего лимитов</div>
                      <div className="text-2xl font-bold">{result.totalLimits}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600">Групп дубликатов</div>
                      <div className="text-2xl font-bold text-orange-600">{result.duplicateGroups}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600">Всего дубликатов</div>
                      <div className="text-2xl font-bold text-red-600">{result.totalDuplicates}</div>
                    </CardContent>
                  </Card>
                </div>

                {result.duplicates.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Найденные дубликаты:</h3>
                    {result.duplicates.map((group, idx) => (
                      <Card key={idx} className="border-red-200 bg-red-50">
                        <CardContent className="p-4">
                          <div className="mb-2">
                            <span className="font-semibold">Объект:</span> {group.objectName} | 
                            <span className="font-semibold ml-2">Категория:</span> {group.categoryName} | 
                            <span className="font-semibold ml-2">Тип:</span> {group.periodType}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            Найдено {group.count} одинаковых лимитов:
                          </div>
                          <div className="space-y-2">
                            {group.limits.map((limit, limitIdx) => (
                              <div 
                                key={limit.id} 
                                className={`p-2 rounded ${limitIdx === 0 ? 'bg-green-100 border border-green-300' : 'bg-white border border-gray-300'}`}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    {limitIdx === 0 && <span className="text-green-700 font-semibold mr-2">✅ ОСТАВИТЬ</span>}
                                    {limitIdx > 0 && <span className="text-red-700 font-semibold mr-2">❌ УДАЛИТЬ</span>}
                                    <span className="font-mono text-xs">{limit.id}</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold">{limit.amount} ₽</div>
                                    <div className="text-xs text-gray-600">
                                      Создан: {new Date(limit.createdAt).toLocaleString('ru-RU')}
                                    </div>
                                    {limit.month && limit.year && (
                                      <div className="text-xs text-gray-600">
                                        {limit.month}/{limit.year}
                                      </div>
                                    )}
                                    {limit.startDate && limit.endDate && (
                                      <div className="text-xs text-gray-600">
                                        {new Date(limit.startDate).toLocaleDateString('ru-RU')} - {new Date(limit.endDate).toLocaleDateString('ru-RU')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-xl">✅ Дубликаты не найдены!</p>
                    <p className="text-sm mt-2">Все лимиты уникальны</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
