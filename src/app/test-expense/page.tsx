'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function TestExpensePage() {
  const [objectId, setObjectId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testExpense = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          objectId,
          amount: parseFloat(amount),
          description
        })
      });

      const data = await response.json();
      setResult({
        status: response.status,
        data
      });
    } catch (error) {
      setResult({
        status: 'ERROR',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Тест создания расходов</h1>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">ID объекта</label>
          <Input
            value={objectId}
            onChange={(e) => setObjectId(e.target.value)}
            placeholder="Введите ID объекта"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Сумма</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Описание</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Тестовый расход"
            rows={3}
          />
        </div>
        
        <Button 
          onClick={testExpense} 
          disabled={loading || !objectId || !amount || !description}
          className="w-full"
        >
          {loading ? 'Создание...' : 'Создать тестовый расход'}
        </Button>
      </div>

      {result && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-bold mb-2">Результат:</h3>
          <div className="mb-2">
            <strong>Статус:</strong> {result.status}
          </div>
          <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-bold mb-2">📋 Инструкции:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Войдите в систему как администратор или менеджер</li>
          <li>Получите ID любого объекта из /objects</li>
          <li>Введите данные и нажмите "Создать тестовый расход"</li>
          <li>Проверьте результат и логи в консоли</li>
        </ol>
      </div>
    </div>
  );
}
