'use client';

interface PieChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  colors: string[];
  height?: number;
}

export default function PieChart({ data, dataKey, nameKey, colors, height = 300 }: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Нет данных для отображения
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + (item[dataKey] || 0), 0);
  
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Нет данных для отображения
      </div>
    );
  }

  let currentAngle = 0;
  const radius = 80;
  const centerX = 150;
  const centerY = 100;

  const segments = data.map((item, index) => {
    const value = item[dataKey] || 0;
    const percentage = (value / total) * 100;
    const angle = (value / total) * 360;
    
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
    const endAngleRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    return {
      pathData,
      color: colors[index % colors.length],
      name: item[nameKey],
      value,
      percentage: percentage.toFixed(1)
    };
  });

  return (
    <div style={{ height }} className="w-full">
      <div className="flex flex-col items-center">
        <svg width={300} height={200} className="mb-4">
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.pathData}
              fill={segment.color}
              stroke="white"
              strokeWidth="2"
            >
              <title>{`${segment.name}: ${segment.value} (${segment.percentage}%)`}</title>
            </path>
          ))}
        </svg>
        
        <div className="flex flex-wrap gap-4 justify-center">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: segment.color }}
              ></div>
              <span className="text-sm text-gray-600">
                {segment.name} ({segment.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
