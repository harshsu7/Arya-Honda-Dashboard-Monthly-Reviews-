import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface KPIItem {
  name: string;
  target: number;
  targetMTD?: number;
  actual: number;
  achievement: number;
  shortfall: number;
  unit?: string;
}

interface CategoryChartProps {
  title: string;
  items: KPIItem[];
  format?: 'currency' | 'percentage' | 'number';
}

export function CategoryChart({ 
  title, 
  items, 
  format = 'number' 
}: CategoryChartProps) {
  const formatValue = (value: number): string => {
    if (!value || isNaN(value)) return '0';
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString('en-IN');
    }
  };

  // Prepare chart data with safety checks
  const chartData = items
    .filter(item => item && item.name && !isNaN(item.actual))
    .slice(0, 10) // Limit to 10 items for performance
    .map((item, index) => ({
      name: item.name.length > 15 ? `${item.name.substring(0, 15)}...` : item.name,
      actual: Number(item.actual) || 0,
      target: Number(item.target) || 0,
      targetMTD: Number(item.targetMTD) || 0,
      achievement: Number(item.achievement) || 0,
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-md max-w-xs">
          <p className="font-medium text-sm">{label}</p>
          {payload.slice(0, 3).map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-xs">
              {entry.name}: {formatValue(entry.value)}
            </p>
          ))}
          {data.achievement > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Achievement: {data.achievement.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (!items || items.length === 0 || chartData.length === 0) {
    return null;
  }

  try {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-gray-900 text-sm">{title} - Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickFormatter={formatValue}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Actual Performance Line */}
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Actual"
                dot={{ fill: "#22c55e", strokeWidth: 1, r: 3 }}
              />
              
              {/* Monthly Target Line */}
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="#dc2626" 
                strokeWidth={1}
                strokeDasharray="5 5"
                name="Monthly Target"
                dot={{ fill: "#dc2626", strokeWidth: 1, r: 2 }}
              />
              
              {/* Target MTD Line - only show if data exists */}
              {chartData.some(item => item.targetMTD > 0) && (
                <Line 
                  type="monotone" 
                  dataKey="targetMTD" 
                  stroke="#3b82f6" 
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  name="Target MTD"
                  dot={{ fill: "#3b82f6", strokeWidth: 1, r: 2 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  } catch (error) {
    console.error('Error rendering CategoryChart:', error);
    return null;
  }
}