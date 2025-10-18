import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { MultiSelectDropdown } from "./MultiSelectDropdown";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  Calendar,
  MapPin,
  MousePointerClick,
} from "lucide-react";
import { getKPIDataByFilters, getAvailableMonths, type KPIRecord } from "../utils/supabaseClient";

interface CSVRow {
  Tags: string;
  Parameters: string;
  "Monthly Target": number;
  "Target MTD": number;
  "Actual As On Date": number;
  Shortfall: number;
  "% ACH": number;
  Location: string;
  Month: string;
}

interface MonthWiseComparisonProps {
  uploadedData: { [location: string]: CSVRow[] };
}

export function MonthWiseComparison({ uploadedData }: MonthWiseComparisonProps) {
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<KPIRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightFilter, setHighlightFilter] = useState<"all" | "achieved" | "belowTarget" | "needsAction">("all");

  const belowTargetRef = useRef<HTMLDivElement>(null);
  const locations = ["Kalina", "Sewri", "Reayroad", "Bhandup", "Dockyard Road"];

  // Load available months from database
  useEffect(() => {
    const loadMonths = async () => {
      const { data, error } = await getAvailableMonths();
      if (!error && data.length > 0) {
        setAvailableMonths(data);
        // Auto-select first month
        if (data.length > 0) {
          setSelectedMonths([data[0]]);
        }
      }
    };
    loadMonths();
  }, []);

  // Load comparison data when filters change
  useEffect(() => {
    const loadComparisonData = async () => {
      if (selectedLocations.length === 0 || selectedMonths.length === 0) {
        setComparisonData([]);
        return;
      }

      setIsLoading(true);
      const { data, error } = await getKPIDataByFilters(selectedLocations, selectedMonths);
      if (!error) {
        setComparisonData(data);
      }
      setIsLoading(false);
    };

    loadComparisonData();
  }, [selectedLocations, selectedMonths]);

  // Handle "All Locations" button
  const handleAllLocations = () => {
    if (selectedLocations.length === locations.length) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations([...locations]);
    }
  };

  // Handle "All Months" button
  const handleAllMonths = () => {
    if (selectedMonths.length === availableMonths.length) {
      setSelectedMonths([]);
    } else {
      setSelectedMonths([...availableMonths]);
    }
  };

  // Process data for visualizations
  const visualizationData = useMemo(() => {
    if (comparisonData.length === 0) return null;

    // 1. Throughput comparison by location and month
    const throughputData = comparisonData
      .filter(record => record.parameters.toLowerCase().includes("total throughput"))
      .map(record => ({
        location: record.location,
        month: record.month,
        target: record.monthly_target,
        actual: record.actual_as_on_date,
        achievement: record.percentage_ach,
      }));

    // 2. Labour sales comparison
    const labourData = comparisonData
      .filter(record => 
        record.tags.toLowerCase() === "labour sale" &&
        (record.parameters.toLowerCase().includes("total labour") || 
         record.parameters.toLowerCase().includes("total pmgr"))
      )
      .map(record => ({
        location: record.location,
        month: record.month,
        target: record.monthly_target,
        actual: record.actual_as_on_date,
        achievement: record.percentage_ach,
      }));

    // 3. Parts sales comparison
    const partsData = comparisonData
      .filter(record => 
        record.tags.toLowerCase().includes("parts") &&
        record.parameters.toLowerCase().includes("total")
      )
      .map(record => ({
        location: record.location,
        month: record.month,
        target: record.monthly_target,
        actual: record.actual_as_on_date,
        achievement: record.percentage_ach,
      }));

    // 4. Overall achievement by location (aggregate across selected months)
    const locationAchievement: { [key: string]: { target: number, actual: number, count: number } } = {};
    
    comparisonData.forEach(record => {
      if (!locationAchievement[record.location]) {
        locationAchievement[record.location] = { target: 0, actual: 0, count: 0 };
      }
      locationAchievement[record.location].target += record.monthly_target;
      locationAchievement[record.location].actual += record.actual_as_on_date;
      locationAchievement[record.location].count++;
    });

    const achievementByLocation = Object.entries(locationAchievement).map(([location, data]) => ({
      location,
      achievement: data.target > 0 ? (data.actual / data.target) * 100 : 0,
      achieved: data.actual,
      target: data.target,
      targetMTD: data.target, // For the combo chart line
    }));

    // 5. Monthly trend (aggregate across selected locations)
    const monthlyTrend: { [key: string]: { target: number, actual: number } } = {};
    
    comparisonData.forEach(record => {
      if (!monthlyTrend[record.month]) {
        monthlyTrend[record.month] = { target: 0, actual: 0 };
      }
      monthlyTrend[record.month].target += record.monthly_target;
      monthlyTrend[record.month].actual += record.actual_as_on_date;
    });

    const trendData = Object.entries(monthlyTrend).map(([month, data]) => ({
      month,
      target: data.target,
      actual: data.actual,
      achievement: data.target > 0 ? (data.actual / data.target) * 100 : 0,
    }));

    // 6. Achievement distribution (donut chart data)
    const achievedCount = achievementByLocation.filter(item => item.achievement >= 100).length;
    const belowTargetCount = achievementByLocation.filter(item => item.achievement >= 70 && item.achievement < 100).length;
    const needsActionCount = achievementByLocation.filter(item => item.achievement < 70).length;

    const achievementDistribution = [
      { name: "Achieved (≥100%)", value: achievedCount, color: "#22c55e" },
      { name: "Below Target (70-99%)", value: belowTargetCount, color: "#eab308" },
      { name: "Needs Action (<70%)", value: needsActionCount, color: "#ef4444" },
    ].filter(item => item.value > 0);

    return {
      throughputData,
      labourData,
      partsData,
      achievementByLocation,
      trendData,
      achievementDistribution,
    };
  }, [comparisonData]);

  const COLORS = {
    primary: "#3b82f6",
    secondary: "#10b981",
    tertiary: "#f59e0b",
    achieved: "#22c55e",
    belowTarget: "#eab308",
    needsAction: "#ef4444",
  };

  // Scroll to and highlight below target items
  const handleCardClick = (filterType: "achieved" | "belowTarget" | "needsAction") => {
    setHighlightFilter(filterType);
    // Scroll to the achievement chart
    if (belowTargetRef.current) {
      belowTargetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>Comparison Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location Filter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Locations
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAllLocations}
                  className="text-xs"
                >
                  {selectedLocations.length === locations.length ? "Clear All" : "All Locations"}
                </Button>
              </div>
              <MultiSelectDropdown
                options={locations}
                selectedOptions={selectedLocations}
                onChange={setSelectedLocations}
                placeholder="Select locations to compare"
                allOptionText="Locations"
              />
            </div>

            {/* Month Filter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Months
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAllMonths}
                  className="text-xs"
                  disabled={availableMonths.length === 0}
                >
                  {selectedMonths.length === availableMonths.length ? "Clear All" : "All Months"}
                </Button>
              </div>
              <MultiSelectDropdown
                options={availableMonths}
                selectedOptions={selectedMonths}
                onChange={setSelectedMonths}
                placeholder="Select months to compare"
                allOptionText="Months"
              />
            </div>
          </div>

          {/* Selection Summary */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">
                Comparing <strong>{selectedLocations.length}</strong> location(s) across <strong>{selectedMonths.length}</strong> month(s)
              </span>
              <Badge variant="outline" className="bg-white text-blue-700 border-blue-300">
                {comparisonData.length} Records
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading comparison data...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && (selectedLocations.length === 0 || selectedMonths.length === 0) && (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Select Filters to Compare
            </h3>
            <p className="text-gray-500">
              Choose at least one location and one month to view comparison charts.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Visualizations */}
      {!isLoading && visualizationData && selectedLocations.length > 0 && selectedMonths.length > 0 && (
        <>
          {/* Achievement Summary Cards - Clickable */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card 
              className="border-green-200 bg-green-50 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCardClick("achieved")}
            >
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <MousePointerClick className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-xs text-green-600">Click to filter</span>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {visualizationData.achievementDistribution.find(d => d.name.includes("Achieved"))?.value || 0}
                </div>
                <div className="text-sm text-green-700 mt-2">Locations Achieved Target (≥100%)</div>
              </CardContent>
            </Card>
            <Card 
              className="border-yellow-200 bg-yellow-50 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCardClick("belowTarget")}
            >
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <MousePointerClick className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="text-xs text-yellow-600">Click to filter</span>
                </div>
                <div className="text-3xl font-bold text-yellow-600">
                  {visualizationData.achievementDistribution.find(d => d.name.includes("Below"))?.value || 0}
                </div>
                <div className="text-sm text-yellow-700 mt-2">Below Target (70-99%)</div>
              </CardContent>
            </Card>
            <Card 
              className="border-red-200 bg-red-50 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCardClick("needsAction")}
            >
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <MousePointerClick className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-xs text-red-600">Click to filter</span>
                </div>
                <div className="text-3xl font-bold text-red-600">
                  {visualizationData.achievementDistribution.find(d => d.name.includes("Needs"))?.value || 0}
                </div>
                <div className="text-sm text-red-700 mt-2">Needs Immediate Action (&lt;70%)</div>
              </CardContent>
            </Card>
          </div>

          {/* Combo Chart: Achievement by Location with Target MTD Line */}
          <Card className="border-gray-200 shadow-sm" ref={belowTargetRef}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span>Achievement Comparison by Location</span>
                </div>
                {highlightFilter !== "all" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHighlightFilter("all")}
                    className="text-xs"
                  >
                    Show All
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart 
                  data={
                    highlightFilter === "all" 
                      ? visualizationData.achievementByLocation 
                      : visualizationData.achievementByLocation.filter(item => {
                          if (highlightFilter === "achieved") return item.achievement >= 100;
                          if (highlightFilter === "belowTarget") return item.achievement >= 70 && item.achievement < 100;
                          if (highlightFilter === "needsAction") return item.achievement < 70;
                          return true;
                        })
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="location" />
                  <YAxis 
                    yAxisId="left"
                    label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }} 
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    label={{ value: 'Target MTD (₹)', angle: 90, position: 'insideRight' }} 
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'achieved') return [`₹${Number(value).toLocaleString('en-IN')}`, 'Achieved'];
                      if (name === 'target') return [`₹${Number(value).toLocaleString('en-IN')}`, 'Target'];
                      if (name === 'targetMTD') return [`₹${Number(value).toLocaleString('en-IN')}`, 'Target MTD'];
                      return value;
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="achieved" 
                    fill={COLORS.secondary} 
                    name="Achieved (₹)" 
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="target" 
                    fill={COLORS.tertiary} 
                    name="Target (₹)" 
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="targetMTD" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    name="Target MTD (₹)"
                    dot={{ r: 6, fill: "#8b5cf6" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              
              {/* Filter indicator */}
              {highlightFilter !== "all" && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                  <p className="text-sm text-blue-700">
                    Showing locations with{" "}
                    <strong>
                      {highlightFilter === "achieved" && "Achievement ≥ 100%"}
                      {highlightFilter === "belowTarget" && "Achievement 70-99%"}
                      {highlightFilter === "needsAction" && "Achievement < 70%"}
                    </strong>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Chart: Monthly Trend */}
          {visualizationData.trendData.length > 1 && (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Monthly Performance Trend</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={visualizationData.trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="target" 
                      stroke={COLORS.tertiary} 
                      strokeWidth={2}
                      name="Target"
                      dot={{ r: 5 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke={COLORS.secondary} 
                      strokeWidth={2}
                      name="Actual"
                      dot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Donut Chart: Achievement Distribution */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChartIcon className="h-5 w-5 text-purple-600" />
                <span>Target Achievement Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={visualizationData.achievementDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => 
                      `${name.split('(')[0]}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={120}
                    innerRadius={60}
                    fill="#433bd3ff"
                    dataKey="value"
                  >
                    {visualizationData.achievementDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Throughput Comparison */}
          {visualizationData.throughputData.length > 0 && (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle>Vehicle Throughput Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={visualizationData.throughputData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="location" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="target" fill="#f59e0b" name="Target" />
                    <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
