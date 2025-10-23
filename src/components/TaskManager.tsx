'use client';

import React, { useState, useEffect } from 'react';
import TaskCompletionModal from '@/components/TaskCompletionModal';

interface Task {
  id: string;
  description: string;
  status: 'NEW' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED_WITH_PHOTO' | 'OVERDUE' | 'FAILED';
  photoUrl?: string;
  completedAt?: string;
  completedBy?: { name: string };
  room?: { name: string };
  objectName?: string;
  roomName?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  failureReason?: string;
  completionComment?: string;
  completionPhotos?: string[];
  checklist?: {
    id: string;
    date: string;
    object: {
      id: string;
      name: string;
      address: string;
      requirePhotoForCompletion?: boolean;
      requireCommentForCompletion?: boolean;
      completionRequirements?: {
        photo: boolean;
        comment: boolean;
        minPhotos?: number;
        photoDescription?: string;
        commentDescription?: string;
      };
    };
    room?: {
      id: string;
      name: string;
    };
  };
  expenses?: Array<{
    id: string;
    quantity: number;
    item: { name: string };
  }>;
  photoReports?: Array<{
    id: string;
    url: string;
    comment?: string;
    createdAt: string;
  }>;
}

interface TaskManagerProps {
  checklistId?: string;
  roomId?: string;
  requestId?: string;
  onTaskUpdate?: () => void;
}

const statusColors = {
  NEW: 'bg-gray-100 text-gray-800',
  AVAILABLE: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CLOSED_WITH_PHOTO: 'bg-purple-100 text-purple-800',
  OVERDUE: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-100 text-red-800'
};

const statusLabels = {
  NEW: '⚪ Ожидает',
  AVAILABLE: '🟢 Доступна',
  IN_PROGRESS: '🔵 В работе',
  COMPLETED: '✅ Выполнено',
  CLOSED_WITH_PHOTO: '📷 Закрыто с фото',
  OVERDUE: '🟡 Просрочена',
  FAILED: '❌ Не выполнена'
};

