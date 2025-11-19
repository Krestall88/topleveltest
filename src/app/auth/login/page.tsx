'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ManualViewer from '@/components/ManualViewer';
import { BookOpen } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        // Токен теперь автоматически сохраняется в cookie на сервере
        console.log('✅ Успешный вход:', data.user.name, 'Роль:', data.user.role);
        
        // Редирект в зависимости от роли
        if (data.user.role === 'MANAGER') {
          router.push('/objects'); // Менеджеры сразу на объекты
        } else {
          router.push('/'); // Остальные на дашборд
        }
        router.refresh(); // Обновляем страницу для применения аутентификации
      } else {
        const errorData = await response.json();
        setError(errorData.message || errorData.error || 'Ошибка входа');
      }
    } catch (error) {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            🧹 Клининг-Контроль
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>

          {/* Кнопка инструкции */}
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowManual(true)}
              className="w-full flex items-center justify-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Инструкция пользователя
            </Button>
            <p className="mt-3 text-center text-sm text-gray-500">
              <span>Нет доступа? </span>
              <Link
                href="/manual"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                Открыть инструкцию без входа
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Компонент просмотра мануала */}
      <ManualViewer
        isOpen={showManual}
        onClose={() => setShowManual(false)}
      />
    </div>
  );
}
