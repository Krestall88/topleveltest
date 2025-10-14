'use client';

interface BarChartProps {
  data: any[];
  dataKeys: { key: string; name: string; color: string }[];
  xAxisKey: string;
  height?: number;
}

export default function BarChart({ data, dataKeys, xAxisKey, height = 300 }: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Нет данных для отображения
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.flatMap(item => 
      dataKeys.map(key => item[key.key] || 0)
    )
  );

  return (
    <div style={{ height }} className="w-full">
      <div className="flex flex-wrap gap-4 mb-4">
        {dataKeys.map((key) => (
          <div key={key.key} className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded" 
              style={{ backgroundColor: key.color }}
            ></div>
            <span className="text-sm text-gray-600">{key.name}</span>
          </div>
        ))}
      </div>
      
      <div className="flex items-end space-x-2 h-64 border-b border-l border-gray-300 p-4">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div className="flex space-x-1 mb-2 h-48 items-end">
              {dataKeys.map((key) => {
                const value = item[key.key] || 0;
                const height = maxValue > 0 ? (value / maxValue) * 180 : 0;
                return (
                  <div
                    key={key.key}
                    className="w-8 rounded-t"
                    style={{
                      height: `${height}px`,
                      backgroundColor: key.color,
                      minHeight: value > 0 ? '4px' : '0px',
                    }}
                    title={`${key.name}: ${value}`}
                  ></div>
                );
              })}
            </div>
            <div className="text-xs text-gray-600 text-center max-w-16 truncate">
              {item[xAxisKey]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
