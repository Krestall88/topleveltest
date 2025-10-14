'use client';

interface LineChartProps {
  data: any[];
  dataKeys: { key: string; name: string; color: string }[];
  xAxisKey: string;
  height?: number;
}

export default function LineChart({ data, dataKeys, xAxisKey, height = 300 }: LineChartProps) {
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

  const chartWidth = 600;
  const chartHeight = 200;
  const padding = 40;

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
      
      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight + padding * 2} className="border border-gray-300">
          {/* Сетка */}
          <defs>
            <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Линии данных */}
          {dataKeys.map((key) => {
            const points = data.map((item, index) => {
              const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
              const value = item[key.key] || 0;
              const y = padding + chartHeight - (value / maxValue) * chartHeight;
              return `${x},${y}`;
            }).join(' ');

            return (
              <g key={key.key}>
                <polyline
                  fill="none"
                  stroke={key.color}
                  strokeWidth="2"
                  points={points}
                />
                {/* Точки */}
                {data.map((item, index) => {
                  const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
                  const value = item[key.key] || 0;
                  const y = padding + chartHeight - (value / maxValue) * chartHeight;
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="3"
                      fill={key.color}
                    >
                      <title>{`${key.name}: ${value}`}</title>
                    </circle>
                  );
                })}
              </g>
            );
          })}
          
          {/* Подписи по X */}
          {data.map((item, index) => {
            const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
            return (
              <text
                key={index}
                x={x}
                y={chartHeight + padding + 15}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {item[xAxisKey]}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
