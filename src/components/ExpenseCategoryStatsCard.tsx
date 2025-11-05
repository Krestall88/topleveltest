'use client';

import { TrendingUp, AlertCircle } from 'lucide-react';

interface ExpenseCategoryStatsCardProps {
  category: {
    id: string;
    name: string;
    description: string | null;
  };
  spent: number;
  limit: number | null;
  remaining: number | null;
  percentage: number;
  hasLimit: boolean;
}

export default function ExpenseCategoryStatsCard({
  category,
  spent,
  limit,
  remaining,
  percentage,
  hasLimit
}: ExpenseCategoryStatsCardProps) {
  const getProgressColor = () => {
    if (!hasLimit) return 'bg-gray-400';
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 90) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  const getRemainingColor = () => {
    if (!hasLimit) return 'text-gray-600';
    if ((remaining || 0) < 0) return 'text-red-600';
    if (percentage >= 90) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            {category.name}
          </h3>
          {category.description && (
            <p className="text-sm text-gray-500">{category.description}</p>
          )}
        </div>
        {hasLimit && percentage >= 90 && (
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 ml-2" />
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Потрачено:</span>
          <span className="font-medium text-gray-900">
            {spent.toLocaleString('ru-RU')} ₽
          </span>
        </div>

        {hasLimit && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Лимит:</span>
              <span className="font-medium text-gray-900">
                {limit?.toLocaleString('ru-RU')} ₽
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Остаток:</span>
              <span className={`font-medium ${getRemainingColor()}`}>
                {remaining?.toLocaleString('ru-RU')} ₽
              </span>
            </div>

            {/* Прогресс-бар */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Использовано</span>
                <span>{percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${getProgressColor()}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>

            {percentage >= 100 && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                ⚠️ Лимит превышен
              </div>
            )}

            {percentage >= 90 && percentage < 100 && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                ⚠️ Лимит почти исчерпан
              </div>
            )}
          </>
        )}

        {!hasLimit && (
          <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
            Лимит не установлен
          </div>
        )}
      </div>
    </div>
  );
}
