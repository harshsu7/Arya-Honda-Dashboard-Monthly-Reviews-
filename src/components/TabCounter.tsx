import { Badge } from "./ui/badge";

interface TabCounterProps {
  achieved: number;
  belowTarget: number;
  needsAction: number;
  showDetailed?: boolean;
}

export function TabCounter({ achieved, belowTarget, needsAction, showDetailed = false }: TabCounterProps) {
  if (showDetailed) {
    return (
      <div className="flex items-center space-x-1 ml-2">
        {achieved > 0 && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-1 py-0">
            {achieved}
          </Badge>
        )}
        {belowTarget > 0 && (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs px-1 py-0">
            {belowTarget}
          </Badge>
        )}
        {needsAction > 0 && (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-1 py-0">
            {needsAction}
          </Badge>
        )}
      </div>
    );
  }

  // Simplified view for tabs
  const total = achieved + belowTarget + needsAction;
  if (total === 0) return null;

  return (
    <div className="flex items-center space-x-1 ml-1">
      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs px-1.5 py-0.5">
        {total}
      </Badge>
    </div>
  );
}