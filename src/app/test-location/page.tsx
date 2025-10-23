'use client';

import React, { useState, useEffect } from 'react';
import TaskLocationBreadcrumb from '@/components/TaskLocationBreadcrumb';

export default function TestLocationPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await fetch('/api/tasks/calendar-new', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          console.log('API Response:', data);
          setTasks(data.today || []);
        }
      } catch (error) {
        console.error('Ошибка загрузки:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  if (loading) {
    return <div className="p-8">Загрузка...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Тест отображения местоположения задач</h1>
      
      <div className="space-y-4">
        {tasks.length > 0 ? (
          tasks.slice(0, 5).map((task: any) => (
            <div key={task.id} className="p-4 border rounded-lg space-y-3">
              <h3 className="font-medium">{task.description}</h3>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-600">Режим showFullPath=false:</h4>
                <TaskLocationBreadcrumb 
                  task={task} 
                  showFullPath={false}
                  compact={false}
                />
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-600">Режим compact=true:</h4>
                <TaskLocationBreadcrumb 
                  task={task} 
                  showFullPath={true}
                  compact={true}
                />
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-600">Полный режим:</h4>
                <TaskLocationBreadcrumb 
                  task={task} 
                  showFullPath={true}
                  compact={false}
                />
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-600">Отладочная информация:</h4>
                <div className="text-xs space-y-1">
                  <div><strong>task.description:</strong> {task.description || 'null'}</div>
                  <div><strong>task.objectName:</strong> {task.objectName || 'null'}</div>
                  <div><strong>task.roomName:</strong> {task.roomName || 'null'}</div>
                  <div><strong>task.checklist?.object?.name:</strong> {task.checklist?.object?.name || 'null'}</div>
                  <div><strong>task.checklist?.room?.name:</strong> {task.checklist?.room?.name || 'null'}</div>
                </div>
              </div>
              
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500">Данные задачи (JSON)</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                  {JSON.stringify(task, null, 2)}
                </pre>
              </details>
            </div>
          ))
        ) : (
          <div className="text-gray-500">Нет задач для отображения</div>
        )}
      </div>
    </div>
  );
}
