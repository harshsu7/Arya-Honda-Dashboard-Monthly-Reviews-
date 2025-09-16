import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { TabCounter } from "./TabCounter";

interface KPIItem {
  name: string;
  target: number;
  actual: number;
  achievement: number;
  shortfall: number;
  unit?: string;
}

interface CategorySectionProps {
  title: string;
  items: KPIItem[];
  color?: string;
  location?: string;
}

export function CategorySection({ title, items, color = "blue", location }: CategorySectionProps) {
  // Calculate counts for this section
  const validItems = items.filter(item => !isNaN(item.achievement));
  const achieved = validItems.filter(item => item.achievement >= 100).length;
  const belowTarget = validItems.filter(item => item.achievement < 100 && item.achievement >= 70).length;
  const needsAction = validItems.filter(item => item.achievement < 70).length;

  const getAchievementBadge = (achievement: number) => {
    if (isNaN(achievement)) {
      return <Badge variant="outline" className="border-gray-300 text-gray-600">N/A</Badge>;
    }
    if (achievement >= 100) {
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Achieved</Badge>;
    } else if (achievement >= 90) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Near Target</Badge>;
    } else if (achievement >= 70) {
      return <Badge variant="outline" className="border-yellow-300 text-yellow-700">Below Target</Badge>;
    } else {
      return <Badge variant="destructive" className="bg-red-100 text-red-800">Critical</Badge>;
    }
  };

  const getProgressColor = (achievement: number) => {
    if (isNaN(achievement)) return "bg-gray-200";
    if (achievement >= 100) return "bg-green-500";
    if (achievement >= 90) return "bg-blue-500";
    if (achievement >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  const formatNumber = (num: number, unit?: string): string => {
    if (isNaN(num)) return "N/A";
    
    // Check if this is likely a currency value (large numbers in labour/parts sections)
    const isCurrency = (title.toLowerCase().includes('labour') || title.toLowerCase().includes('parts')) && 
                      num > 1000 && !unit;
    
    if (isCurrency) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
    }
    
    const formatted = num.toLocaleString();
    return unit ? `${formatted} ${unit}` : formatted;
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-gray-900">
          <div className="flex flex-col">
            <span>{title}</span>
            {location && (
              <span className="text-sm font-normal text-gray-500 mt-1">{location} Location</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <TabCounter 
              achieved={achieved}
              belowTarget={belowTarget}
              needsAction={needsAction}
              showDetailed={true}
            />
            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
              {items.length} Total
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{item.name}</h4>
                {getAchievementBadge(item.achievement)}
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Target</p>
                  <p className="font-semibold">{formatNumber(item.target, item.unit)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Actual</p>
                  <p className="font-semibold">{formatNumber(item.actual, item.unit)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Achievement</p>
                  <p className="font-semibold">
                    {isNaN(item.achievement) ? "N/A" : `${item.achievement.toFixed(1)}%`}
                  </p>
                </div>
              </div>

              {!isNaN(item.achievement) && (
                <div className="space-y-2">
                  <Progress 
                    value={Math.min(Math.max(item.achievement, 0), 100)} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {item.shortfall > 0 
                        ? `Shortfall: ${formatNumber(Math.abs(item.shortfall), item.unit)}`
                        : `Exceeded by: ${formatNumber(Math.abs(item.shortfall), item.unit)}`
                      }
                    </span>
                    {item.achievement < 70 && (
                      <div className="flex items-center space-x-1 text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Needs Attention</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}