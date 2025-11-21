'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, AlertTriangle, CheckCircle, Camera, X, ChevronLeft, ChevronRight, Square, CheckSquare } from 'lucide-react';
import Image from 'next/image';
import { UnifiedTask } from '@/lib/unified-task-system';
import TaskLocationBreadcrumb from '@/components/TaskLocationBreadcrumb';
import UnifiedTaskCompletionModal from '@/components/UnifiedTaskCompletionModal';

interface SimpleTaskListModalProps {
  isOpen: boolean;
  onClose: () => void;
  managerId: string;
  managerName: string;
  frequency: string;
  tasks: UnifiedTask[];
  onTaskComplete?: (task: UnifiedTask) => void;
  onDataRefresh?: () => void;
}

const SimpleTaskListModal: React.FC<SimpleTaskListModalProps> = ({
  isOpen,
  onClose,
  managerId,
  managerName,
  frequency,
  tasks,
  onTaskComplete,
  onDataRefresh
}) => {
  const getFrequencyLabel = (freq: string) => {
    const lowerFreq = freq?.toLowerCase();
    switch (lowerFreq) {
      case 'daily': return 'Ежедневные задачи';
      case 'weekly': return 'Еженедельные задачи';
      case 'monthly': return 'Ежемесячные задачи';
      case 'quarterly': return 'Ежеквартальные задачи';
      case 'yearly': return 'Ежегодные задачи';
      case 'ежедневно': return 'Ежедневные задачи';
      case 'еженедельно': return 'Еженедельные задачи';
      case 'ежемесячно': return 'Ежемесячные задачи';
      default: return `Задачи: ${freq}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-200';
      case 'OVERDUE': return 'text-red-600 bg-red-50 border-red-200';
      case 'AVAILABLE': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'PENDING': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Выполнено';
      case 'OVERDUE': return 'Просрочено';
      case 'AVAILABLE': return 'На сегодня';
      case 'PENDING': return 'Предстоящая';
      default: return status;
    }
  };

  // Группируем задачи по статусу
  const overdueTasks = tasks.filter(task => task.status === 'OVERDUE');
  const todayTasks = tasks.filter(task => task.status === 'AVAILABLE');
  const completedTasks = tasks.filter(task => task.status === 'COMPLETED');

  // Проверяем требования объектов для массового закрытия
  const hasRequirements = tasks.some(task => 
    task.object?.requirePhotoForCompletion || task.object?.requireCommentForCompletion
  );

  const [photoViewerTask, setPhotoViewerTask] = useState<UnifiedTask | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isBulkCompleting, setIsBulkCompleting] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<UnifiedTask | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const openPhotoViewer = (task: UnifiedTask, index: number = 0) => {
    setPhotoViewerTask(task);
    setCurrentPhotoIndex(index);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!photoViewerTask?.completionPhotos || photoViewerTask.completionPhotos.length === 0) return;
    if (direction === 'prev') {
      setCurrentPhotoIndex(prev => prev > 0 ? prev - 1 : photoViewerTask.completionPhotos!.length - 1);
    } else {
      setCurrentPhotoIndex(prev => prev < photoViewerTask.completionPhotos!.length - 1 ? prev + 1 : 0);
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleBulkComplete = async () => {
    const incompleteTasks = selectionMode 
      ? tasks.filter(t => selectedTasks.has(t.id) && t.status !== 'COMPLETED')
      : [...overdueTasks, ...todayTasks];
    
    if (incompleteTasks.length === 0) {
      alert('Все задачи уже закрыты');
      return;
    }

    if (!confirm(`Закрыть ${incompleteTasks.length} задач(\u0438)?\n\nБудут закрыты только задачи, не требующие фото или комментариев.`)) {
      return;
    }

    setIsBulkCompleting(true);

    try {
      const response = await fetch('/api/tasks/bulk-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          taskIds: incompleteTasks.map(t => t.id),
          skipValidation: false 
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        
        if (result.completed > 0) {
          // Перезагружаем данные календаря
          if (onDataRefresh) {
            onDataRefresh();
          }
          
          // Сбрасываем режим выбора
          setSelectionMode(false);
          setSelectedTasks(new Set());
          
          // Закрываем модалку
          setTimeout(() => onClose(), 500);
        }
      } else {
        const error = await response.json();
        alert('Ошибка: ' + error.message);
      }
    } catch (error) {
      console.error('❌ BULK COMPLETE ERROR:', error);
      alert('Ошибка при закрытии задач');
    } finally {
      setIsBulkCompleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl"
      >
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="w-full">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-base md:text-lg break-words">{getFrequencyLabel(frequency)}</span>
                  <div className="text-xs md:text-sm font-normal text-gray-600 mt-1">
                    {managerName} • {tasks.length} задач
                  </div>
                </div>
                <div className="flex gap-2">
                  {!selectionMode && (overdueTasks.length > 0 || todayTasks.length > 0) && !hasRequirements && (
                    <Button
                      onClick={() => setSelectionMode(true)}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1 whitespace-nowrap"
                    >
                      <Square className="w-4 h-4" />
                      Выбрать
                    </Button>
                  )}
                  {selectionMode && (
                    <>
                      <Button
                        onClick={() => {
                          setSelectionMode(false);
                          setSelectedTasks(new Set());
                        }}
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1 whitespace-nowrap"
                      >
                        Отмена
                      </Button>
                      <Button
                        onClick={handleBulkComplete}
                        disabled={isBulkCompleting || selectedTasks.size === 0 || hasRequirements}
                        size="sm"
                        variant="default"
                        className="flex items-center gap-1 whitespace-nowrap"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {isBulkCompleting ? 'Закрытие...' : `Закрыть (${selectedTasks.size})`}
                      </Button>
                    </>
                  )}
                  {!selectionMode && (overdueTasks.length > 0 || todayTasks.length > 0) && !hasRequirements && (
                    <Button
                      onClick={handleBulkComplete}
                      disabled={isBulkCompleting || hasRequirements}
                      size="sm"
                      variant="default"
                      className="flex items-center gap-1 whitespace-nowrap"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {isBulkCompleting ? 'Закрытие...' : `Закрыть все (${overdueTasks.length + todayTasks.length})`}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overdue" className="w-full">
          <div className="overflow-x-auto scrollbar-hide -mx-2 px-2">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-3 gap-1">
              <TabsTrigger value="overdue" className="text-red-600 text-xs sm:text-sm px-2 whitespace-nowrap flex-shrink-0">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Просроч.</span>
                <span className="sm:hidden">🔺</span>
                <span>({overdueTasks.length})</span>
              </TabsTrigger>
              <TabsTrigger value="today" className="text-blue-600 text-xs sm:text-sm px-2 whitespace-nowrap flex-shrink-0">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Текущ.</span>
                <span className="sm:hidden">⏱</span>
                <span>({todayTasks.length})</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-green-600 text-xs sm:text-sm px-2 whitespace-nowrap flex-shrink-0">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Выполн.</span>
                <span className="sm:hidden">✓</span>
                <span>({completedTasks.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overdue" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
            {overdueTasks.length > 0 ? (
              <div className="space-y-2">
                {overdueTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onTaskComplete={onTaskComplete}
                    onOpenCompletionModal={() => setTaskToComplete(task)}
                    selectionMode={selectionMode}
                    isSelected={selectedTasks.has(task.id)}
                    onToggleSelection={() => toggleTaskSelection(task.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium mb-2">Нет просроченных задач</div>
                <p className="text-sm">Отличная работа! Все задачи выполняются вовремя</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="today" className="space-y-4 mt-4">
            {todayTasks.length > 0 ? (
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onTaskComplete={onTaskComplete}
                    onOpenCompletionModal={() => setTaskToComplete(task)}
                    selectionMode={selectionMode}
                    isSelected={selectedTasks.has(task.id)}
                    onToggleSelection={() => toggleTaskSelection(task.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium mb-2">Нет задач на сегодня</div>
                <p className="text-sm">Все текущие задачи выполнены или запланированы на другие дни</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedTasks.length > 0 ? (
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    showCompletionDetails={true}
                    onViewPhotos={(index) => openPhotoViewer(task, index)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium mb-2">Нет выполненных задач</div>
                <p className="text-sm">Выполненные задачи появятся здесь после завершения</p>
              </div>
            )}
          </TabsContent>

          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-500 mt-4">
              <div className="text-lg font-medium mb-2">Нет задач</div>
              <p className="text-sm">Задачи появятся здесь после их создания</p>
            </div>
          )}
        </Tabs>

        {photoViewerTask && photoViewerTask.completionPhotos && photoViewerTask.completionPhotos.length > 0 && (
          <Dialog open={!!photoViewerTask} onOpenChange={() => setPhotoViewerTask(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                  onClick={() => setPhotoViewerTask(null)}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="relative aspect-video bg-black">
                  <Image
                    src={photoViewerTask.completionPhotos[currentPhotoIndex]}
                    alt={`Фото ${currentPhotoIndex + 1}`}
                    fill
                    className="object-contain"
                  />

                  {photoViewerTask.completionPhotos.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                        onClick={() => navigatePhoto('prev')}
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                        onClick={() => navigatePhoto('next')}
                      >
                        <ChevronRight className="h-6 w-6" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="p-4 bg-white flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Фото {currentPhotoIndex + 1} из {photoViewerTask.completionPhotos.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(photoViewerTask.completionPhotos![currentPhotoIndex], '_blank')}
                  >
                    Открыть в новой вкладке
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Модалка завершения задачи */}
        {taskToComplete && (
          <UnifiedTaskCompletionModal
            task={taskToComplete}
            isOpen={!!taskToComplete}
            onClose={() => setTaskToComplete(null)}
            onComplete={(completedTask) => {
              setTaskToComplete(null);
              // Перезагружаем данные календаря
              if (onDataRefresh) {
                onDataRefresh();
              }
              // Закрываем модалку списка задач
              setTimeout(() => onClose(), 300);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

// Компонент карточки задачи
const TaskCard: React.FC<{
  task: UnifiedTask;
  showCompletionDetails?: boolean;
  onTaskComplete?: (task: UnifiedTask) => void;
  onViewPhotos?: (index: number) => void;
  onOpenCompletionModal?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}> = ({ task, showCompletionDetails = false, onTaskComplete, onViewPhotos, onOpenCompletionModal, selectionMode = false, isSelected = false, onToggleSelection }) => {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-200';
      case 'OVERDUE': return 'text-red-600 bg-red-50 border-red-200';
      case 'AVAILABLE': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'PENDING': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Выполнено';
      case 'OVERDUE': return 'Просрочено';
      case 'AVAILABLE': return 'На сегодня';
      case 'PENDING': return 'Предстоящая';
      default: return status;
    }
  };

  return (
    <div className={`p-3 md:p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow ${
      selectionMode && isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
    }`}>
      <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-2 md:mb-3">
        {selectionMode && task.status !== 'COMPLETED' && (
          <div className="flex items-center mr-2">
            <button
              onClick={onToggleSelection}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        )}
        <div className="flex-1 w-full">
          <h4 className="font-medium text-sm md:text-base text-gray-900 mb-2 break-words">{task.description}</h4>
          
          <div className="flex flex-col gap-1 text-xs md:text-sm text-gray-600">
            <TaskLocationBreadcrumb task={task} showFullPath={true} compact={true} />
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(task.scheduledDate).toLocaleDateString('ru-RU')}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`${getStatusColor(task.status)} border`}>
              {getStatusLabel(task.status)}
            </Badge>
            {task.frequency && task.frequency !== 'unknown' && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{task.frequency}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 ml-4">
          {task.status !== 'COMPLETED' && onOpenCompletionModal && (
            <Button
              size="sm"
              variant={task.status === 'OVERDUE' ? 'destructive' : 'default'}
              onClick={onOpenCompletionModal}
            >
              Выполнить
            </Button>
          )}
        </div>
      </div>

      {/* Детали выполнения для завершенных задач */}
      {showCompletionDetails && task.status === 'COMPLETED' && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <h5 className="text-sm font-medium text-green-800 mb-2">Детали выполнения:</h5>
          
          {task.completedAt && (
            <div className="text-sm text-gray-700 mb-1">
              <strong>Выполнено:</strong> {new Date(task.completedAt).toLocaleString('ru-RU')}
            </div>
          )}
          
          {task.completedBy && (
            <div className="text-sm text-gray-700 mb-1">
              <strong>Исполнитель:</strong> {task.completedBy.name}
            </div>
          )}
          
          {task.completionComment && (
            <div className="text-sm text-gray-700 mb-1">
              <strong>Комментарий:</strong> {task.completionComment}
            </div>
          )}
          
          {task.completionPhotos && task.completionPhotos.length > 0 && (
            <button
              type="button"
              className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              onClick={() => onViewPhotos && onViewPhotos(0)}
            >
              <Camera className="w-4 h-4" />
              <span>
                Фото: {task.completionPhotos.length} шт.
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleTaskListModal;
