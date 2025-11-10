'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  File
} from 'lucide-react';

interface SimpleExcelUploadProps {
  onImportComplete?: () => void;
}

export default function SimpleExcelUpload({ onImportComplete }: SimpleExcelUploadProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Выбор файла
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  };

  // Открытие диалога выбора файла
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // Загрузка файла с предварительной очисткой
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Сначала выберите файл');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Сначала читаем файл для получения названий объектов
      const arrayBuffer = await selectedFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Простой парсинг для получения названий объектов
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rawData.length > 1) {
        const headers = rawData[0] as string[];
        const dataRows = rawData.slice(1);
        
        // Находим колонку с названиями
        const nameColumnIndex = headers.findIndex(header => 
          header && ['название', 'наименование', 'name', 'объект'].some(key => 
            header.toLowerCase().includes(key)
          )
        );
        
        if (nameColumnIndex >= 0) {
          // Очищаем существующие объекты
          for (const row of dataRows) {
            if (Array.isArray(row) && row[nameColumnIndex]) {
              const objectName = row[nameColumnIndex];
              console.log(`🧹 Очистка объекта: ${objectName}`);
              
              try {
                await fetch('/api/objects/cleanup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ objectName })
                });
              } catch (cleanupError) {
                console.warn(`⚠️ Ошибка очистки объекта ${objectName}:`, cleanupError);
              }
            }
          }
        }
      }

      // Теперь выполняем импорт
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/objects/comprehensive-upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        setError(data.message || 'Ошибка при загрузке файла');
      }
    } catch (err) {
      setError('Ошибка сети при загрузке файла');
    } finally {
      setLoading(false);
    }
  };

  // Скачивание шаблона
  const handleDownloadTemplate = () => {
    window.open('/api/objects/export-excel?type=template', '_blank');
  };

  // Экспорт всех объектов
  const handleExportAll = () => {
    window.open('/api/objects/export-excel?type=all', '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Основная карточка */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Загрузка объектов из Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Скрытый input для выбора файла */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Основные кнопки */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Скачать шаблон
            </Button>

            <Button
              onClick={handleSelectFile}
              variant="outline"
              className="flex items-center gap-2"
            >
              <File className="w-4 h-4" />
              Выбрать файл
            </Button>

            <Button
              onClick={handleUpload}
              disabled={loading || !selectedFile}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Загрузить
            </Button>

            <Button
              onClick={handleExportAll}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Экспорт всех
            </Button>
          </div>

          {/* Информация о выбранном файле */}
          {selectedFile && (
            <div className="p-3 bg-blue-50 rounded border border-blue-200 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-gray-500">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
          )}

          {/* Инструкция */}
          <div className="p-3 bg-gray-50 rounded border text-sm">
            <div className="font-medium mb-1">Как использовать:</div>
            <ol className="space-y-1 text-gray-600">
              <li>1. Скачайте шаблон Excel</li>
              <li>2. Заполните данные объектов (только "Название" обязательно)</li>
              <li>3. Выберите заполненный файл</li>
              <li>4. Нажмите "Загрузить" - создастся полная структура</li>
            </ol>
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
              <strong>Автоматически:</strong> поиск менеджеров, создание участков/зон/помещений, привязка техкарт, очистка дубликатов
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Результат загрузки */}
      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              Загрузка завершена
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.data?.success || 0}
                  </div>
                  <div className="text-sm text-gray-600">Объектов создано</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.data?.summary?.totalStructures?.rooms || 0}
                  </div>
                  <div className="text-sm text-gray-600">Помещений создано</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {result.data?.summary?.totalStructures?.techCards || 0}
                  </div>
                  <div className="text-sm text-gray-600">Техкарт создано</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {result.data?.summary?.totalStructures?.roomTechCards || 0}
                  </div>
                  <div className="text-sm text-gray-600">Привязок задач</div>
                </div>
              </div>

              {/* Дополнительная статистика */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3 pt-3 border-t">
                <div className="text-center">
                  <div className="text-lg font-bold text-indigo-600">
                    {result.data?.summary?.totalStructures?.sites || 0}
                  </div>
                  <div className="text-xs text-gray-500">Участков</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-cyan-600">
                    {result.data?.summary?.totalStructures?.zones || 0}
                  </div>
                  <div className="text-xs text-gray-500">Зон</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-teal-600">
                    {result.data?.summary?.totalStructures?.roomGroups || 0}
                  </div>
                  <div className="text-xs text-gray-500">Групп</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-amber-600">
                    {result.data?.summary?.totalStructures?.cleaningItems || 0}
                  </div>
                  <div className="text-xs text-gray-500">Объектов уборки</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    {result.data?.errors?.length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Ошибок</div>
                </div>
              </div>

              {result.data?.managerAssigned && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="font-medium text-blue-800">Назначенный менеджер:</div>
                  <div className="text-blue-700">
                    {result.data.managerAssigned.name}
                    {result.data.managerAssigned.phone && (
                      <span className="ml-2">({result.data.managerAssigned.phone})</span>
                    )}
                  </div>
                </div>
              )}

              {result.data?.created && result.data.created.length > 0 && (
                <div>
                  <div className="font-medium mb-2 text-green-700">Созданные объекты:</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {result.data.created.slice(0, 10).map((obj: any, index: number) => (
                      <div key={index} className="p-3 bg-white rounded border">
                        <div className="font-medium text-green-800">{obj.name}</div>
                        <div className="text-gray-600 text-xs mb-1">
                          Обработано строк: {obj.rowsProcessed} • Менеджер: {obj.managerFound ? '✅' : '❌'} {obj.manager}
                        </div>
                        {obj.structure && (
                          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-1">
                            <div className="font-medium mb-1">Создана полная структура:</div>
                            <div className="grid grid-cols-2 gap-1">
                              <div>📍 Участков: {obj.structure.sites}</div>
                              <div>🏢 Зон: {obj.structure.zones}</div>
                              <div>🏠 Групп: {obj.structure.roomGroups}</div>
                              <div>🚪 Помещений: {obj.structure.rooms}</div>
                              <div>🧹 Объектов уборки: {obj.structure.cleaningItems || 0}</div>
                              <div>📋 Техкарт: {obj.structure.techCards}</div>
                            </div>
                          </div>
                        )}
                        {obj.details && (
                          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1">
                            <div className="font-medium mb-1">Детали структуры:</div>
                            {obj.details.sites && obj.details.sites.length > 0 && (
                              <div className="mb-1">
                                <span className="font-medium">Участки:</span> {obj.details.sites.slice(0, 3).join(', ')}
                                {obj.details.sites.length > 3 && ` и еще ${obj.details.sites.length - 3}`}
                              </div>
                            )}
                            {obj.details.rooms && obj.details.rooms.length > 0 && (
                              <div className="mb-1">
                                <span className="font-medium">Помещения:</span> {obj.details.rooms.slice(0, 3).join(', ')}
                                {obj.details.rooms.length > 3 && ` и еще ${obj.details.rooms.length - 3}`}
                              </div>
                            )}
                            {obj.details.techCards && obj.details.techCards.length > 0 && (
                              <div>
                                <span className="font-medium">Техкарты:</span> {obj.details.techCards.slice(0, 2).join(', ')}
                                {obj.details.techCards.length > 2 && ` и еще ${obj.details.techCards.length - 2}`}
                              </div>
                            )}
                          </div>
                        )}
                        {obj.structureError && (
                          <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-1">
                            ⚠️ {obj.structureError}
                          </div>
                        )}
                      </div>
                    ))}
                    {result.data.created.length > 10 && (
                      <div className="text-center text-sm text-gray-500">
                        ... и еще {result.data.created.length - 10} объектов
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result.data?.errors && result.data.errors.length > 0 && (
                <div>
                  <div className="font-medium mb-2 text-red-700">Ошибки:</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {result.data.errors.slice(0, 5).map((error: any, index: number) => (
                      <div key={index} className="p-2 bg-red-50 rounded text-sm border border-red-200">
                        <div className="font-medium text-red-800">Строка {error.row}</div>
                        <div className="text-red-600">{error.error}</div>
                      </div>
                    ))}
                    {result.data.errors.length > 5 && (
                      <div className="text-center text-sm text-gray-500">
                        ... и еще {result.data.errors.length - 5} ошибок
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ошибки */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              Ошибка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
