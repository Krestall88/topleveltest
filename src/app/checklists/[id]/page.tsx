'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Task, TaskStatus } from '@prisma/client';
import AppLayout from '@/components/AppLayout';

interface Checklist {
  id: string;
  date: string;
  object: { id: string; name: string };
  tasks: Task[];
}

const statusStyles: Record<string, string> = {
  NEW: 'bg-gray-200 text-gray-800',
  AVAILABLE: 'bg-yellow-200 text-yellow-800',
  IN_PROGRESS: 'bg-blue-200 text-blue-800',
  COMPLETED: 'bg-green-200 text-green-800',
  OVERDUE: 'bg-red-200 text-red-800',
  FAILED: 'bg-red-300 text-red-900',
  CLOSED_WITH_PHOTO: 'bg-purple-200 text-purple-800',
};

const statusRussian: Record<string, string> = {
  NEW: 'Новая',
  AVAILABLE: 'Доступна',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнено',
  OVERDUE: 'Просрочена',
  FAILED: 'Не выполнена',
  CLOSED_WITH_PHOTO: 'Выполнено с фото',
}

export default function ChecklistPage() {
  const { id } = useParams();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchChecklist = async () => {
    try {
      const res = await fetch(`/api/checklists/${id}`);
      if (!res.ok) throw new Error('Не удалось загрузить чек-лист');
      setChecklist(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchChecklist();
  }, [id]);

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Не удалось обновить статус');
      // Refresh data
      fetchChecklist();
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
    }
  };

  if (isLoading) return <div className="text-center py-10">Загрузка...</div>;
  if (error) return <div className="text-center py-10 text-red-500">Ошибка: {error}</div>;
  if (!checklist) return <div className="text-center py-10">Чек-лист не найден.</div>;

  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <Link href={`/objects/${checklist.object.id}`} className="text-blue-600 hover:underline mb-4 inline-block">&larr; Назад к объекту</Link>

        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-3xl font-bold">Чек-лист для: {checklist.object.name}</h1>
          <p className="text-lg text-gray-600 mb-6">Дата: {new Date(checklist.date).toLocaleDateString()}</p>

          <div className="space-y-4">
            {checklist.tasks.map(task => (
              <div key={task.id} className="p-4 border rounded-md">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">{task.description}</h3>
                    <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${statusStyles[task.status] || 'bg-gray-200 text-gray-800'}`}>
                      {statusRussian[task.status] || task.status}
                    </span>
                  </div>
                </div>
                
                {/* Кнопки управления задачей */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                  {task.status === 'NEW' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        🚀 Взять в работу
                      </button>
                    </>
                  )}
                  
                  {task.status === 'AVAILABLE' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        🚀 Взять в работу
                      </button>
                    </>
                  )}
                  
                  {task.status === 'IN_PROGRESS' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(task.id, 'COMPLETED')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                      >
                        ✅ Выполнено
                      </button>
                      <button
                        onClick={() => handleStatusChange(task.id, 'CLOSED_WITH_PHOTO')}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                      >
                        📷 Выполнено с фото
                      </button>
                      <button
                        onClick={() => handleStatusChange(task.id, 'FAILED')}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        ❌ Не могу выполнить
                      </button>
                    </>
                  )}
                  
                  {(task.status === 'COMPLETED' || task.status === 'CLOSED_WITH_PHOTO') && (
                    <>
                      <button
                        onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                        className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                      >
                        🔄 Вернуть в работу
                      </button>
                    </>
                  )}
                  
                  {task.status === 'FAILED' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        🔄 Попробовать снова
                      </button>
                    </>
                  )}
                  
                  {task.status === 'OVERDUE' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        🚀 Взять в работу
                      </button>
                      <button
                        onClick={() => handleStatusChange(task.id, 'COMPLETED')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                      >
                        ✅ Выполнено
                      </button>
                      <button
                        onClick={() => handleStatusChange(task.id, 'FAILED')}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        ❌ Не могу выполнить
                      </button>
                    </>
                  )}
                  
                  {/* Дополнительные опции для всех статусов */}
                  <div className="ml-auto">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                      className="p-1 text-xs border rounded bg-white text-gray-600"
                      title="Изменить статус"
                    >
                      <option value="NEW">Новая</option>
                      <option value="AVAILABLE">Доступна</option>
                      <option value="IN_PROGRESS">В работе</option>
                      <option value="COMPLETED">Выполнено</option>
                      <option value="OVERDUE">Просрочена</option>
                      <option value="FAILED">Не выполнена</option>
                      <option value="CLOSED_WITH_PHOTO">Выполнено с фото</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
