import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface SpeedometerChartProps {
  location: string;
  achievement: number;
  target: number;
  actual: number;
  title: string;
}

export function SpeedometerChart({ location, achievement, target, actual, title }: SpeedometerChartProps) {
  // Ensure achievement is a valid number and within reasonable bounds
  const validAchievement = isNaN(achievement) ? 0 : Math.max(0, achievement);
  const percentage = Math.min(validAchievement, 150); // Allow up to 150% for better visualization
  const angle = (Math.min(percentage, 100) / 100) * 180 - 90; // Needle position based on 0-100%
  
  const getColor = (achievement: number) => {
    if (achievement >= 100) return "#22c55e"; // green
    if (achievement >= 90) return "#3b82f6"; // blue  
    if (achievement >= 70) return "#f59e0b"; // yellow
    return "#ef4444"; // red
  };

  const color = getColor(validAchievement);

  // Format values appropriately
  const formatValue = (value: number) => {
    if (title.toLowerCase().includes('sales') || title.toLowerCase().includes('labour')) {
      if (value >= 100000) {
        return `₹${(value / 100000).toFixed(1)}L`;
      } else {
        return new Intl.NumberFormat('en-IN', { 
          style: 'currency', 
          currency: 'INR', 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 0 
        }).format(value);
      }
    }
    return value.toLocaleString();
  };

  return (
    <Card className="border-gray-200 shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-center text-sm font-medium text-black-700 min-h-[2.5rem] flex items-center justify-center">
          <b>{location}</b>
        </CardTitle>
        <p className="text-xs text-black-500 text-center"><b>{title}</b></p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative w-32 h-20 mx-auto mb-3">
          {/* Speedometer arc background */}
          <svg className="w-full h-full" viewBox="0 0 128 80" style={{ overflow: 'visible' }}>
            {/* Background arc */}
            <path
              d="M 16 56 A 48 48 0 0 1 112 56"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <path
              d="M 16 56 A 48 48 0 0 1 112 56"
              stroke={color}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(Math.min(percentage, 100) / 100) * 150.8} 150.8`}
              className="transition-all duration-1000 ease-out"
            />
            {/* Center point */}
            <circle cx="64" cy="56" r="3" fill="#000000ff" />
            {/* Needle */}
            <line
              x1="64"
              y1="56"
              x2="64"
              y2="24"
              stroke="#000000ff"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${angle} 64 56)`}
              className="transition-transform duration-1000 ease-out"
            />
          </svg>
        </div>
        
        <div className="text-center space-y-2">
          <div className="text-xl font-bold" style={{ color }}>
            {validAchievement.toFixed(1)}%
          </div>
          <div className="text-xs text-black-600 space-y-1">
            <div><span className="font-medium">Target:</span> {formatValue(target)}</div>
            <div><span className="font-medium">Actual:</span> {formatValue(actual)}</div>
          </div>
       </div>
      </CardContent>
    </Card>
  );
}