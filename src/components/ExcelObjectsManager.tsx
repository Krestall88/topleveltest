'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  FileText, 
  Eye, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  File
} from 'lucide-react';

interface ExcelObjectsManagerProps {
  onImportComplete?: () => void;
}

export default function ExcelObjectsManager({ onImportComplete }: ExcelObjectsManagerProps) {
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
      setAnalysisResult(null);
      setImportResult(null);
      setError(null);
    }
  };

  // Открытие диалога выбора файла
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // Анализ выбранного файла
  const handleAnalyzeFile = async () => {
    if (!selectedFile) {
      setError('Сначала выберите файл');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('action', 'analyze');

      const response = await fetch('/api/objects/upload-excel', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setAnalysisResult(data);
      } else {
        setError(data.message || 'Ошибка при анализе файла');
      }
    } catch (err) {
      setError('Ошибка сети при анализе файла');
    } finally {
      setLoading(false);
    }
  };

  // Предварительный просмотр импорта
  const handlePreviewImport = async () => {
    if (!selectedFile) {
      setError('Сначала выберите файл');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('action', 'import');
      formData.append('dryRun', 'true');

      const response = await fetch('/api/objects/upload-excel', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setImportResult(data);
      } else {
        setError(data.message || 'Ошибка при предварительном просмотре');
      }
    } catch (err) {
      setError('Ошибка сети при предварительном просмотре');
    } finally {
      setLoading(false);
    }
  };

  // Выполнение импорта
  const handleExecuteImport = async () => {
    if (!selectedFile) {
      setError('Сначала выберите файл');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('action', 'import');
      formData.append('dryRun', 'false');

      const response = await fetch('/api/objects/upload-excel', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setImportResult(data);
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        setError(data.message || 'Ошибка при импорте');
      }
    } catch (err) {
      setError('Ошибка сети при импорте');
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
    <div className="space-y-6">
      {/* Управляющие кнопки */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Управление объектами через Excel
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

          {/* Выбор файла */}
          <div className="mb-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleSelectFile}
                variant="outline"
                className="flex items-center gap-2"
              >
                <File className="w-4 h-4" />
                Выбрать файл Excel
              </Button>
              
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{selectedFile.name}</span>
                  <span className="text-gray-400">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Кнопки управления */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Скачать шаблон
            </Button>

            <Button
              onClick={handleAnalyzeFile}
              disabled={loading || !selectedFile}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              Анализ файла
            </Button>

            <Button
              onClick={handleExportAll}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Экспорт всех
            </Button>

            {analysisResult && (
              <Button
                onClick={handlePreviewImport}
                disabled={loading || !selectedFile}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Предпросмотр
              </Button>
            )}
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Инструкция:</h4>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Скачайте шаблон Excel файла</li>
              <li>2. Заполните данные объектов</li>
              <li>3. Нажмите "Выбрать файл Excel" и выберите заполненный файл</li>
              <li>4. Нажмите "Анализ файла" для проверки</li>
              <li>5. Выполните предпросмотр, затем импорт</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Результат анализа файла */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Анализ файла Excel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="mb-4 p-3 bg-gray-50 rounded border">
                <div className="font-medium mb-1">Информация о файле:</div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Файл:</strong> {analysisResult.data?.fileName}</div>
                  <div><strong>Размер:</strong> {analysisResult.data?.fileSize ? `${(analysisResult.data.fileSize / 1024).toFixed(1)} KB` : 'Неизвестно'}</div>
                  <div><strong>Лист:</strong> {analysisResult.data?.sheetName}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {analysisResult.data?.validObjects || 0}
                  </div>
                  <div className="text-sm text-gray-600">Объектов найдено</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisResult.data?.headers?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Колонок</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysisResult.data?.totalRows || 0}
                  </div>
                  <div className="text-sm text-gray-600">Строк данных</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {analysisResult.data?.defaultManager ? '1' : '0'}
                  </div>
                  <div className="text-sm text-gray-600">Менеджер найден</div>
                </div>
              </div>

              {analysisResult.data?.defaultManager && (
                <div className="p-3 bg-green-50 rounded border border-green-200">
                  <div className="font-medium text-green-800">Менеджер по умолчанию:</div>
                  <div className="text-green-700">
                    {analysisResult.data.defaultManager.name}
                    {analysisResult.data.defaultManager.phone && (
                      <span className="ml-2">({analysisResult.data.defaultManager.phone})</span>
                    )}
                  </div>
                </div>
              )}

              {analysisResult.data?.headers && (
                <div>
                  <div className="font-medium mb-2">Найденные колонки:</div>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.data.headers.map((header: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {header}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {analysisResult.data?.preview && analysisResult.data.preview.length > 0 && (
                <div>
                  <div className="font-medium mb-2">Предварительный просмотр данных:</div>
                  <div className="space-y-2">
                    {analysisResult.data.preview.slice(0, 3).map((obj: any, index: number) => (
                      <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium">
                          {obj[analysisResult.data.headers[0]] || 'Без названия'}
                        </div>
                        <div className="text-gray-600 text-xs">
                          Строка {obj._rowIndex}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handlePreviewImport}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Предварительный просмотр импорта
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Результат импорта */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.data?.dryRun ? (
                <Eye className="w-5 h-5 text-blue-500" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {importResult.data?.dryRun ? 'Предварительный просмотр' : 'Результат импорта'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.data?.success || 0}
                  </div>
                  <div className="text-sm text-gray-600">
                    {importResult.data?.dryRun ? 'Готовы к импорту' : 'Успешно создано'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {importResult.data?.errors?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Ошибок</div>
                </div>
              </div>

              {importResult.data?.managerAssigned && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="font-medium text-blue-800">Назначенный менеджер:</div>
                  <div className="text-blue-700">
                    {importResult.data.managerAssigned.name}
                    {importResult.data.managerAssigned.phone && (
                      <span className="ml-2">({importResult.data.managerAssigned.phone})</span>
                    )}
                  </div>
                </div>
              )}

              {importResult.data?.created && importResult.data.created.length > 0 && (
                <div>
                  <div className="font-medium mb-2">
                    {importResult.data.dryRun ? 'Будут созданы:' : 'Созданные объекты:'}
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {importResult.data.created.map((obj: any, index: number) => (
                      <div key={index} className="p-2 bg-green-50 rounded text-sm">
                        <div className="font-medium">{obj.name}</div>
                        <div className="text-gray-600 text-xs">
                          Строка {obj.row} • Менеджер: {obj.manager}
                          {obj.preview && <span className="text-blue-600"> • Предпросмотр</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.data?.errors && importResult.data.errors.length > 0 && (
                <div>
                  <div className="font-medium mb-2 text-red-700">Ошибки:</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {importResult.data.errors.map((error: any, index: number) => (
                      <div key={index} className="p-2 bg-red-50 rounded text-sm border border-red-200">
                        <div className="font-medium text-red-800">Строка {error.row}</div>
                        <div className="text-red-600">{error.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.data?.dryRun && importResult.data.success > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleExecuteImport}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Выполнить импорт ({importResult.data.success} объектов)
                  </Button>
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
