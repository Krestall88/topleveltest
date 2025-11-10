'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportExcelPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [objectName, setObjectName] = useState('');
  const [clearExisting, setClearExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !objectName) {
      setError('Выберите файл и укажите название объекта');
      return;
    }
    
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('objectName', objectName);
      formData.append('clearExisting', clearExisting.toString());
      
      const response = await fetch('/api/import-excel', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки');
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-6">Импорт данных из Excel</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Название объекта */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название объекта
              </label>
              <input
                type="text"
                value={objectName}
                onChange={(e) => setObjectName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Например: ООО «ПепсиКо Холдингс»"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Укажите точное название объекта, который уже существует в системе
              </p>
            </div>
            
            {/* Файл */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excel файл
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Файл должен содержать колонки: участок, зона, группа помещений, помещение, Объект уборки, тех задание, периодичность, примечания, период
              </p>
            </div>
            
            {/* Очистить существующие данные */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="clearExisting"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="clearExisting" className="ml-2 block text-sm text-gray-700">
                Удалить существующие данные объекта перед загрузкой
              </label>
            </div>
            
            {/* Кнопки */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Загрузка...' : 'Загрузить данные'}
              </button>
              
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Отмена
              </button>
            </div>
          </form>
          
          {/* Ошибка */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}
          
          {/* Результат */}
          {result && (
            <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-md">
              <h2 className="text-xl font-semibold text-green-800 mb-4">
                ✅ {result.message}
              </h2>
              
              <div className="space-y-2 text-sm text-green-700">
                <p>📍 Участков создано: {result.stats.sitesCreated}</p>
                <p>🏗️ Зон создано: {result.stats.zonesCreated}</p>
                <p>📦 Групп помещений создано: {result.stats.roomGroupsCreated}</p>
                <p>🚪 Помещений создано: {result.stats.roomsCreated}</p>
                <p>🧹 Объектов уборки создано: {result.stats.cleaningItemsCreated}</p>
                <p>📋 Техкарт создано: {result.stats.techCardsCreated}</p>
                {result.stats.skipped > 0 && (
                  <p className="text-yellow-700">⚠️ Пропущено строк: {result.stats.skipped}</p>
                )}
              </div>
              
              <button
                onClick={() => router.push('/objects')}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Перейти к объектам
              </button>
            </div>
          )}
          
          {/* Инструкция */}
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">
              📖 Инструкция по использованию
            </h3>
            
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
              <li>Убедитесь, что объект уже создан в системе</li>
              <li>Подготовьте Excel файл с данными (см. формат выше)</li>
              <li>Укажите точное название объекта</li>
              <li>Выберите файл для загрузки</li>
              <li>Отметьте "Удалить существующие данные", если хотите заменить все данные объекта</li>
              <li>Нажмите "Загрузить данные"</li>
            </ol>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Важно:</strong> Система автоматически подстраивается под иерархию каждого объекта.
                Если в Excel отсутствуют некоторые уровни (зона, группа, помещение), они не будут созданы.
                Все данные остаются на своих местах согласно структуре Excel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
