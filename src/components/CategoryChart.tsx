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

  // Prepare chart data
  const chartData = items.map((item, index) => ({
    name: item.name.length > 20 ? `${item.name.substring(0, 20)}...` : item.name,
    actual: item.actual,
    target: item.target,
    targetMTD: item.targetMTD || 0,
    achievement: item.achievement,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatValue(entry.value)}
            </p>
          ))}
          <p className="text-sm text-muted-foreground mt-1">
            Achievement: {data.achievement.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-gray-900">{title} - Performance Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={formatValue}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Monthly Target Line */}
            <Line 
              type="monotone" 
              dataKey="target" 
              stroke="#dc2626" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Monthly Target"
              dot={{ fill: "#dc2626", strokeWidth: 2, r: 4 }}
            />
            
            {/* Target MTD Line */}
            <Line 
              type="monotone" 
              dataKey="targetMTD" 
              stroke="#3b82f6" 
              strokeWidth={2}
              strokeDasharray="3 3"
              name="Target MTD"
              dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
            />
            
            {/* Actual Performance Line */}
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="#22c55e" 
              strokeWidth={3}
              name="Actual"
              dot={{ fill: "#22c55e", strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7 }}
            />
            
            {/* Reference line at 100% achievement level */}
            <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="2 2" label="100% Target" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}