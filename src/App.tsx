import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import {
  CalendarDays,
  Settings,
  TrendingUp,
  Car,
  Wrench,
  Users,
  DollarSign,
  BarChart3,
  Cog,
  ShoppingCart,
  MapPin,
  Upload,
  PieChart,
} from "lucide-react";
import { KPICard } from "./components/KPICard";
import { PerformanceChart } from "./components/PerformanceChart";
import { CategorySection } from "./components/CategorySection";
import { TabCounter } from "./components/TabCounter";
import { SpeedometerChart } from "./components/SpeedometerChart";
import { CSVUpload } from "./components/CSVUpload";
import {
  getKPIDataByLocation,
  getAllKPIData,
  type KPIRecord,
} from "./utils/supabaseClient";
import aryaHondaLogo from "./assets/Logo.png";

// Default empty data structure - all data will come from database
const emptyData: any[] = [];

const locations = [
  "Kalina",
  "Sewri",
  "Reayroad",
  "Bhandup",
  "Dockyard Road",
];

interface CSVRow {
  Tags: string;
  Parameters: string;
  "Monthly Target": number;
  "Target MTD": number;
  "Actual As On Date": number;
  Shortfall: number;
  "% ACH": number;
  Location: string;
}

export default function App() {
  const [selectedLocation, setSelectedLocation] =
    useState("All Locations");
  const [uploadedData, setUploadedData] = useState<{
    [location: string]: CSVRow[];
  }>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [allLocationsData, setAllLocationsData] = useState<{
    [location: string]: CSVRow[];
  }>({});
  const [dbConnectionStatus, setDbConnectionStatus] = useState<
    "connected" | "disconnected" | "loading"
  >("loading");

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Load data for all locations when component mounts
  useEffect(() => {
    const loadAllLocationsData = async () => {
      setIsLoadingData(true);
      setDbConnectionStatus("loading");

      try {
        console.log("Loading all KPI data from database...");
        const { data: allKpiData, error } =
          await getAllKPIData();

        if (error) {
          console.warn("Database connection issue:", error);
          setDbConnectionStatus("disconnected");
          return;
        }

        if (allKpiData && allKpiData.length > 0) {
          console.log(
            `Successfully loaded ${allKpiData.length} records from database`,
          );
          const allData: { [location: string]: CSVRow[] } = {};

          // Group data by location
          allKpiData.forEach((record: KPIRecord) => {
            if (!allData[record.location]) {
              allData[record.location] = [];
            }

            const csvRow: CSVRow = {
              Tags: record.tags,
              Parameters: record.parameters,
              "Monthly Target": record.monthly_target,
              "Target MTD": record.target_mtd,
              "Actual As On Date": record.actual_as_on_date,
              Shortfall: record.shortfall,
              "% ACH": record.percentage_ach,
              Location: record.location,
            };

            allData[record.location].push(csvRow);
          });

          console.log(
            "Grouped data by locations:",
            Object.keys(allData),
          );
          setAllLocationsData(allData);
          setUploadedData(allData);
          setDbConnectionStatus("connected");
        } else {
          console.log("No data found in database");
          setDbConnectionStatus("connected");
        }
      } catch (error) {
        console.error(
          "Error loading all locations data:",
          error,
        );
        setDbConnectionStatus("disconnected");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadAllLocationsData();
  }, []); // Only run once on mount

  // Refresh data when new data is uploaded
  const refreshDataFromDatabase = async () => {
    setIsLoadingData(true);
    try {
      const { data: allKpiData, error } = await getAllKPIData();

      if (!error && allKpiData && allKpiData.length > 0) {
        const allData: { [location: string]: CSVRow[] } = {};

        allKpiData.forEach((record: KPIRecord) => {
          if (!allData[record.location]) {
            allData[record.location] = [];
          }

          const csvRow: CSVRow = {
            Tags: record.tags,
            Parameters: record.parameters,
            "Monthly Target": record.monthly_target,
            "Target MTD": record.target_mtd,
            "Actual As On Date": record.actual_as_on_date,
            Shortfall: record.shortfall,
            "% ACH": record.percentage_ach,
            Location: record.location,
          };

          allData[record.location].push(csvRow);
        });

        setAllLocationsData(allData);
        setUploadedData(allData);
        setDbConnectionStatus("connected");
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleDataUpload = async (
    data: CSVRow[],
    location: string,
  ) => {
    // Update local state immediately for better UX
    setUploadedData((prev) => ({
      ...prev,
      [location]: data,
    }));

    setAllLocationsData((prev) => ({
      ...prev,
      [location]: data,
    }));

    // Refresh data from database to ensure consistency
    setTimeout(() => {
      refreshDataFromDatabase();
    }, 1000); // Small delay to allow database to be updated
  };

  // Function to convert CSV data to dashboard format
  const convertCSVToKPIData = (csvData: CSVRow[]) => {
    return csvData.map((row) => ({
      name: row.Parameters || row.Tags,
      target: row["Monthly Target"] || 0,
      targetMTD: row["Target MTD"] || 0,
      actual: row["Actual As On Date"] || 0,
      achievement: row["% ACH"] || 0,
      shortfall: row.Shortfall || 0,
    }));
  };

  // Get location-specific data using consistent data source
  const getLocationData = (location: string) => {
    const locationCSVData =
      allLocationsData[location] || uploadedData[location];
    if (locationCSVData && locationCSVData.length > 0) {
      return convertCSVToKPIData(locationCSVData);
    }
    return emptyData;
  };

  // Get data for selected location or aggregate all locations
  const getCurrentLocationData = () => {
    if (selectedLocation === "All Locations") {
      // Aggregate data from all available locations in the database
      const aggregatedData: any[] = [];

      // Use all available locations from database, not just predefined list
      const availableLocations = Object.keys(allLocationsData);

      availableLocations.forEach((location) => {
        const locationData = getLocationData(location);
        locationData.forEach((item) => {
          const existingItem = aggregatedData.find(
            (aggItem) => aggItem.name === item.name,
          );
          if (existingItem) {
            existingItem.target += item.target;
            existingItem.actual += item.actual;
            existingItem.shortfall += item.shortfall;
            // Recalculate achievement percentage
            existingItem.achievement =
              existingItem.target > 0
                ? (existingItem.actual / existingItem.target) *
                  100
                : 0;
          } else {
            aggregatedData.push({ ...item });
          }
        });
      });

      return aggregatedData;
    } else {
      return getLocationData(selectedLocation);
    }
  };

  const allLocationData = getCurrentLocationData();

  // Filter data by categories based on the Tags field
  const currentInflowData = allLocationData.filter(
    (item) =>
      item.name &&
      (item.name.toLowerCase().includes("throughput") ||
        item.name.toLowerCase().includes("inflow")),
  );

  const currentLabourData = allLocationData.filter(
    (item) =>
      item.name &&
      (item.name.toLowerCase().includes("labour") ||
        item.name.toLowerCase().includes("labor")),
  );

  const currentPartsData = allLocationData.filter(
    (item) =>
      item.name &&
      (item.name.toLowerCase().includes("parts") ||
        item.name.toLowerCase().includes("accessories") ||
        item.name.toLowerCase().includes("oil")),
  );

  const currentEfficiencyData = allLocationData.filter(
    (item) =>
      item.name &&
      (item.name.toLowerCase().includes("conversion") ||
        item.name.toLowerCase().includes("efficiency") ||
        item.name.toLowerCase().includes("cleaning") ||
        item.name.toLowerCase().includes("service") ||
        item.name.toLowerCase().includes("nps") ||
        item.name.toLowerCase().includes("connect") ||
        item.name.toLowerCase().includes("complaints") ||
        item.name.toLowerCase().includes("alignment") ||
        item.name.toLowerCase().includes("balancing") ||
        item.name.toLowerCase().includes("pmc") ||
        item.name.toLowerCase().includes("cash") ||
        item.name.toLowerCase().includes("insurance")),
  );

  // Calculate overall metrics from database data
  const totalThroughputMetrics = currentInflowData.find(
    (item) =>
      item.name &&
      item.name.toLowerCase().includes("total throughput"),
  );
  const totalTargetThroughput =
    totalThroughputMetrics?.target || 0;
  const totalActualThroughput =
    totalThroughputMetrics?.actual || 0;
  const overallThroughputAchievement =
    totalThroughputMetrics?.achievement || 0;

  const totalLabourMetrics =
    currentLabourData.find(
      (item) =>
        item.name &&
        (item.name.toLowerCase().includes("total labour ( pmgr+bp+vas+amc rendered)") ||
         item.name.toLowerCase().includes("total pmgr +vas+amc rlabour"))
    ) ||
    currentLabourData.reduce(
      (acc, item) => ({
        target: acc.target + item.target,
        actual: acc.actual + item.actual,
      }),
      { target: 0, actual: 0 },
    );

  const totalTargetLabour = totalLabourMetrics.target;
  const totalActualLabour = totalLabourMetrics.actual;
  const overallLabourAchievement =
    totalTargetLabour > 0
      ? (totalActualLabour / totalTargetLabour) * 100
      : 0;

  // Helper function to calculate metric counts
  const calculateCounts = (data: any[]) => {
    const validData = data.filter(
      (item) => !isNaN(item.achievement),
    );
    const achieved = validData.filter(
      (item) => item.achievement >= 100,
    ).length;
    const belowTarget = validData.filter(
      (item) =>
        item.achievement < 100 && item.achievement >= 70,
    ).length;
    const needsAction = validData.filter(
      (item) => item.achievement < 70,
    ).length;
    return {
      achieved,
      belowTarget,
      needsAction,
      total: validData.length,
    };
  };

  // Calculate counts for each section using current location data
  const inflowCounts = calculateCounts(currentInflowData);
  const labourCounts = calculateCounts(currentLabourData);
  const partsCounts = calculateCounts(currentPartsData);
  const efficiencyCounts = calculateCounts(
    currentEfficiencyData,
  );

  // Calculate overall counts for overview
  const allCurrentData = [
    ...currentInflowData,
    ...currentLabourData,
    ...currentPartsData,
    ...currentEfficiencyData,
  ];
  const overallCounts = calculateCounts(allCurrentData);

  // Get metrics for all locations from database data
  const getLocationMetrics = (location: string) => {
    const locationData =
      allLocationsData[location] || uploadedData[location];
    if (!locationData || locationData.length === 0) {
      return {
        throughput: { target: 0, actual: 0, achievement: 0 },
        labour: { target: 0, actual: 0, achievement: 0 },
        parts: { target: 0, actual: 0, achievement: 0 },
        totalTarget: 0,
        totalAchieved: 0,
      };
    }

    // Find specific metrics by parameter name in CSV data
    const throughputMetric = locationData.find(
      (row) =>
        row.Parameters &&
        row.Parameters.toLowerCase().includes(
          "total throughput",
        ),
    );

    const labourMetrics = locationData.filter(
      (row) =>
        row.Parameters &&
        row.Parameters.toLowerCase().includes("labour") &&
        !row.Parameters.toLowerCase().includes("per ro"),
    );

    const partsMetrics = locationData.filter(
      (row) =>
        row.Parameters &&
        row.Parameters.toLowerCase().includes("parts") &&
        !row.Parameters.toLowerCase().includes("per ro"),
    );

    // Calculate throughput metrics
    const throughputTarget = throughputMetric
      ? throughputMetric["Monthly Target"] ||
        throughputMetric["Target MTD"] ||
        0
      : 0;
    const throughputActual = throughputMetric
      ? throughputMetric["Actual As On Date"] || 0
      : 0;
    const throughputAchievement = throughputMetric
      ? throughputMetric["% ACH"] || 0
      : 0;

    // Calculate labour metrics (sum all labour-related entries)
    const labourTarget = labourMetrics.reduce(
      (sum, row) =>
        sum + (row["Monthly Target"] || row["Target MTD"] || 0),
      0,
    );
    const labourActual = labourMetrics.reduce(
      (sum, row) => sum + (row["Actual As On Date"] || 0),
      0,
    );
    const labourAchievement =
      labourTarget > 0
        ? (labourActual / labourTarget) * 100
        : 0;

    // Calculate parts metrics (sum all parts-related entries)
    const partsTarget = partsMetrics.reduce(
      (sum, row) =>
        sum + (row["Monthly Target"] || row["Target MTD"] || 0),
      0,
    );
    const partsActual = partsMetrics.reduce(
      (sum, row) => sum + (row["Actual As On Date"] || 0),
      0,
    );
    const partsAchievement =
      partsTarget > 0 ? (partsActual / partsTarget) * 100 : 0;

    // Calculate overall totals for the new chart
    const totalTarget = labourTarget + partsTarget;
    const totalAchieved = labourActual + partsActual;

    return {
      throughput: {
        target: throughputTarget,
        actual: throughputActual,
        achievement: throughputAchievement,
      },
      labour: {
        target: labourTarget,
        actual: labourActual,
        achievement: labourAchievement,
      },
      parts: {
        target: partsTarget,
        actual: partsActual,
        achievement: partsAchievement,
      },
      totalTarget,
      totalAchieved,
    };
  };

  // Generate metrics for all available locations in database
  const availableLocations = Object.keys(allLocationsData);
  const locationMetrics = availableLocations.map(
    (location) => ({
      location,
      ...getLocationMetrics(location),
    }),
  );

  // Calculate aggregated metrics for All Locations view
  const aggregatedMetrics = {
    location: "All Locations",
    throughput: {
      target: locationMetrics.reduce(
        (sum, metric) => sum + metric.throughput.target,
        0,
      ),
      actual: locationMetrics.reduce(
        (sum, metric) => sum + metric.throughput.actual,
        0,
      ),
      achievement: 0,
    },
    labour: {
      target: locationMetrics.reduce(
        (sum, metric) => sum + metric.labour.target,
        0,
      ),
      actual: locationMetrics.reduce(
        (sum, metric) => sum + metric.labour.actual,
        0,
      ),
      achievement: 0,
    },
    parts: {
      target: locationMetrics.reduce(
        (sum, metric) => sum + metric.parts.target,
        0,
      ),
      actual: locationMetrics.reduce(
        (sum, metric) => sum + metric.parts.actual,
        0,
      ),
      achievement: 0,
    },
    totalTarget: locationMetrics.reduce(
      (sum, metric) => sum + metric.totalTarget,
      0,
    ),
    totalAchieved: locationMetrics.reduce(
      (sum, metric) => sum + metric.totalAchieved,
      0,
    ),
  };

  // Calculate achievement percentages for aggregated metrics
  aggregatedMetrics.throughput.achievement =
    aggregatedMetrics.throughput.target > 0
      ? (aggregatedMetrics.throughput.actual /
          aggregatedMetrics.throughput.target) *
        100
      : 0;
  aggregatedMetrics.labour.achievement =
    aggregatedMetrics.labour.target > 0
      ? (aggregatedMetrics.labour.actual /
          aggregatedMetrics.labour.target) *
        100
      : 0;
  aggregatedMetrics.parts.achievement =
    aggregatedMetrics.parts.target > 0
      ? (aggregatedMetrics.parts.actual /
          aggregatedMetrics.parts.target) *
        100
      : 0;

  // Include aggregated metrics in the array
  const allLocationMetrics = [
    aggregatedMetrics,
    ...locationMetrics,
  ];

  return (
    <div className="min-h-screen bg-black-50 p-4">
      <div className="max-w-[1400px] mx-auto space-y-4">
<div className="bg-white border border-black-200 rounded-lg p-6 shadow-sm">
  <div className="flex items-center justify-between">
    {/* Left side: Logo + Titles */}
    <div className="flex items-center space-x-6">
      {/* Logo */}
      <div>
     <div className="flex items-center space-x-8">
      <img
        src={aryaHondaLogo}
        alt="Arya Honda"
        className="h-16 w-auto object-contain"
      />
 
    <div className="absolute left-1/2 transform -translate-x-1/2">
      <h1 className="text-2xl font-bold text-black-900">
        Arya Honda Dashboard
      </h1>
    </div>
        </div>


        {/* Sub Header: Location + DB Status + Location Data */}
        <h2 className="flex items-center space-x-3 text-black-700 text-base mt-2">
          <MapPin className="h-4 w-4 text-blue-600" />
          <span>Location:</span>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Locations">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* DB Connected / Loading / Records */}
          {isLoadingData && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              Loading...
            </Badge>
          )}
          {!isLoadingData && Object.keys(allLocationsData).length > 0 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
              Database Connected
            </Badge>
          )}
          {!isLoadingData &&
            selectedLocation !== "All Locations" &&
            allLocationsData[selectedLocation] &&
            allLocationsData[selectedLocation].length > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                {allLocationsData[selectedLocation].length} Records
              </Badge>
          )}

          {/* Selected Location Data */}
          <span className="ml-2 text-sm text-black-600 font-medium">
            {selectedLocation.toUpperCase()} Data
          </span>
        </h2>
      </div>
    </div>

    {/* Right side: Performance + Date + Last Updated */}
    <div className="text-right">
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        Performance Summary
      </Badge>

      {/* CalendarDays Row */}
      <div className="flex items-center justify-end space-x-2 mt-2 text-black-600 text-sm">
        <CalendarDays className="h-4 w-4" />
        <span>{currentDate}</span>
      </div>

      {/* Last Updated Row */}
      <p className="text-xs text-black-500 mt-1">
        Last Updated: {new Date().toLocaleTimeString()}
      </p>
    </div>
  </div>
</div>


        {/* Main Dashboard Navigation */}
        <Tabs defaultValue="directors" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-black-200 rounded-lg p-1">
            <TabsTrigger
              value="directors"
              className="flex items-center space-x-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <PieChart className="h-4 w-4" />
              <span>Directors Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="dashboard"
              className="flex items-center space-x-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Detailed Dashboard</span>
              <TabCounter
                achieved={overallCounts.achieved}
                belowTarget={overallCounts.belowTarget}
                needsAction={overallCounts.needsAction}
              />
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="flex items-center space-x-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <Upload className="h-4 w-4" />
              <span>Data Upload</span>
            </TabsTrigger>
          </TabsList>

          {/* Directors Overview Tab */}
          <TabsContent value="directors" className="space-y-4">
            {/* Regional Performance Summary */}
            <Card className="border-black-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-black-900">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Regional Performance Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
                    <p className="text-2xl font-bold text-blue-600">
                      {aggregatedMetrics.throughput.achievement.toFixed(
                        1,
                      )}
                      %
                    </p>
                    <p className="text-sm text-black-600">
                      Total Throughput
                    </p>
                    <p className="text-xs text-black-500 mt-1">
                      {aggregatedMetrics.throughput.actual.toLocaleString()}{" "}
                      /{" "}
                      {aggregatedMetrics.throughput.target.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100">
                    <p className="text-2xl font-bold text-green-600">
                      {aggregatedMetrics.labour.achievement.toFixed(
                        1,
                      )}
                      %
                    </p>
                    <p className="text-sm text-black-600">
                      Total Labour Sales
                    </p>
                    <p className="text-xs text-black-500 mt-1">
                      ₹{aggregatedMetrics.labour.actual.toLocaleString('en-IN')} / ₹{aggregatedMetrics.labour.target.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-100">
                    <p className="text-2xl font-bold text-purple-600">
                      {aggregatedMetrics.parts.achievement.toFixed(
                        1,
                      )}
                      %
                    </p>
                    <p className="text-sm text-black-600">
                      Total Parts Sales
                    </p>
                    <p className="text-xs text-black-500 mt-1">
                      ₹{aggregatedMetrics.parts.actual.toLocaleString('en-IN')} / ₹{aggregatedMetrics.parts.target.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-100">
                    <p className="text-2xl font-bold text-orange-600">
                      {Object.keys(allLocationsData).length}
                    </p>
                    <p className="text-sm text-black-600">
                      Active Locations
                    </p>
                    <p className="text-xs text-black-500 mt-1">
                      {Object.keys(allLocationsData).length}{" "}
                      with data
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Performance Speedometers */}
            <Card className="border-black-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-black-900">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  <span>
                    All Locations Performance Overview
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Throughput Performance */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-black-800 mb-4">
                    Vehicle Throughput Achievement
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {locationMetrics
                      .filter(
                        (metric) =>
                          metric.throughput.target > 0,
                      )
                      .map((metric) => (
                        <SpeedometerChart
                          key={`throughput-${metric.location}`}
                          location={metric.location}
                          achievement={
                            metric.throughput.achievement
                          }
                          target={metric.throughput.target}
                          actual={metric.throughput.actual}
                          title="Throughput"
                        />
                      ))}
                  </div>
                </div>

                {/* Labour Performance */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-black-800 mb-4">
                    Labour Revenue Achievement
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {locationMetrics
                      .filter(
                        (metric) => metric.labour.target > 0,
                      )
                      .map((metric) => (
                        <SpeedometerChart
                          key={`labour-${metric.location}`}
                          location={metric.location}
                          achievement={
                            metric.labour.achievement
                          }
                          target={metric.labour.target}
                          actual={metric.labour.actual}
                          title="Labour Sales"
                        />
                      ))}
                  </div>
                </div>

                {/* Parts Performance */}
                <div>
                  <h3 className="text-lg font-semibold text-black-800 mb-4">
                    Parts Sales Achievement
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {locationMetrics
                      .filter(
                        (metric) => metric.parts.target > 0,
                      )
                      .map((metric) => (
                        <SpeedometerChart
                          key={`parts-${metric.location}`}
                          location={metric.location}
                          achievement={metric.parts.achievement}
                          target={metric.parts.target}
                          actual={metric.parts.actual}
                          title="Parts Sales"
                        />
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Detailed Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            {/* Sub-navigation for detailed view */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="sticky top-0 z-10 grid w-full grid-cols-5 bg-white border border-black-200 rounded-lg p-1 shadow-sm">
                <TabsTrigger
                  value="overview"
                  className="flex items-center space-x-1 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger
                  value="inflow"
                  className="flex items-center space-x-1 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <Car className="h-4 w-4" />
                  <span>Inflow</span>
                  <TabCounter
                    achieved={inflowCounts.achieved}
                    belowTarget={inflowCounts.belowTarget}
                    needsAction={inflowCounts.needsAction}
                  />
                </TabsTrigger>
                <TabsTrigger
                  value="labour"
                  className="flex items-center space-x-1 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <Wrench className="h-4 w-4" />
                  <span>Labour</span>
                  <TabCounter
                    achieved={labourCounts.achieved}
                    belowTarget={labourCounts.belowTarget}
                    needsAction={labourCounts.needsAction}
                  />
                </TabsTrigger>
                <TabsTrigger
                  value="parts"
                  className="flex items-center space-x-1 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Parts</span>
                  <TabCounter
                    achieved={partsCounts.achieved}
                    belowTarget={partsCounts.belowTarget}
                    needsAction={partsCounts.needsAction}
                  />
                </TabsTrigger>
                <TabsTrigger
                  value="efficiency"
                  className="flex items-center space-x-1 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <Cog className="h-4 w-4" />
                  <span>Efficiency</span>
                  <TabCounter
                    achieved={efficiencyCounts.achieved}
                    belowTarget={efficiencyCounts.belowTarget}
                    needsAction={efficiencyCounts.needsAction}
                  />
                </TabsTrigger>
              </TabsList>

              {/* Overview Sub-tab */}
              <TabsContent
                value="overview"
                className="space-y-4"
              >
                {/* Executive Summary */}
                {allLocationData.length > 0 ? (
                  <Card className="border-black-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-black-900">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          <span>Executive Summary</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-green-700">
                              {overallCounts.achieved} Achieved
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span className="text-yellow-700">
                              {overallCounts.belowTarget} Below
                              Target
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-red-700">
                              {overallCounts.needsAction} Need
                              Action
                            </span>
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {totalTargetThroughput > 0 && (
                          <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-100">
                            <p className="text-2xl font-bold text-orange-600">
                              {overallThroughputAchievement.toFixed(
                                1,
                              )}
                              %
                            </p>
                            <p className="text-sm text-black-600">
                              Throughput Achievement
                            </p>
                            <p className="text-xs text-black-500 mt-1">
                              {selectedLocation}
                            </p>
                          </div>
                        )}
                        {totalActualThroughput > 0 && (
                          <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
                            <p className="text-2xl font-bold text-blue-600">
                              {totalActualThroughput.toLocaleString()}
                            </p>
                            <p className="text-sm text-black-600">
                              Vehicles Processed
                            </p>
                            <p className="text-xs text-black-500 mt-1">
                              {selectedLocation}
                            </p>
                          </div>
                        )}
                        {totalActualLabour > 0 && (
                          <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100">
                            <p className="text-2xl font-bold text-green-600">
                              ₹{totalActualLabour.toLocaleString('en-IN')}
                            </p>
                            <p className="text-sm text-black-600">
                              Labour Revenue
                            </p>
                            <p className="text-xs text-black-500 mt-1">
                              {selectedLocation}
                            </p>
                          </div>
                        )}
                        {totalTargetLabour > 0 && (
                          <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-100">
                            <p className="text-2xl font-bold text-purple-600">
                              {overallLabourAchievement.toFixed(
                                1,
                              )}
                              %
                            </p>
                            <p className="text-sm text-black-600">
                              Labour Achievement
                            </p>
                            <p className="text-xs text-black-500 mt-1">
                              {selectedLocation}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-black-200 shadow-sm">
                    <CardContent className="p-8 text-center">
                      <TrendingUp className="h-12 w-12 text-black-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-black-600 mb-2">
                        No Data Available
                      </h3>
                      <p className="text-black-500">
                        Please upload CSV data for{" "}
                        {selectedLocation} to view executive
                        summary.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Key Performance Indicators */}
                {allLocationData.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {currentInflowData.find((item) =>
                      item.name
                        .toLowerCase()
                        .includes("total throughput"),
                    ) && (
                      <KPICard
                        title="Total Throughput"
                        actual={totalActualThroughput}
                        target={totalTargetThroughput}
                        unit="vehicles"
                        format="number"
                        trend="neutral"
                      />
                    )}
                    {currentInflowData.find((item) =>
                      item.name
                        .toLowerCase()
                        .includes("pm throughput"),
                    ) && (
                      <KPICard
                        title="PM Throughput"
                        actual={
                          currentInflowData.find((item) =>
                            item.name
                              .toLowerCase()
                              .includes("pm throughput"),
                          )?.actual || 0
                        }
                        target={
                          currentInflowData.find((item) =>
                            item.name
                              .toLowerCase()
                              .includes("pm throughput"),
                          )?.target || 0
                        }
                        unit="vehicles"
                        format="number"
                        trend="neutral"
                      />
                    )}
                    {totalLabourMetrics.target > 0 && (
                      <KPICard
                        title="Total Labour Sale"
                        actual={totalActualLabour}
                        target={totalTargetLabour}
                        unit=""
                        format="currency"
                        trend="neutral"
                      />
                    )}
                    {currentEfficiencyData.find((item) =>
                      item.name
                        .toLowerCase()
                        .includes("conversion"),
                    ) && (
                      <KPICard
                        title="Conversion Rate"
                        actual={
                          currentEfficiencyData.find((item) =>
                            item.name
                              .toLowerCase()
                              .includes("conversion"),
                          )?.actual || 0
                        }
                        target={
                          currentEfficiencyData.find((item) =>
                            item.name
                              .toLowerCase()
                              .includes("conversion"),
                          )?.target || 0
                        }
                        unit=""
                        format="percentage"
                        trend="neutral"
                      />
                    )}
                  </div>
                )}

                {/* Performance Charts */}
                {allLocationMetrics.some(
                  (metric) => metric.totalTarget > 0,
                ) && (
                  <div className="grid grid-cols-1 gap-4">
                    <PerformanceChart
                      title="Target Achieved - All Locations (₹ in Indian Rupees)"
                      data={allLocationMetrics
                        .filter(
                          (metric) =>
                            metric.location !== "All Locations",
                        )
                        .map((metric) => ({
                          month: metric.location,
                          actual: metric.totalAchieved,
                          target: metric.totalTarget,
                        }))}
                      type="combo"
                      format="currency"
                    />
                  </div>
                )}
              </TabsContent>

              {/* Inflow Sub-tab */}
              <TabsContent value="inflow" className="space-y-4">
                {currentInflowData.length > 0 ? (
                  <CategorySection
                    title="Vehicle Inflow Metrics"
                    items={currentInflowData}
                    color="blue"
                    location={selectedLocation}
                  />
                ) : (
                  <Card className="border-black-200 shadow-sm">
                    <CardContent className="p-8 text-center">
                      <Car className="h-12 w-12 text-black-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-black-600 mb-2">
                        No Inflow Data Available
                      </h3>
                      <p className="text-black-500">
                        Please upload CSV data for{" "}
                        {selectedLocation} to view inflow
                        metrics.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Labour Sub-tab */}
              <TabsContent value="labour" className="space-y-4">
                {currentLabourData.length > 0 ? (
                  <CategorySection
                    title="Labour Sale Performance (₹ Indian Rupees)"
                    items={currentLabourData}
                    color="green"
                    location={selectedLocation}
                  />
                ) : (
                  <Card className="border-black-200 shadow-sm">
                    <CardContent className="p-8 text-center">
                      <Wrench className="h-12 w-12 text-black-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-black-600 mb-2">
                        No Labour Data Available
                      </h3>
                      <p className="text-black-500">
                        Please upload CSV data for{" "}
                        {selectedLocation} to view labour
                        metrics.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Parts Sub-tab */}
              <TabsContent value="parts" className="space-y-4">
                {currentPartsData.length > 0 ? (
                  <CategorySection
                    title="Parts Sales & Products (₹ Indian Rupees)"
                    items={currentPartsData}
                    color="purple"
                    location={selectedLocation}
                  />
                ) : (
                  <Card className="border-black-200 shadow-sm">
                    <CardContent className="p-8 text-center">
                      <ShoppingCart className="h-12 w-12 text-black-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-black-600 mb-2">
                        No Parts Data Available
                      </h3>
                      <p className="text-black-500">
                        Please upload CSV data for{" "}
                        {selectedLocation} to view parts
                        metrics.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Efficiency Sub-tab */}
              <TabsContent
                value="efficiency"
                className="space-y-4"
              >
                {currentEfficiencyData.length > 0 ? (
                  <CategorySection
                    title="Efficiency & Other KPIs"
                    items={currentEfficiencyData}
                    color="orange"
                    location={selectedLocation}
                  />
                ) : (
                  <Card className="border-black-200 shadow-sm">
                    <CardContent className="p-8 text-center">
                      <Cog className="h-12 w-12 text-black-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-black-600 mb-2">
                        No Efficiency Data Available
                      </h3>
                      <p className="text-black-500">
                        Please upload CSV data for{" "}
                        {selectedLocation} to view efficiency
                        metrics.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Data Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
            <CSVUpload
              onDataUpload={handleDataUpload}
              uploadedData={allLocationsData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}