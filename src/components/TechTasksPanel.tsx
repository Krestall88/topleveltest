'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  Calendar, 
  MessageSquare, 
  Clock, 
  AlertCircle
} from 'lucide-react';

interface TechTask {
  id: string;
  name: string;
  workType: string;
  frequency: string;
  description?: string;
  notes?: string;
  period?: string;
}

interface TechTasksPanelProps {
  techTasks: TechTask[];
  context: string;
}

export default function TechTasksPanel({ techTasks, context }: TechTasksPanelProps) {
  const [selectedTask, setSelectedTask] = useState<TechTask | null>(null);
  const [showSeasonModal, setShowSeasonModal] = useState(false);

  const handleSeasonClick = (task: TechTask) => {
    setSelectedTask(task);
    setShowSeasonModal(true);
  };

  const getFrequencyColor = (frequency: string) => {
    const freq = frequency.toLowerCase();
    if (freq.includes('ежедневно') || freq.includes('день')) return 'bg-red-100 text-red-800';
    if (freq.includes('неделю') || freq.includes('раз в месяц')) return 'bg-yellow-100 text-yellow-800';
    if (freq.includes('месяц') || freq.includes('квартал')) return 'bg-blue-100 text-blue-800';
    if (freq.includes('год')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (techTasks.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Техзадания
          </CardTitle>
          <p className="text-sm text-gray-600">{context}</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-center">
              Выберите элемент в структуре слева<br />
              для просмотра техзаданий
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Техзадания ({techTasks.length})
          </CardTitle>
          <p className="text-sm text-gray-600">{context}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {techTasks.map((task) => (
              <Card key={task.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Заголовок техзадания */}
                    <div>
                      <h3 className="font-semibold text-base leading-tight">
                        {task.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {task.workType}
                        </Badge>
                        <Badge className={`text-xs ${getFrequencyColor(task.frequency)}`}>
                          <Clock className="h-3 w-3 mr-1" />
                          {task.frequency}
                        </Badge>
                      </div>
                    </div>

                    {/* Описание */}
                    {task.description && (
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                        <p className="whitespace-pre-wrap">{task.description}</p>
                      </div>
                    )}

                    {/* Кнопки действий */}
                    <div className="flex gap-2 pt-2">
                      {task.period && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSeasonClick(task)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Calendar className="h-3 w-3" />
                          Сезон
                        </Button>
                      )}
                      
                      {task.notes && (
                        <div className="bg-green-50 border border-green-200 p-2 rounded-md">
                          <div className="flex items-center gap-1 text-xs font-medium text-green-800 mb-1">
                            <MessageSquare className="h-3 w-3" />
                            Примечания:
                          </div>
                          <p className="text-xs text-green-700 whitespace-pre-wrap">
                            {task.notes}
                          </p>
                        </div>
                      )}
                      
                      {!task.period && !task.notes && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <AlertCircle className="h-3 w-3" />
                          Дополнительная информация отсутствует
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Модальное окно для сезона */}
      <Dialog open={showSeasonModal} onOpenChange={setShowSeasonModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Сезон выполнения
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Техзадание:</h4>
              <p className="text-sm bg-gray-50 p-3 rounded-md">
                {selectedTask?.name}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Период выполнения:</h4>
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                <p className="text-sm text-blue-800 whitespace-pre-wrap">
                  {selectedTask?.period}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowSeasonModal(false)}
              >
                Закрыть
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
