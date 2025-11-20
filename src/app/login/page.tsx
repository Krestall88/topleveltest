'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ManualViewer from '@/components/ManualViewer';
import { BookOpen } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Ошибка аутентификации');
      }

      const { token, user } = await res.json();
      // Store token in cookie
      document.cookie = `token=${token}; path=/; max-age=86400;`; // Expires in 1 day

      // Редирект в зависимости от роли
      if (user.role === 'ACCOUNTANT') {
        router.push('/inventory'); // Бухгалтер → Инвентарь
      } else {
        router.push('/'); // Остальные → Дашборд
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const quickLogin = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Вход в систему</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <button
            type="submit"
            className="w-full py-2 text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Войти
          </button>
        </form>

        {/* Кнопка инструкции */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="w-full py-2 text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            Инструкция пользователя
          </button>
        </div>
      </div>

      {/* Компонент просмотра мануала */}
      <ManualViewer
        isOpen={showManual}
        onClose={() => setShowManual(false)}
      />
    </div>
  );
}
