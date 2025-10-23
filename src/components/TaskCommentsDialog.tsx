'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, X, Clock, User } from 'lucide-react';

interface TaskCommentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskDescription: string;
}

interface Comment {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  admin: {
    name: string;
    role: string;
  };
}

export default function TaskCommentsDialog({ 
  isOpen, 
  onClose, 
  taskId, 
  taskDescription 
}: TaskCommentsDialogProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // Загрузка комментариев
  const loadComments = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks/${taskId}/admin-comments`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      } else {
        console.error('Ошибка загрузки комментариев');
      }
    } catch (error) {
      console.error('Ошибка сети:', error);
    } finally {
      setLoading(false);
    }
  };

  // Добавление комментария
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setAdding(true);
      const response = await fetch(`/api/tasks/${taskId}/admin-comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: newComment.trim(),
          type: 'admin_note'
        }),
      });

      if (response.ok) {
        setNewComment('');
        loadComments(); // Перезагружаем комментарии
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message || 'Не удалось добавить комментарий'}`);
      }
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
      alert('Ошибка сети. Проверьте подключение.');
    } finally {
      setAdding(false);
    }
  };

  // Загружаем комментарии при открытии диалога
  useEffect(() => {
    if (isOpen && taskId) {
      loadComments();
    }
  }, [isOpen, taskId]);

  // Получаем цвет значка для типа комментария
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'admin_note': return 'bg-blue-100 text-blue-800';
      case 'completion_feedback': return 'bg-green-100 text-green-800';
      case 'instruction': return 'bg-orange-100 text-orange-800';
      case 'quality_check': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Получаем название типа комментария
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'admin_note': return 'Заметка';
      case 'completion_feedback': return 'Отзыв';
      case 'instruction': return 'Указание';
      case 'quality_check': return 'Проверка';
      default: return 'Комментарий';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <span>Комментарии к задаче</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <p className="text-sm text-gray-600">{taskDescription}</p>
        </DialogHeader>

        {/* Список комментариев */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Загрузка комментариев...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Комментариев пока нет
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm">{comment.admin.name}</span>
                    <Badge className={`text-xs ${getTypeColor(comment.type)}`}>
                      {getTypeLabel(comment.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(comment.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Форма добавления комментария */}
        <div className="border-t pt-4 space-y-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Добавить комментарий к задаче..."
            className="resize-none"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} size="sm">
              Закрыть
            </Button>
            <Button 
              onClick={handleAddComment} 
              disabled={!newComment.trim() || adding}
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" />
              {adding ? 'Добавление...' : 'Добавить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
