import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";

interface TeamMember {
  name: string;
  role: string;
  target: number;
  actual: number;
  achievement: number;
}

interface TeamPerformanceTableProps {
  title: string;
  data: TeamMember[];
  format?: 'currency' | 'percentage' | 'number';
}

export function TeamPerformanceTable({ 
  title, 
  data, 
  format = 'number' 
}: TeamPerformanceTableProps) {
  const formatValue = (value: number): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-In', {
          style: 'currency',
          currency: 'Indian Rupees',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const getPerformanceBadge = (achievement: number) => {
    if (achievement >= 100) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Exceeds</Badge>;
    } else if (achievement >= 90) {
      return <Badge variant="secondary">Meets</Badge>;
    } else if (achievement >= 75) {
      return <Badge variant="outline" className="border-yellow-300 text-yellow-700">Below</Badge>;
    } else {
      return <Badge variant="destructive">Critical</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead>Achievement</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((member, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell className="text-muted-foreground">{member.role}</TableCell>
                <TableCell className="text-right">{formatValue(member.target)}</TableCell>
                <TableCell className="text-right">{formatValue(member.actual)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{member.achievement.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(member.achievement, 100)} className="h-2" />
                  </div>
                </TableCell>
                <TableCell>
                  {getPerformanceBadge(member.achievement)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}