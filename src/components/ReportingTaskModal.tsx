'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';

interface ReportingTask {
  id: string;
  title: string;
  description?: string;
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  completedAt?: string;
  completionComment?: string;
  object: {
    id: string;
    name: string;
    managerId: string;
  };
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
  assignedTo: {
    id: string;
    name: string;
    role: string;
  };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: string;
  };
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface Attachment {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string;
    role: string;
  };
}

interface ReportingTaskModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  currentUser: User;
}

const statusLabels = {
  NEW: 'Новая',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнена',
  CANCELLED: 'Отменена'
};

const priorityLabels = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий'
};

const statusColors = {
  NEW: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800'
};

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-orange-100 text-orange-800',
  HIGH: 'bg-red-100 text-red-800'
};

export default function ReportingTaskModal({ 
  taskId, 
  isOpen, 
  onClose, 
  onTaskUpdated, 
  currentUser 
}: ReportingTaskModalProps) {
  const [task, setTask] = useState<ReportingTask | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Форма редактирования
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    dueDate: '',
    completionComment: ''
  });
  
  // Новый комментарий
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  
  // Загрузка фотографий
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (taskId && isOpen) {
      loadTask();
      loadComments();
      loadAttachments();
    }
  }, [taskId, isOpen]);

  const loadTask = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/reporting/tasks/${taskId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTask(data.task);
        
        // Заполняем форму редактирования
        setEditForm({
          title: data.task.title,
          description: data.task.description || '',
          status: data.task.status,
          priority: data.task.priority,
          dueDate: data.task.dueDate ? data.task.dueDate.split('T')[0] : '',
          completionComment: data.task.completionComment || ''
        });
      } else {
        console.error('Ошибка загрузки задачи:', response.status);
      }
    } catch (error) {
      console.error('Ошибка загрузки задачи:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`/api/reporting/tasks/${taskId}/comments`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Ошибка загрузки комментариев:', error);
    }
  };

  const handleSave = async () => {
    if (!taskId) return;
    
    try {
      setSaving(true);
      const response = await fetch(`/api/reporting/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          status: editForm.status,
          priority: editForm.priority,
          dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
          completionComment: editForm.completionComment
        })
      });
      
      if (response.ok) {
        await loadTask();
        setIsEditing(false);
        onTaskUpdated();
        alert('Задача успешно обновлена');
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения задачи');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!taskId || !newComment.trim()) return;
    
    try {
      setAddingComment(true);
      const response = await fetch(`/api/reporting/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          content: newComment
        })
      });
      
      if (response.ok) {
        setNewComment('');
        await loadComments();
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
      alert('Ошибка добавления комментария');
    } finally {
      setAddingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId || !task) return;
    
    if (!confirm(`Вы уверены, что хотите удалить задачу "${task.title}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/reporting/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        onTaskUpdated();
        onClose();
        alert('Задача успешно удалена');
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка удаления задачи');
    }
  };

  const loadAttachments = async () => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`/api/reporting/tasks/${taskId}/attachments`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAttachments(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки вложений:', error);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !taskId) return;

    try {
      setUploadingPhoto(true);

      for (const file of Array.from(files)) {
        // Проверить тип файла
        if (!file.type.startsWith('image/')) {
          alert('Можно загружать только изображения');
          continue;
        }

        // Проверить размер файла (максимум 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert('Размер файла не должен превышать 10MB');
          continue;
        }

        // Создать FormData для загрузки
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/reporting/tasks/${taskId}/attachments`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (response.ok) {
          await loadAttachments();
        } else {
          const errorData = await response.json();
          alert(`Ошибка загрузки: ${errorData.message}`);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке фото:', error);
      alert('Ошибка при загрузке фото');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'DEPUTY' || 
                 (task && currentUser.role === 'MANAGER' && task.object.managerId === currentUser.id);
  
  const canDelete = currentUser.role === 'ADMIN' || currentUser.role === 'DEPUTY';
  
  const canComplete = task && currentUser.id === task.assignedTo.id && task.status !== 'COMPLETED';

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {loading ? 'Загрузка...' : task ? task.title : 'Задача не найдена'}
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">Загрузка задачи...</div>
          </div>
        ) : !task ? (
          <div className="flex justify-center py-8">
            <div className="text-red-500">Задача не найдена</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
            {/* Основная информация */}
            <div className="lg:col-span-2 space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Название</Label>
                    <Input
                      id="title"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Описание</Label>
                    <Textarea
                      id="description"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Статус</Label>
                      <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW">Новая</SelectItem>
                          <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                          <SelectItem value="COMPLETED">Выполнена</SelectItem>
                          <SelectItem value="CANCELLED">Отменена</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="priority">Приоритет</Label>
                      <Select value={editForm.priority} onValueChange={(value) => setEditForm({ ...editForm, priority: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Низкий</SelectItem>
                          <SelectItem value="MEDIUM">Средний</SelectItem>
                          <SelectItem value="HIGH">Высокий</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="dueDate">Срок выполнения</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    />
                  </div>
                  
                  {(editForm.status === 'COMPLETED' || task.completionComment) && (
                    <div>
                      <Label htmlFor="completionComment">Комментарий завершения</Label>
                      <Textarea
                        id="completionComment"
                        value={editForm.completionComment}
                        onChange={(e) => setEditForm({ ...editForm, completionComment: e.target.value })}
                        rows={2}
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{task.title}</h3>
                    {task.description && (
                      <p className="text-gray-600 mt-2">{task.description}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge className={statusColors[task.status]}>
                      {statusLabels[task.status]}
                    </Badge>
                    <Badge className={priorityColors[task.priority]}>
                      {priorityLabels[task.priority]}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Создана:</span>
                      <div>{new Date(task.createdAt).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="font-medium">Обновлена:</span>
                      <div>{new Date(task.updatedAt).toLocaleString()}</div>
                    </div>
                    {task.dueDate && (
                      <div>
                        <span className="font-medium">Срок:</span>
                        <div>{new Date(task.dueDate).toLocaleDateString()}</div>
                      </div>
                    )}
                    {task.completedAt && (
                      <div>
                        <span className="font-medium">Завершена:</span>
                        <div>{new Date(task.completedAt).toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Создал:</span>
                      <div>{task.createdBy.name}</div>
                    </div>
                    <div>
                      <span className="font-medium">Назначена:</span>
                      <div>{task.assignedTo.name}</div>
                    </div>
                  </div>
                  
                  {task.completionComment && (
                    <div>
                      <span className="font-medium">Комментарий завершения:</span>
                      <div className="mt-1 p-3 bg-gray-50 rounded">{task.completionComment}</div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {canEdit && (
                      <Button onClick={() => setIsEditing(true)}>
                        Редактировать
                      </Button>
                    )}
                    {canComplete && (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setEditForm({ ...editForm, status: 'COMPLETED' });
                          setIsEditing(true);
                        }}
                      >
                        Завершить
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="destructive" onClick={handleDelete}>
                        Удалить
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Комментарии и фотографии */}
            <div className="border-l pl-6 flex flex-col space-y-6">
              {/* Комментарии */}
              <div className="flex flex-col">
                <h4 className="font-semibold mb-4">Комментарии ({comments.length})</h4>
              
              <div className="flex-1 mb-4 overflow-y-auto">
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm">{comment.author.name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      Комментариев пока нет
                    </div>
                  )}
                </div>
              </div>
              
                <div className="space-y-2">
                  <Textarea
                    placeholder="Добавить комментарий..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    onClick={handleAddComment} 
                    disabled={!newComment.trim() || addingComment}
                    size="sm"
                    className="w-full"
                  >
                    {addingComment ? 'Добавление...' : 'Добавить комментарий'}
                  </Button>
                </div>
              </div>
              
              {/* Фотографии */}
              <div className="flex flex-col">
                <h4 className="font-semibold mb-4">Фотографии ({attachments.length})</h4>
                
                {/* Загрузка фотографий */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingPhoto}
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      size="sm"
                    >
                      {uploadingPhoto ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-spin" />
                          Загрузка...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          Добавить фото
                        </>
                      )}
                    </Button>
                    
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                  </div>
                </div>
                
                {/* Список фотографий */}
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-3">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="border rounded-lg p-3">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <img
                              src={attachment.filePath}
                              alt={attachment.originalName}
                              className="w-16 h-16 object-cover rounded border"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {attachment.originalName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(attachment.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mb-1">
                              {attachment.uploadedBy.name} • {Math.round(attachment.fileSize / 1024)} KB
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {attachments.length === 0 && (
                      <div className="text-center text-gray-500 py-4">
                        Фотографий пока нет
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