export default function TaskManager({ checklistId, roomId, requestId, onTaskUpdate }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [failureModal, setFailureModal] = useState<{
    isOpen: boolean;
    taskId: string;
    taskDescription: string;
  }>({
    isOpen: false,
    taskId: '',
    taskDescription: ''
  });
  const [failureReason, setFailureReason] = useState('');
  const [selectedTaskForCompletion, setSelectedTaskForCompletion] = useState<any>(null);
  const [showTaskCompletionModal, setShowTaskCompletionModal] = useState(false);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (checklistId) params.append('checklistId', checklistId);
      if (roomId) params.append('roomId', roomId);
      if (requestId) params.append('requestId', requestId);

      const response = await fetch(`/api/tasks?${params}`);
      if (!response.ok) throw new Error('Ошибка загрузки');
      
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Ошибка при загрузке задач:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [checklistId, roomId, requestId]);

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Ошибка обновления');
      
      await fetchTasks();
      if (onTaskUpdate) onTaskUpdate();
    } catch (error) {
      console.error('Ошибка при обновлении задачи:', error);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newTaskDescription,
          checklistId,
          roomId,
          requestId
        })
      });

      if (!response.ok) throw new Error('Ошибка создания');
      
      await fetchTasks();
      setIsAddModalOpen(false);
      setNewTaskDescription('');
      if (onTaskUpdate) onTaskUpdate();
    } catch (error) {
      console.error('Ошибка при создании задачи:', error);
    }
  };

  const handleTaskFailure = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setFailureModal({
        isOpen: true,
        taskId,
        taskDescription: task.description
      });
    }
  };

  const submitTaskFailure = async () => {
    if (!failureReason.trim()) {
      alert('Укажите причину невыполнения');
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${failureModal.taskId}/fail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureReason: failureReason.trim() })
      });

      if (!response.ok) throw new Error('Ошибка отметки невыполнения');
      
      await fetchTasks();
      setFailureModal({ isOpen: false, taskId: '', taskDescription: '' });
      setFailureReason('');
      if (onTaskUpdate) onTaskUpdate();
    } catch (error) {
      console.error('Ошибка при отметке невыполнения:', error);
      alert('Произошла ошибка при отметке невыполнения');
    }
  };

  const handleCompleteTask = async (task: Task) => {
    // Нужно получить полную информацию о задаче с чек-листом и объектом
    try {
      const response = await fetch(`/api/tasks/${task.id}`);
      if (response.ok) {
        const fullTask = await response.json();
        setSelectedTaskForCompletion(fullTask);
        setShowTaskCompletionModal(true);
      }
    } catch (error) {
      console.error('Ошибка загрузки деталей задачи:', error);
    }
  };

  const handleTaskCompletionSuccess = (completedTask: any) => {
    fetchTasks();
    setSelectedTaskForCompletion(null);
    setShowTaskCompletionModal(false);
    if (onTaskUpdate) onTaskUpdate();
  };

  if (isLoading) {
    return <div className="text-center py-4">Загрузка задач...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Задания</h3>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700"
        >
          + Добавить задание
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white border rounded-lg shadow">
          <div className="text-center py-8 text-gray-500">
            Задания не добавлены
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white border rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">{task.description}</h4>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusColors[task.status]}`}>
                    {statusLabels[task.status]}
                  </span>
                  <button
                    onClick={() => setSelectedTask(task)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Подробнее
                  </button>
                </div>
              </div>

              {task.room && (
                <p className="text-sm text-gray-600 mb-2">
                  📍 {task.room.name}
                </p>
              )}

              {/* Временное окно для задач */}
              {task.scheduledStart && task.scheduledEnd && (
                <div className="text-xs text-gray-500 mb-2">
                  ⏰ {new Date(task.scheduledStart).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - {new Date(task.scheduledEnd).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              {/* Причина невыполнения для failed задач */}
              {task.status === 'FAILED' && task.failureReason && (
                <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded">
                  ❌ Причина: {task.failureReason}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {/* 3 кнопки для доступных и просроченных задач */}
                {(task.status === 'AVAILABLE' || task.status === 'OVERDUE') && (
                  <>
                    {task.status === 'OVERDUE' && (
                      <div className="w-full text-xs text-red-600 mb-2 p-2 bg-red-50 rounded">
                        🟡 ПРОСРОЧЕНА - время вышло, но можно выполнить с объяснением
                      </div>
                    )}
                    
                    <button
                      onClick={() => updateTaskStatus(task.id, 'CLOSED_WITH_PHOTO')}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      📷 Выполнить с фото
                    </button>
                    <button
                      onClick={() => handleCompleteTask(task)}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      ✅ Завершить задачу
                    </button>
                    <button
                      onClick={() => handleTaskFailure(task.id)}
                      className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      ❌ Не могу выполнить
                    </button>
                  </>
                )}

                {/* Кнопка начать для новых задач */}
                {task.status === 'NEW' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">⚪ Ожидает начала временного окна</span>
                  </div>
                )}

                {/* Информация о выполненных задачах */}
                {(task.status === 'COMPLETED' || task.status === 'CLOSED_WITH_PHOTO') && task.completedBy && (
                  <span className="text-xs text-gray-500">
                    Выполнил: {task.completedBy.name}
                  </span>
                )}

                {/* Задачи в работе */}
                {task.status === 'IN_PROGRESS' && (
                  <span className="text-xs text-blue-600">🔵 В работе</span>
                )}
              </div>

              {task.expenses && task.expenses.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  💰 Расходы: {task.expenses.map(e => `${e.item.name} (${e.quantity})`).join(', ')}
                </div>
              )}

              {task.photoReports && task.photoReports.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  📷 Фотоотчетов: {task.photoReports.length}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно добавления задания */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Добавить новое задание</h2>
            
            <form onSubmit={addTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Описание задания *
                </label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  placeholder="Опишите что нужно сделать"
                  required
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                  Добавить
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Детальная информация о задании */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Детали задания</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Описание</h3>
                <p className="text-gray-700">{selectedTask.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm">Статус</h4>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${statusColors[selectedTask.status]}`}>
                    {statusLabels[selectedTask.status]}
                  </span>
                </div>
                
                {selectedTask.room && (
                  <div>
                    <h4 className="font-medium text-sm">Помещение</h4>
                    <p className="text-sm text-gray-600">{selectedTask.room.name}</p>
                  </div>
                )}
              </div>

              {selectedTask.completedAt && (
                <div>
                  <h4 className="font-medium text-sm">Выполнено</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedTask.completedAt).toLocaleString('ru-RU')}
                    {selectedTask.completedBy && ` - ${selectedTask.completedBy.name}`}
                  </p>
                </div>
              )}

              {selectedTask.expenses && selectedTask.expenses.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Расходы</h4>
                  <div className="space-y-1">
                    {selectedTask.expenses.map((expense) => (
                      <div key={expense.id} className="text-sm text-gray-600">
                        • {expense.item.name}: {expense.quantity}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.photoReports && selectedTask.photoReports.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Фотоотчеты</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTask.photoReports.map((photo) => (
                      <div key={photo.id} className="border rounded p-2">
                        <img 
                          src={photo.url} 
                          alt="Фотоотчет" 
                          className="w-full h-20 object-cover rounded mb-1"
                        />
                        {photo.comment && (
                          <p className="text-xs text-gray-600">{photo.comment}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(photo.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для причины невыполнения */}
      {failureModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Почему не можете выполнить задачу?</h2>
            <p className="text-sm text-gray-600 mb-4">{failureModal.taskDescription}</p>
            
            <textarea
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              placeholder="Укажите причину (обязательно)"
              className="w-full p-3 border rounded-lg resize-none h-24 mb-4"
              required
            />
            
            <div className="flex gap-2">
              <button
                onClick={submitTaskFailure}
                disabled={!failureReason.trim()}
                className="flex-1 bg-red-600 text-white p-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                Отправить
              </button>
              <button
                onClick={() => {
                  setFailureModal({ isOpen: false, taskId: '', taskDescription: '' });
                  setFailureReason('');
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно завершения задачи */}
      <TaskCompletionModal
        task={selectedTaskForCompletion}
        isOpen={showTaskCompletionModal}
        onClose={() => {
          setShowTaskCompletionModal(false);
          setSelectedTaskForCompletion(null);
        }}
        onComplete={handleTaskCompletionSuccess}
      />
    </div>
  );
}
