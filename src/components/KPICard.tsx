import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  actual: number;
  target: number;
  unit: string;
  format?: 'currency' | 'percentage' | 'number';
  trend?: 'up' | 'down' | 'neutral';
  previousPeriod?: number;
}

export function KPICard({ 
  title, 
  actual, 
  target, 
  unit, 
  format = 'number',
  trend,
  previousPeriod 
}: KPICardProps) {
  const achievementRate = (actual / target) * 100;
  const isOnTarget = achievementRate >= 100;
  const isNearTarget = achievementRate >= 90;

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
        return value.toLocaleString();
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="relative border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-semibold">
                {formatValue(actual)}
              </span>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            {trend && previousPeriod && (
              <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="text-sm">
                  {Math.abs(((actual - previousPeriod) / previousPeriod) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Target: {formatValue(target)} {unit}
              </span>
              <Badge variant={isOnTarget ? "default" : isNearTarget ? "secondary" : "destructive"}>
                {achievementRate.toFixed(1)}%
              </Badge>
            </div>
            <Progress 
              value={Math.min(achievementRate, 100)} 
              className="h-2"
            />
          </div>
          
          <div className="text-xs text-muted-foreground">
            {isOnTarget 
              ? `Exceeded target by ${formatValue(actual - target)} ${unit}`
              : `${formatValue(target - actual)} ${unit} remaining`
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
}