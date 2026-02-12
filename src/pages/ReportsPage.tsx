import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import
  {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
import
  {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import
  {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseBackloadInfo, useLoads } from "@/hooks/useLoads";
import { exportReportsToPdf, exportVarianceToPdf, exportPunctualityToPdf } from "@/lib/exportReportsToPdf";
import { exportVarianceToExcel } from "@/lib/exportVarianceToExcel";
import { exportPunctualityToExcel } from "@/lib/exportPunctualityToExcel";
import
  {
    differenceInMinutes,
    eachWeekOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    getDay,
    parseISO,
    startOfMonth,
    subMonths,
  } from "date-fns";
import
  {
    ArrowRight,
    BarChart3,
    Boxes,
    Clock,
    Download,
    FileText,
    Map as MapIcon,
    Package,
    PieChart as PieChartIcon,
    TrendingUp,
  } from "lucide-react";
import { useMemo, useState } from "react";
import
  {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
  } from "recharts";

interface CargoDistribution {
  name: string;
  value: number;
  fill: string;
}

interface StatusDistribution {
  name: string;
  value: number;
  fill: string;
}

interface RouteData {
  route: string;
  loads: number;
}

interface WeeklyTrend {
  week: string;
  scheduled: number;
  inTransit: number;
  delivered: number;
  pending: number;
  total: number;
}

interface TimeWindowData {
  timeWindow: string;
  count: number;
}

interface DayOfWeekData {
  day: string;
  loads: number;
}

interface MonthlyTrend {
  month: string;
  loads: number;
}

interface TimeVarianceData {
  category: string;
  count: number;
  percentage: number;
  fill: string;
}

interface LocationVariance {
  location: string;
  avgVariance: number;
  onTimeCount: number;
  lateCount: number;
  earlyCount: number;
  totalLoads: number;
}

interface BackloadDistribution {
  name: string;
  value: number;
  fill: string;
}

interface BackloadDestinationData {
  destination: string;
  totalMovements: number;
  bins: number;
  crates: number;
  pallets: number;
}

interface BackloadWeeklyTrend {
  week: string;
  movements: number;
  bins: number;
  crates: number;
  pallets: number;
}

interface BackloadMovement {
  loadId: string;
  origin: string;
  destination: string;
  backloadDestination: string;
  cargoType: string;
  offloadingDate: string;
  quantities: {
    bins: number;
    crates: number;
    pallets: number;
  };
  status: string;
  driver?: string;
  notes?: string;
}

interface BackloadCargoTypeData {
  cargoType: string;
  count: number;
  fill: string;
}

interface ParsedTimeWindow {
  origin: {
    plannedArrival: string;
    plannedDeparture: string;
    actualArrival: string;
    actualDeparture: string;
  };
  destination: {
    plannedArrival: string;
    plannedDeparture: string;
    actualArrival: string;
    actualDeparture: string;
  };
}

const CARGO_COLORS: Record<string, string> = {
  VanSalesRetail: "#6366f1",
  Retail: "#8b5cf6",
  Vendor: "#a855f7",
  RetailVendor: "#d946ef",
  Fertilizer: "#22c55e",
  Export: "#ec4899",
  BV: "#f97316",
  CBC: "#eab308",
  Packaging: "#06b6d4",
};

const BACKLOAD_DESTINATION_COLORS: Record<string, string> = {
  BV: "#f97316",
  CBC: "#eab308",
  Packaging: "#06b6d4",
  Fertilizer: "#22c55e",
  Other: "#64748b",
};

const PACKAGING_TYPE_COLORS: Record<string, string> = {
  Bins: "#8b5cf6",
  Crates: "#06b6d4",
  Pallets: "#f59e0b",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6",
  "in-transit": "#f59e0b",
  delivered: "#22c55e",
  pending: "#ef4444",
};

// Parse time_window JSON to get planned and actual times
const parseTimeWindow = (timeWindow: string): ParsedTimeWindow | null => {
  try {
    const data = JSON.parse(timeWindow);
    return {
      origin: {
        plannedArrival: data.origin?.plannedArrival || "",
        plannedDeparture: data.origin?.plannedDeparture || "",
        actualArrival: data.origin?.actualArrival || "",
        actualDeparture: data.origin?.actualDeparture || "",
      },
      destination: {
        plannedArrival: data.destination?.plannedArrival || "",
        plannedDeparture: data.destination?.plannedDeparture || "",
        actualArrival: data.destination?.actualArrival || "",
        actualDeparture: data.destination?.actualDeparture || "",
      },
    };
  } catch {
    return null;
  }
};

// Calculate time variance in minutes between planned and actual
const calculateVarianceMinutes = (
  planned: string,
  actual: string,
): number | null => {
  if (!planned || !actual) return null;

  try {
    // Handle various time formats: "08:00", "08:00 AM", "2026-01-12T08:00"
    const parseTime = (timeStr: string): Date | null => {
      const baseDate = new Date();
      baseDate.setHours(0, 0, 0, 0);

      // Try HH:mm format
      const simpleMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (simpleMatch) {
        const [, hours, mins] = simpleMatch;
        baseDate.setHours(parseInt(hours, 10), parseInt(mins, 10));
        return baseDate;
      }

      // Try HH:mm AM/PM format
      const amPmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (amPmMatch) {
        const [, hours, mins, period] = amPmMatch;
        let h = parseInt(hours, 10);
        if (period.toUpperCase() === "PM" && h !== 12) h += 12;
        if (period.toUpperCase() === "AM" && h === 12) h = 0;
        baseDate.setHours(h, parseInt(mins, 10));
        return baseDate;
      }

      // Try ISO format
      const isoDate = parseISO(timeStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }

      return null;
    };

    const plannedTime = parseTime(planned);
    const actualTime = parseTime(actual);

    if (!plannedTime || !actualTime) return null;

    return differenceInMinutes(actualTime, plannedTime);
  } catch {
    return null;
  }
};

const CHART_GRADIENT_COLORS = {
  primary: ["#6366f1", "#8b5cf6"],
  success: ["#22c55e", "#10b981"],
  warning: ["#f59e0b", "#f97316"],
  info: ["#06b6d4", "#0ea5e9"],
};

// Helper function to categorize time windows into readable labels
const categorizeTimeWindow = (timeWindow: string): string => {
  if (!timeWindow || timeWindow === "Unspecified") return "Unspecified";

  // Try to extract start hour from formats like "06:00 AM - 02:00 PM" or "06:00-14:00"
  const match = timeWindow.match(/(\d{1,2}):?\d{0,2}\s*(AM|PM)?/i);
  if (!match) return timeWindow;

  let hour = parseInt(match[1], 10);
  const period = match[2]?.toUpperCase();

  // Convert to 24-hour format if AM/PM is present
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  // Categorize by start time
  if (hour >= 5 && hour < 8) return "Early Morning";
  if (hour >= 8 && hour < 11) return "Mid Morning";
  if (hour >= 11 && hour < 14) return "Midday";
  if (hour >= 14 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 20) return "Evening";
  return "Other";
};

export default function ReportsPage() {
  const { data: loads = [], isLoading } = useLoads();
  const [timeRange, setTimeRange] = useState<
    "3months" | "6months" | "12months"
  >("3months");

  const filteredLoads = useMemo(() => {
    const now = new Date();
    const monthsToSubtract =
      timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;
    const startDate = subMonths(now, monthsToSubtract);

    return loads.filter((load) => {
      const loadDate = parseISO(load.loading_date);
      return loadDate >= startDate && loadDate <= now;
    });
  }, [loads, timeRange]);

  // Cargo type distribution
  const cargoDistribution = useMemo<CargoDistribution[]>(() => {
    const distribution: Record<string, number> = {};
    filteredLoads.forEach((load) => {
      distribution[load.cargo_type] = (distribution[load.cargo_type] || 0) + 1;
    });
    return Object.entries(distribution)
      .map(([name, value]) => ({
        name,
        value,
        fill: CARGO_COLORS[name] || "#64748b",
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLoads]);

  // Daily punctuality (planned vs actual at origin/destination)
  interface DailyPunctualityRow {
    date: string;
    loads: number;
    originArrivalAvg?: number | null;
    originDepartureAvg?: number | null;
    destArrivalAvg?: number | null;
    destDepartureAvg?: number | null;
    originDelayCount: number; // count of >15 min late at origin (arrival or departure)
    destDelayCount: number;   // count of >15 min late at destination (arrival or departure)
  }
  const dailyPunctuality = useMemo<DailyPunctualityRow[]>(() => {
    const map = new Map<string, {
      loads: number;
      sums: { oa: number; oaN: number; od: number; odN: number; da: number; daN: number; dd: number; ddN: number };
      originDelayCount: number;
      destDelayCount: number;
    }>();

    for (const load of filteredLoads) {
      const key = format(parseISO(load.loading_date), 'yyyy-MM-dd');
      const times = parseTimeWindow(load.time_window);
      if (!times) continue;
      const oa = calculateVarianceMinutes(times.origin.plannedArrival, times.origin.actualArrival);
      const od = calculateVarianceMinutes(times.origin.plannedDeparture, times.origin.actualDeparture);
      const da = calculateVarianceMinutes(times.destination.plannedArrival, times.destination.actualArrival);
      const dd = calculateVarianceMinutes(times.destination.plannedDeparture, times.destination.actualDeparture);

      if (!map.has(key)) {
        map.set(key, { loads: 0, sums: { oa: 0, oaN: 0, od: 0, odN: 0, da: 0, daN: 0, dd: 0, ddN: 0 }, originDelayCount: 0, destDelayCount: 0 });
      }
      const agg = map.get(key)!;
      agg.loads += 1;
      if (oa !== null) { agg.sums.oa += oa; agg.sums.oaN += 1; if (oa > 15) agg.originDelayCount += 1; }
      if (od !== null) { agg.sums.od += od; agg.sums.odN += 1; if (od > 15) agg.originDelayCount += 1; }
      if (da !== null) { agg.sums.da += da; agg.sums.daN += 1; if (da > 15) agg.destDelayCount += 1; }
      if (dd !== null) { agg.sums.dd += dd; agg.sums.ddN += 1; if (dd > 15) agg.destDelayCount += 1; }
    }

    const rows: DailyPunctualityRow[] = [];
    Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, agg]) => {
      rows.push({
        date,
        loads: agg.loads,
        originArrivalAvg: agg.sums.oaN ? Math.round(agg.sums.oa / agg.sums.oaN) : null,
        originDepartureAvg: agg.sums.odN ? Math.round(agg.sums.od / agg.sums.odN) : null,
        destArrivalAvg: agg.sums.daN ? Math.round(agg.sums.da / agg.sums.daN) : null,
        destDepartureAvg: agg.sums.ddN ? Math.round(agg.sums.dd / agg.sums.ddN) : null,
        originDelayCount: agg.originDelayCount,
        destDelayCount: agg.destDelayCount,
      });
    });
    return rows;
  }, [filteredLoads]);

  // Weekly punctuality (grouped by week start - Monday)
  interface WeeklyPunctualityRow {
    week: string; // label like "MMM d"
    loads: number;
    originArrivalAvg?: number | null;
    originDepartureAvg?: number | null;
    destArrivalAvg?: number | null;
    destDepartureAvg?: number | null;
    originDelayCount: number;
    destDelayCount: number;
  }
  const weeklyPunctuality = useMemo<WeeklyPunctualityRow[]>(() => {
    const now = new Date();
    const monthsToSubtract = timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12;
    const startDate = subMonths(now, monthsToSubtract);
    const weeks = eachWeekOfInterval({ start: startDate, end: now }, { weekStartsOn: 1 });
    const byWeekStartISO = new Map<string, {
      label: string; loads: number; sums: { oa: number; oaN: number; od: number; odN: number; da: number; daN: number; dd: number; ddN: number }; originDelayCount: number; destDelayCount: number;
    }>();

    for (const weekStart of weeks) {
      const key = format(weekStart, 'yyyy-MM-dd');
      byWeekStartISO.set(key, { label: format(weekStart, 'MMM d'), loads: 0, sums: { oa: 0, oaN: 0, od: 0, odN: 0, da: 0, daN: 0, dd: 0, ddN: 0 }, originDelayCount: 0, destDelayCount: 0 });
    }

    for (const load of filteredLoads) {
      const loadDate = parseISO(load.loading_date);
      // Find weekStart Monday
      const weekStart = eachWeekOfInterval({ start: loadDate, end: loadDate }, { weekStartsOn: 1 })[0];
      const key = format(weekStart, 'yyyy-MM-dd');
      if (!byWeekStartISO.has(key)) continue;
      const times = parseTimeWindow(load.time_window);
      if (!times) continue;
      const oa = calculateVarianceMinutes(times.origin.plannedArrival, times.origin.actualArrival);
      const od = calculateVarianceMinutes(times.origin.plannedDeparture, times.origin.actualDeparture);
      const da = calculateVarianceMinutes(times.destination.plannedArrival, times.destination.actualArrival);
      const dd = calculateVarianceMinutes(times.destination.plannedDeparture, times.destination.actualDeparture);
      const agg = byWeekStartISO.get(key)!;
      agg.loads += 1;
      if (oa !== null) { agg.sums.oa += oa; agg.sums.oaN += 1; if (oa > 15) agg.originDelayCount += 1; }
      if (od !== null) { agg.sums.od += od; agg.sums.odN += 1; if (od > 15) agg.originDelayCount += 1; }
      if (da !== null) { agg.sums.da += da; agg.sums.daN += 1; if (da > 15) agg.destDelayCount += 1; }
      if (dd !== null) { agg.sums.dd += dd; agg.sums.ddN += 1; if (dd > 15) agg.destDelayCount += 1; }
    }

    return Array.from(byWeekStartISO.entries()).map(([_, v]) => ({
      week: v.label,
      loads: v.loads,
      originArrivalAvg: v.sums.oaN ? Math.round(v.sums.oa / v.sums.oaN) : null,
      originDepartureAvg: v.sums.odN ? Math.round(v.sums.od / v.sums.odN) : null,
      destArrivalAvg: v.sums.daN ? Math.round(v.sums.da / v.sums.daN) : null,
      destDepartureAvg: v.sums.ddN ? Math.round(v.sums.dd / v.sums.ddN) : null,
      originDelayCount: v.originDelayCount,
      destDelayCount: v.destDelayCount,
    }));
  }, [filteredLoads, timeRange]);

  // Delay summary across filtered range (where delays occurred)
  const delaySummary = useMemo(() => {
    const originDelaysByLocation: Record<string, number> = {};
    const destDelaysByLocation: Record<string, number> = {};
    for (const load of filteredLoads) {
      const times = parseTimeWindow(load.time_window);
      if (!times) continue;
      const originName = load.origin;
      const destName = load.destination;
      const oa = calculateVarianceMinutes(times.origin.plannedArrival, times.origin.actualArrival);
      const od = calculateVarianceMinutes(times.origin.plannedDeparture, times.origin.actualDeparture);
      const da = calculateVarianceMinutes(times.destination.plannedArrival, times.destination.actualArrival);
      const dd = calculateVarianceMinutes(times.destination.plannedDeparture, times.destination.actualDeparture);
      const add = (map: Record<string, number>, key: string, val: number | null) => { if (val !== null && val > 15) map[key] = (map[key] || 0) + val; };
      add(originDelaysByLocation, originName, oa);
      add(originDelaysByLocation, originName, od);
      add(destDelaysByLocation, destName, da);
      add(destDelaysByLocation, destName, dd);
    }
    const topOrigins = Object.entries(originDelaysByLocation).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const topDests = Object.entries(destDelaysByLocation).sort((a,b)=>b[1]-a[1]).slice(0,5);
    return { topOrigins, topDests };
  }, [filteredLoads]);

  // Compact charts: delays by location (counts of late arrivals/departures)
  interface DelayBarRow { location: string; arrLate: number; depLate: number; totalLate: number }
  const originDelayChartData = useMemo<DelayBarRow[]>(() => {
    const byLoc: Record<string, { arr: number; dep: number }> = {};
    for (const load of filteredLoads) {
      const t = parseTimeWindow(load.time_window);
      if (!t) continue;
      const k = load.origin;
      if (!byLoc[k]) byLoc[k] = { arr: 0, dep: 0 };
      const oa = calculateVarianceMinutes(t.origin.plannedArrival, t.origin.actualArrival);
      const od = calculateVarianceMinutes(t.origin.plannedDeparture, t.origin.actualDeparture);
      if (oa !== null && oa > 15) byLoc[k].arr += 1;
      if (od !== null && od > 15) byLoc[k].dep += 1;
    }
    return Object.entries(byLoc)
      .map(([location, v]) => ({ location, arrLate: v.arr, depLate: v.dep, totalLate: v.arr + v.dep }))
      .sort((a, b) => b.totalLate - a.totalLate)
      .slice(0, 10);
  }, [filteredLoads]);

  const destinationDelayChartData = useMemo<DelayBarRow[]>(() => {
    const byLoc: Record<string, { arr: number; dep: number }> = {};
    for (const load of filteredLoads) {
      const t = parseTimeWindow(load.time_window);
      if (!t) continue;
      const k = load.destination;
      if (!byLoc[k]) byLoc[k] = { arr: 0, dep: 0 };
      const da = calculateVarianceMinutes(t.destination.plannedArrival, t.destination.actualArrival);
      const dd = calculateVarianceMinutes(t.destination.plannedDeparture, t.destination.actualDeparture);
      if (da !== null && da > 15) byLoc[k].arr += 1;
      if (dd !== null && dd > 15) byLoc[k].dep += 1;
    }
    return Object.entries(byLoc)
      .map(([location, v]) => ({ location, arrLate: v.arr, depLate: v.dep, totalLate: v.arr + v.dep }))
      .sort((a, b) => b.totalLate - a.totalLate)
      .slice(0, 10);
  }, [filteredLoads]);

  // Status distribution
  const statusDistribution = useMemo<StatusDistribution[]>(() => {
    const distribution: Record<string, number> = {};
    filteredLoads.forEach((load) => {
      distribution[load.status] = (distribution[load.status] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({
      name:
        name === "in-transit"
          ? "In Transit"
          : name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: STATUS_COLORS[name] || "#64748b",
    }));
  }, [filteredLoads]);

  // Top routes by load count
  const topRoutes = useMemo<RouteData[]>(() => {
    const routes: Record<string, { loads: number }> = {};
    filteredLoads.forEach((load) => {
      const route = `${load.origin} → ${load.destination}`;
      if (!routes[route]) {
        routes[route] = { loads: 0 };
      }
      routes[route].loads += 1;
    });
    return Object.entries(routes)
      .map(([route, data]) => ({ route, ...data }))
      .sort((a, b) => b.loads - a.loads)
      .slice(0, 8);
  }, [filteredLoads]);

  // Weekly trend data
  const weeklyTrend = useMemo<WeeklyTrend[]>(() => {
    const now = new Date();
    const monthsToSubtract =
      timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;
    const startDate = subMonths(now, monthsToSubtract);
    const weeks = eachWeekOfInterval(
      { start: startDate, end: now },
      { weekStartsOn: 1 },
    );

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekLoads = filteredLoads.filter((load) => {
        const loadDate = parseISO(load.loading_date);
        return loadDate >= weekStart && loadDate <= weekEnd;
      });

      return {
        week: format(weekStart, "MMM d"),
        scheduled: weekLoads.filter((l) => l.status === "scheduled").length,
        inTransit: weekLoads.filter((l) => l.status === "in-transit").length,
        delivered: weekLoads.filter((l) => l.status === "delivered").length,
        pending: weekLoads.filter((l) => l.status === "pending").length,
        total: weekLoads.length,
      };
    });
  }, [filteredLoads, timeRange]);

  // Time window analysis - categorized for better readability
  const timeWindowAnalysis = useMemo<TimeWindowData[]>(() => {
    const windows: Record<string, { count: number }> = {};
    filteredLoads.forEach((load) => {
      const category = categorizeTimeWindow(load.time_window);
      if (!windows[category]) {
        windows[category] = { count: 0 };
      }
      windows[category].count += 1;
    });
    return Object.entries(windows)
      .map(([timeWindow, data]) => ({
        timeWindow,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLoads]);

  // Day of week distribution
  const dayOfWeekDistribution = useMemo<DayOfWeekData[]>(() => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayData: Record<number, { loads: number }> = {};

    filteredLoads.forEach((load) => {
      const loadDate = parseISO(load.loading_date);
      const day = getDay(loadDate);
      if (!dayData[day]) {
        dayData[day] = { loads: 0 };
      }
      dayData[day].loads += 1;
    });

    return days.map((day, index) => ({
      day: day.slice(0, 3),
      loads: dayData[index]?.loads || 0,
    }));
  }, [filteredLoads]);

  // Monthly trend
  const monthlyTrend = useMemo<MonthlyTrend[]>(() => {
    const now = new Date();
    const monthsToSubtract =
      timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;
    const months: MonthlyTrend[] = [];

    for (let i = monthsToSubtract - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthLoads = filteredLoads.filter((load) => {
        const loadDate = parseISO(load.loading_date);
        return loadDate >= monthStart && loadDate <= monthEnd;
      });

      months.push({
        month: format(monthDate, "MMM yyyy"),
        loads: monthLoads.length,
      });
    }

    return months;
  }, [filteredLoads, timeRange]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalLoads = filteredLoads.length;
    const deliveredCount = filteredLoads.filter(
      (l) => l.status === "delivered",
    ).length;
    const deliveryRate =
      totalLoads > 0 ? Math.round((deliveredCount / totalLoads) * 100) : 0;
    const uniqueRoutes = new Set(
      filteredLoads.map((l) => `${l.origin}-${l.destination}`),
    ).size;

    return {
      totalLoads,
      deliveryRate,
      uniqueRoutes,
    };
  }, [filteredLoads]);

  // Planned vs Actual Time Analysis for delivered loads
  const timeVarianceAnalysis = useMemo(() => {
    const deliveredLoads = filteredLoads.filter(
      (l) => l.status === "delivered",
    );

    let onTime = 0;
    let early = 0;
    let slightlyLate = 0; // 1-30 mins late
    let late = 0; // 30+ mins late
    let noData = 0;

    const originVariances: number[] = [];
    const destVariances: number[] = [];
    const routeData: Record<string, { variances: number[]; total: number }> =
      {};

    deliveredLoads.forEach((load) => {
      const times = parseTimeWindow(load.time_window);
      if (!times) {
        noData++;
        return;
      }

      // Check destination arrival variance (main delivery metric)
      const destVariance = calculateVarianceMinutes(
        times.destination.plannedArrival,
        times.destination.actualArrival,
      );

      if (destVariance === null) {
        noData++;
        return;
      }

      destVariances.push(destVariance);

      // Categorize the variance
      if (destVariance <= -5) {
        early++; // More than 5 mins early
      } else if (destVariance <= 15) {
        onTime++; // Within 15 mins of planned
      } else if (destVariance <= 30) {
        slightlyLate++; // 15-30 mins late
      } else {
        late++; // Over 30 mins late
      }

      // Origin variance
      const originVariance = calculateVarianceMinutes(
        times.origin.plannedDeparture,
        times.origin.actualDeparture,
      );
      if (originVariance !== null) {
        originVariances.push(originVariance);
      }

      // Route-level data
      const route = load.destination;
      if (!routeData[route]) {
        routeData[route] = { variances: [], total: 0 };
      }
      routeData[route].variances.push(destVariance);
      routeData[route].total++;
    });

    const totalWithData = onTime + early + slightlyLate + late;

    // Distribution data for pie chart
    const distribution: TimeVarianceData[] =
      totalWithData > 0
        ? [
            {
              category: "On Time",
              count: onTime,
              percentage: Math.round((onTime / totalWithData) * 100),
              fill: "#22c55e",
            },
            {
              category: "Early",
              count: early,
              percentage: Math.round((early / totalWithData) * 100),
              fill: "#3b82f6",
            },
            {
              category: "Slightly Late",
              count: slightlyLate,
              percentage: Math.round((slightlyLate / totalWithData) * 100),
              fill: "#f59e0b",
            },
            {
              category: "Late",
              count: late,
              percentage: Math.round((late / totalWithData) * 100),
              fill: "#ef4444",
            },
          ].filter((d) => d.count > 0)
        : [];

    // Calculate average variances
    const avgDestVariance =
      destVariances.length > 0
        ? Math.round(
            destVariances.reduce((a, b) => a + b, 0) / destVariances.length,
          )
        : 0;
    const avgOriginVariance =
      originVariances.length > 0
        ? Math.round(
            originVariances.reduce((a, b) => a + b, 0) / originVariances.length,
          )
        : 0;

    // Route performance data
    const routePerformance: LocationVariance[] = Object.entries(routeData)
      .map(([location, data]) => {
        const avgVar =
          data.variances.reduce((a, b) => a + b, 0) / data.variances.length;
        return {
          location,
          avgVariance: Math.round(avgVar),
          onTimeCount: data.variances.filter((v) => v >= -5 && v <= 15).length,
          lateCount: data.variances.filter((v) => v > 15).length,
          earlyCount: data.variances.filter((v) => v < -5).length,
          totalLoads: data.total,
        };
      })
      .sort((a, b) => b.totalLoads - a.totalLoads)
      .slice(0, 8);

    return {
      distribution,
      onTimeRate:
        totalWithData > 0
          ? Math.round(((onTime + early) / totalWithData) * 100)
          : 0,
      avgDestVariance,
      avgOriginVariance,
      totalAnalyzed: totalWithData,
      noDataCount: noData,
      routePerformance,
      lateCount: slightlyLate + late,
      earlyCount: early,
      onTimeCount: onTime,
    };
  }, [filteredLoads]);

  // Backload Packaging Movements Analysis
  const backloadMovements = useMemo<BackloadMovement[]>(() => {
    const movements: BackloadMovement[] = [];

    filteredLoads.forEach((load) => {
      const backloadInfo = parseBackloadInfo(load.time_window);
      if (backloadInfo && backloadInfo.enabled) {
        movements.push({
          loadId: load.load_id,
          origin: load.origin,
          destination: load.destination,
          backloadDestination: backloadInfo.destination,
          cargoType: backloadInfo.cargoType,
          offloadingDate: backloadInfo.offloadingDate,
          quantities: backloadInfo.quantities || {
            bins: 0,
            crates: 0,
            pallets: 0,
          },
          status: load.status,
          driver: load.driver?.name,
          notes: backloadInfo.notes,
        });
      }
    });

    return movements;
  }, [filteredLoads]);

  // Backload destination distribution
  const backloadDestinationDistribution = useMemo<
    BackloadDestinationData[]
  >(() => {
    const destinations: Record<string, BackloadDestinationData> = {};

    backloadMovements.forEach((movement) => {
      const dest = movement.backloadDestination || "Other";
      if (!destinations[dest]) {
        destinations[dest] = {
          destination: dest,
          totalMovements: 0,
          bins: 0,
          crates: 0,
          pallets: 0,
        };
      }
      destinations[dest].totalMovements += 1;
      destinations[dest].bins += movement.quantities.bins;
      destinations[dest].crates += movement.quantities.crates;
      destinations[dest].pallets += movement.quantities.pallets;
    });

    return Object.values(destinations).sort(
      (a, b) => b.totalMovements - a.totalMovements,
    );
  }, [backloadMovements]);

  // Backload packaging type distribution (for pie chart)
  const backloadPackagingDistribution = useMemo<BackloadDistribution[]>(() => {
    let totalBins = 0;
    let totalCrates = 0;
    let totalPallets = 0;

    backloadMovements.forEach((movement) => {
      totalBins += movement.quantities.bins;
      totalCrates += movement.quantities.crates;
      totalPallets += movement.quantities.pallets;
    });

    const distribution: BackloadDistribution[] = [];
    if (totalBins > 0)
      distribution.push({
        name: "Bins",
        value: totalBins,
        fill: PACKAGING_TYPE_COLORS.Bins,
      });
    if (totalCrates > 0)
      distribution.push({
        name: "Crates",
        value: totalCrates,
        fill: PACKAGING_TYPE_COLORS.Crates,
      });
    if (totalPallets > 0)
      distribution.push({
        name: "Pallets",
        value: totalPallets,
        fill: PACKAGING_TYPE_COLORS.Pallets,
      });

    return distribution.sort((a, b) => b.value - a.value);
  }, [backloadMovements]);

  // Backload cargo type distribution
  const backloadCargoTypeDistribution = useMemo<BackloadCargoTypeData[]>(() => {
    const distribution: Record<string, number> = {};

    backloadMovements.forEach((movement) => {
      distribution[movement.cargoType] =
        (distribution[movement.cargoType] || 0) + 1;
    });

    return Object.entries(distribution)
      .map(([cargoType, count]) => ({
        cargoType,
        count,
        fill: BACKLOAD_DESTINATION_COLORS[cargoType] || "#64748b",
      }))
      .sort((a, b) => b.count - a.count);
  }, [backloadMovements]);

  // Backload weekly trend
  const backloadWeeklyTrend = useMemo<BackloadWeeklyTrend[]>(() => {
    const now = new Date();
    const monthsToSubtract =
      timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;
    const startDate = subMonths(now, monthsToSubtract);
    const weeks = eachWeekOfInterval(
      { start: startDate, end: now },
      { weekStartsOn: 1 },
    );

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekMovements = backloadMovements.filter((movement) => {
        const moveDate = parseISO(movement.offloadingDate);
        return moveDate >= weekStart && moveDate <= weekEnd;
      });

      return {
        week: format(weekStart, "MMM d"),
        movements: weekMovements.length,
        bins: weekMovements.reduce((sum, m) => sum + m.quantities.bins, 0),
        crates: weekMovements.reduce((sum, m) => sum + m.quantities.crates, 0),
        pallets: weekMovements.reduce(
          (sum, m) => sum + m.quantities.pallets,
          0,
        ),
      };
    });
  }, [backloadMovements, timeRange]);

  // Backload status distribution
  const backloadStatusDistribution = useMemo<BackloadDistribution[]>(() => {
    const distribution: Record<string, number> = {};

    backloadMovements.forEach((movement) => {
      const status =
        movement.status === "in-transit"
          ? "In Transit"
          : movement.status.charAt(0).toUpperCase() + movement.status.slice(1);
      distribution[status] = (distribution[status] || 0) + 1;
    });

    const statusColors: Record<string, string> = {
      Scheduled: "#3b82f6",
      "In Transit": "#f59e0b",
      Delivered: "#22c55e",
      Pending: "#ef4444",
    };

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
      fill: statusColors[name] || "#64748b",
    }));
  }, [backloadMovements]);

  // Backload summary stats
  const backloadSummaryStats = useMemo(() => {
    const totalMovements = backloadMovements.length;
    const totalBins = backloadMovements.reduce(
      (sum, m) => sum + m.quantities.bins,
      0,
    );
    const totalCrates = backloadMovements.reduce(
      (sum, m) => sum + m.quantities.crates,
      0,
    );
    const totalPallets = backloadMovements.reduce(
      (sum, m) => sum + m.quantities.pallets,
      0,
    );
    const totalPackaging = totalBins + totalCrates + totalPallets;
    const deliveredCount = backloadMovements.filter(
      (m) => m.status === "delivered",
    ).length;
    const deliveryRate =
      totalMovements > 0
        ? Math.round((deliveredCount / totalMovements) * 100)
        : 0;
    const uniqueDestinations = new Set(
      backloadMovements.map((m) => m.backloadDestination),
    ).size;

    return {
      totalMovements,
      totalBins,
      totalCrates,
      totalPallets,
      totalPackaging,
      deliveredCount,
      deliveryRate,
      uniqueDestinations,
    };
  }, [backloadMovements]);

  // Backload route analysis (origin -> destination -> backload destination)
  const backloadRouteAnalysis = useMemo(() => {
    const routes: Record<
      string,
      { count: number; bins: number; crates: number; pallets: number }
    > = {};

    backloadMovements.forEach((movement) => {
      const route = `${movement.destination} → ${movement.backloadDestination}`;
      if (!routes[route]) {
        routes[route] = { count: 0, bins: 0, crates: 0, pallets: 0 };
      }
      routes[route].count += 1;
      routes[route].bins += movement.quantities.bins;
      routes[route].crates += movement.quantities.crates;
      routes[route].pallets += movement.quantities.pallets;
    });

    return Object.entries(routes)
      .map(([route, data]) => ({
        route,
        ...data,
        totalPackaging: data.bins + data.crates + data.pallets,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [backloadMovements]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 shadow-xl">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}:{" "}
              <span className="font-medium">
                {entry.value.toLocaleString()}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 shadow-xl">
          <p
            className="font-semibold text-foreground"
            style={{ color: data.payload.fill }}
          >
            {data.name}
          </p>
          <p className="text-sm text-muted-foreground">
            Count:{" "}
            <span className="font-medium text-foreground">
              {data.value.toLocaleString()}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <MainLayout title="Reports">
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading reports data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Reports">
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive insights into load distribution and operational
              efficiency
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={timeRange}
              onValueChange={(value: "3months" | "6months" | "12months") =>
                setTimeRange(value)
              }
            >
              <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm border-border/50">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Export Report</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    exportReportsToPdf({ loads, timeRange, reportType: "full" })
                  }
                  className="gap-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-indigo-500" />
                  <span>Complete Report</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    exportReportsToPdf({
                      loads,
                      timeRange,
                      reportType: "summary",
                    })
                  }
                  className="gap-2 cursor-pointer"
                >
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span>Executive Summary</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportReportsToPdf({
                      loads,
                      timeRange,
                      reportType: "distribution",
                    })
                  }
                  className="gap-2 cursor-pointer"
                >
                  <PieChartIcon className="h-4 w-4 text-purple-500" />
                  <span>Load Distribution</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportReportsToPdf({
                      loads,
                      timeRange,
                      reportType: "routes",
                    })
                  }
                  className="gap-2 cursor-pointer"
                >
                  <MapIcon className="h-4 w-4 text-amber-500" />
                  <span>Route Analysis</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportReportsToPdf({
                      loads,
                      timeRange,
                      reportType: "time-analysis",
                    })
                  }
                  className="gap-2 cursor-pointer"
                >
                  <Clock className="h-4 w-4 text-cyan-500" />
                  <span>Time Analysis</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => exportVarianceToPdf(loads, timeRange)}
                  className="gap-2 cursor-pointer"
                >
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>Variance (PDF)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportVarianceToExcel(loads, timeRange)}
                  className="gap-2 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-emerald-600" />
                  <span>Variance (Excel)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {summaryStats.totalLoads.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Loads</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {summaryStats.deliveryRate}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Delivery Rate
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border-rose-500/20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                {summaryStats.uniqueRoutes}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Unique Routes
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="distribution" className="space-y-6">
          <TabsList className="bg-muted/50 backdrop-blur-sm p-1">
            <TabsTrigger
              value="distribution"
              className="data-[state=active]:bg-background"
            >
              Load Distribution
            </TabsTrigger>
            <TabsTrigger
              value="time"
              className="data-[state=active]:bg-background"
            >
              Time Analysis
            </TabsTrigger>
            <TabsTrigger
              value="backload"
              className="data-[state=active]:bg-background gap-2"
            >
              <Package className="h-4 w-4" />
              Backload Packaging
            </TabsTrigger>
          </TabsList>

          {/* Load Distribution Tab */}
          <TabsContent value="distribution" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cargo Type Distribution */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">
                    Cargo Type Distribution
                  </CardTitle>
                  <CardDescription>
                    Breakdown of loads by cargo category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={cargoDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {cargoDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend
                          layout="horizontal"
                          verticalAlign="bottom"
                          align="center"
                          wrapperStyle={{ paddingTop: "20px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">
                    Status Distribution
                  </CardTitle>
                  <CardDescription>
                    Current load status overview
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend
                          layout="horizontal"
                          verticalAlign="bottom"
                          align="center"
                          wrapperStyle={{ paddingTop: "20px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Routes */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">
                  Top Routes by Load Volume
                </CardTitle>
                <CardDescription>
                  Most frequently used delivery routes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topRoutes}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                    >
                      <defs>
                        <linearGradient
                          id="routeGradient"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e5e7eb"
                        opacity={0.4}
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                      />
                      <YAxis
                        dataKey="route"
                        type="category"
                        width={180}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#374151", fontSize: 11 }}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "rgba(0,0,0,0.04)" }}
                      />
                      <Bar
                        dataKey="loads"
                        fill="url(#routeGradient)"
                        radius={[0, 6, 6, 0]}
                        barSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Trend */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">
                  Weekly Load Trends
                </CardTitle>
                <CardDescription>
                  Load volumes and status breakdown over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={weeklyTrend}
                      margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                    >
                      <defs>
                        <linearGradient
                          id="scheduledGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="transitGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#f59e0b"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#f59e0b"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="deliveredGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#22c55e"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#22c55e"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="pendingGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#ef4444"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#ef4444"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e5e7eb"
                        opacity={0.4}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="week"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6b7280", fontSize: 11 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: "10px" }} />
                      <Area
                        type="monotone"
                        dataKey="scheduled"
                        name="Scheduled"
                        stroke="#3b82f6"
                        fill="url(#scheduledGradient)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="inTransit"
                        name="In Transit"
                        stroke="#f59e0b"
                        fill="url(#transitGradient)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="delivered"
                        name="Delivered"
                        stroke="#22c55e"
                        fill="url(#deliveredGradient)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="pending"
                        name="Pending"
                        stroke="#ef4444"
                        fill="url(#pendingGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Time Analysis Tab - Planned vs Actual */}
          <TabsContent value="time" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200/50 dark:border-emerald-800/30 shadow-sm">
                <CardContent className="pt-6 pb-5">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70">
                      On-Time Rate
                    </p>
                    <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">
                      {timeVarianceAnalysis.onTimeRate}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {timeVarianceAnalysis.onTimeCount +
                        timeVarianceAnalysis.earlyCount}{" "}
                      of {timeVarianceAnalysis.totalAnalyzed} loads
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200/50 dark:border-blue-800/30 shadow-sm">
                <CardContent className="pt-6 pb-5">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600/70 dark:text-blue-400/70">
                      Avg Departure Variance
                    </p>
                    <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                      {timeVarianceAnalysis.avgOriginVariance > 0 ? "+" : ""}
                      {timeVarianceAnalysis.avgOriginVariance}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      minutes from planned
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200/50 dark:border-violet-800/30 shadow-sm">
                <CardContent className="pt-6 pb-5">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-600/70 dark:text-violet-400/70">
                      Avg Arrival Variance
                    </p>
                    <p className="text-4xl font-bold text-violet-700 dark:text-violet-300">
                      {timeVarianceAnalysis.avgDestVariance > 0 ? "+" : ""}
                      {timeVarianceAnalysis.avgDestVariance}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      minutes from planned
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/30 shadow-sm">
                <CardContent className="pt-6 pb-5">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70">
                      Late Deliveries
                    </p>
                    <p className="text-4xl font-bold text-amber-700 dark:text-amber-300">
                      {timeVarianceAnalysis.lateCount}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      loads over 15 mins late
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Removed Compact Daily & Weekly Variance section per request */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Delivery Performance Distribution */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">
                    Delivery Performance
                  </CardTitle>
                  <CardDescription>
                    Planned vs actual arrival time distribution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {timeVarianceAnalysis.distribution.length > 0 ? (
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={timeVarianceAnalysis.distribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="count"
                            stroke="none"
                          >
                            {timeVarianceAnalysis.distribution.map(
                              (entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ),
                            )}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0]
                                  .payload as TimeVarianceData;
                                return (
                                  <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 shadow-xl">
                                    <p
                                      className="font-semibold"
                                      style={{ color: data.fill }}
                                    >
                                      {data.category}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {data.count} loads ({data.percentage}%)
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{ paddingTop: "20px" }}
                            formatter={(value, entry) => {
                              const item =
                                timeVarianceAnalysis.distribution.find(
                                  (d) => d.category === value,
                                );
                              return `${value} (${item?.percentage || 0}%)`;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[320px] flex items-center justify-center">
                      <p className="text-muted-foreground text-center">
                        No delivery time data available.
                        <br />
                        <span className="text-sm">
                          Complete deliveries with actual times to see analysis.
                        </span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Day of Week Distribution */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">
                    Load Scheduling by Day
                  </CardTitle>
                  <CardDescription>
                    Volume distribution across weekdays
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dayOfWeekDistribution}
                        margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                      >
                        <defs>
                          <linearGradient
                            id="dayGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#a855f7" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                          opacity={0.4}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="day"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: "rgba(0,0,0,0.04)" }}
                        />
                        <Bar
                          dataKey="loads"
                          name="Load Count"
                          fill="url(#dayGradient)"
                          radius={[6, 6, 0, 0]}
                          barSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Route Performance */}
            {timeVarianceAnalysis.routePerformance.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">
                    Destination Performance
                  </CardTitle>
                  <CardDescription>
                    Average time variance by destination (positive = late,
                    negative = early)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={timeVarianceAnalysis.routePerformance}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                      >
                        <defs>
                          <linearGradient
                            id="positiveVariance"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                          >
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="100%" stopColor="#f97316" />
                          </linearGradient>
                          <linearGradient
                            id="negativeVariance"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                          >
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#10b981" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                          opacity={0.4}
                          horizontal={true}
                          vertical={false}
                        />
                        <XAxis
                          type="number"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          tickFormatter={(value) =>
                            `${value > 0 ? "+" : ""}${value} min`
                          }
                          domain={["dataMin - 10", "dataMax + 10"]}
                        />
                        <YAxis
                          dataKey="location"
                          type="category"
                          width={120}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#374151", fontSize: 11 }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0]
                                .payload as LocationVariance;
                              return (
                                <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 shadow-xl">
                                  <p className="font-semibold text-foreground mb-2">
                                    {data.location}
                                  </p>
                                  <div className="space-y-1 text-sm">
                                    <p>
                                      Avg Variance:{" "}
                                      <span
                                        className={
                                          data.avgVariance > 0
                                            ? "text-red-500"
                                            : "text-green-500"
                                        }
                                      >
                                        {data.avgVariance > 0 ? "+" : ""}
                                        {data.avgVariance} min
                                      </span>
                                    </p>
                                    <p className="text-green-600">
                                      On Time: {data.onTimeCount}
                                    </p>
                                    <p className="text-blue-600">
                                      Early: {data.earlyCount}
                                    </p>
                                    <p className="text-red-600">
                                      Late: {data.lateCount}
                                    </p>
                                    <p className="text-muted-foreground">
                                      Total: {data.totalLoads} loads
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                          cursor={{ fill: "rgba(0,0,0,0.04)" }}
                        />
                        <Bar
                          dataKey="avgVariance"
                          name="Avg Variance (min)"
                          radius={[0, 6, 6, 0]}
                          barSize={24}
                        >
                          {timeVarianceAnalysis.routePerformance.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  entry.avgVariance >= 0 ? "#ef4444" : "#22c55e"
                                }
                              />
                            ),
                          )}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Visual Delays by Location + Export */}
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => exportPunctualityToExcel(filteredLoads, timeRange)}>
                Export Excel (Punctuality)
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportPunctualityToPdf(filteredLoads, timeRange)}>
                Export PDF (Punctuality)
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">Origin Delays (by name)</CardTitle>
                  <CardDescription>Late arrivals and departures (over 15 min)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={originDelayChartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} horizontal vertical={false} />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                        <YAxis dataKey="location" type="category" width={150} axisLine={false} tickLine={false} tick={{ fill: "#374151", fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                        <Legend />
                        <Bar dataKey="arrLate" name="Late Arrivals" stackId="a" fill="#f59e0b" barSize={20} radius={[0, 6, 6, 0]} />
                        <Bar dataKey="depLate" name="Late Departures" stackId="a" fill="#ef4444" barSize={20} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">Destination Delays (by name)</CardTitle>
                  <CardDescription>Late arrivals and departures (over 15 min)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={destinationDelayChartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} horizontal vertical={false} />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                        <YAxis dataKey="location" type="category" width={150} axisLine={false} tickLine={false} tick={{ fill: "#374151", fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                        <Legend />
                        <Bar dataKey="arrLate" name="Late Arrivals" stackId="a" fill="#3b82f6" barSize={20} radius={[0, 6, 6, 0]} />
                        <Bar dataKey="depLate" name="Late Departures" stackId="a" fill="#8b5cf6" barSize={20} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Legend */}
            <Card className="bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/30">
              <CardContent className="pt-6 pb-5">
                <div className="flex flex-wrap items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                    <span className="text-sm">
                      <span className="font-medium">On Time:</span> Within 15
                      min of planned
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-sm">
                      <span className="font-medium">Early:</span> More than 5
                      min before planned
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                    <span className="text-sm">
                      <span className="font-medium">Slightly Late:</span> 15-30
                      min after planned
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span className="text-sm">
                      <span className="font-medium">Late:</span> Over 30 min
                      after planned
                    </span>
                  </div>
                </div>
                {timeVarianceAnalysis.noDataCount > 0 && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    {timeVarianceAnalysis.noDataCount} delivered loads have
                    incomplete time data
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backload Packaging Movements Tab */}
          <TabsContent value="backload" className="space-y-6">
            {/* Backload Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200/50 dark:border-violet-800/30 shadow-sm">
                <CardContent className="pt-6 pb-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-violet-500" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-violet-600/70 dark:text-violet-400/70">
                        Total Movements
                      </p>
                    </div>
                    <p className="text-4xl font-bold text-violet-700 dark:text-violet-300">
                      {backloadSummaryStats.totalMovements}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      backload operations
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-cyan-200/50 dark:border-cyan-800/30 shadow-sm">
                <CardContent className="pt-6 pb-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Boxes className="h-4 w-4 text-cyan-500" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-600/70 dark:text-cyan-400/70">
                        Total Packaging
                      </p>
                    </div>
                    <p className="text-4xl font-bold text-cyan-700 dark:text-cyan-300">
                      {backloadSummaryStats.totalPackaging.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      bins, crates & pallets
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200/50 dark:border-emerald-800/30 shadow-sm">
                <CardContent className="pt-6 pb-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70">
                        Delivery Rate
                      </p>
                    </div>
                    <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">
                      {backloadSummaryStats.deliveryRate}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {backloadSummaryStats.deliveredCount} delivered
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/30 shadow-sm">
                <CardContent className="pt-6 pb-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapIcon className="h-4 w-4 text-amber-500" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70">
                        Destinations
                      </p>
                    </div>
                    <p className="text-4xl font-bold text-amber-700 dark:text-amber-300">
                      {backloadSummaryStats.uniqueDestinations}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      unique farms/locations
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Packaging Breakdown Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-purple-100/50 to-violet-100/50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200/50 dark:border-purple-800/30">
                <CardContent className="pt-5 pb-4 text-center">
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {backloadSummaryStats.totalBins.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Bins</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-cyan-100/50 to-blue-100/50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-200/50 dark:border-cyan-800/30">
                <CardContent className="pt-5 pb-4 text-center">
                  <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                    {backloadSummaryStats.totalCrates.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Crates</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-100/50 to-yellow-100/50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200/50 dark:border-amber-800/30">
                <CardContent className="pt-5 pb-4 text-center">
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {backloadSummaryStats.totalPallets.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Pallets</p>
                </CardContent>
              </Card>
            </div>

            {backloadMovements.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Packaging Type Distribution */}
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Boxes className="h-5 w-5 text-purple-500" />
                        Packaging Type Distribution
                      </CardTitle>
                      <CardDescription>
                        Breakdown of backload packaging by type
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={backloadPackagingDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={3}
                              dataKey="value"
                              stroke="none"
                            >
                              {backloadPackagingDistribution.map(
                                (entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.fill}
                                  />
                                ),
                              )}
                            </Pie>
                            <Tooltip content={<PieTooltip />} />
                            <Legend
                              layout="horizontal"
                              verticalAlign="bottom"
                              align="center"
                              wrapperStyle={{ paddingTop: "20px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Backload Status Distribution */}
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-500" />
                        Movement Status
                      </CardTitle>
                      <CardDescription>
                        Current status of backload movements
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={backloadStatusDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={3}
                              dataKey="value"
                              stroke="none"
                            >
                              {backloadStatusDistribution.map(
                                (entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.fill}
                                  />
                                ),
                              )}
                            </Pie>
                            <Tooltip content={<PieTooltip />} />
                            <Legend
                              layout="horizontal"
                              verticalAlign="bottom"
                              align="center"
                              wrapperStyle={{ paddingTop: "20px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Backload by Destination */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <ArrowRight className="h-5 w-5 text-orange-500" />
                      Packaging by Destination
                    </CardTitle>
                    <CardDescription>
                      Backload packaging distribution across destination farms
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={backloadDestinationDistribution}
                          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                        >
                          <defs>
                            <linearGradient
                              id="binsGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#8b5cf6"
                                stopOpacity={0.9}
                              />
                              <stop
                                offset="100%"
                                stopColor="#a855f7"
                                stopOpacity={0.7}
                              />
                            </linearGradient>
                            <linearGradient
                              id="cratesGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#06b6d4"
                                stopOpacity={0.9}
                              />
                              <stop
                                offset="100%"
                                stopColor="#0891b2"
                                stopOpacity={0.7}
                              />
                            </linearGradient>
                            <linearGradient
                              id="palletsGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#f59e0b"
                                stopOpacity={0.9}
                              />
                              <stop
                                offset="100%"
                                stopColor="#d97706"
                                stopOpacity={0.7}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                            opacity={0.4}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="destination"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6b7280", fontSize: 12 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6b7280", fontSize: 12 }}
                          />
                          <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: "rgba(0,0,0,0.04)" }}
                          />
                          <Legend wrapperStyle={{ paddingTop: "10px" }} />
                          <Bar
                            dataKey="bins"
                            name="Bins"
                            fill="url(#binsGradient)"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="crates"
                            name="Crates"
                            fill="url(#cratesGradient)"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="pallets"
                            name="Pallets"
                            fill="url(#palletsGradient)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Backload Weekly Trend */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                      Weekly Packaging Movement Trends
                    </CardTitle>
                    <CardDescription>
                      Backload packaging quantities over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={backloadWeeklyTrend}
                          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                        >
                          <defs>
                            <linearGradient
                              id="binsAreaGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#8b5cf6"
                                stopOpacity={0.4}
                              />
                              <stop
                                offset="95%"
                                stopColor="#8b5cf6"
                                stopOpacity={0}
                              />
                            </linearGradient>
                            <linearGradient
                              id="cratesAreaGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#06b6d4"
                                stopOpacity={0.4}
                              />
                              <stop
                                offset="95%"
                                stopColor="#06b6d4"
                                stopOpacity={0}
                              />
                            </linearGradient>
                            <linearGradient
                              id="palletsAreaGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#f59e0b"
                                stopOpacity={0.4}
                              />
                              <stop
                                offset="95%"
                                stopColor="#f59e0b"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                            opacity={0.4}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="week"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6b7280", fontSize: 11 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6b7280", fontSize: 12 }}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ paddingTop: "10px" }} />
                          <Area
                            type="monotone"
                            dataKey="bins"
                            name="Bins"
                            stroke="#8b5cf6"
                            fill="url(#binsAreaGradient)"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="crates"
                            name="Crates"
                            stroke="#06b6d4"
                            fill="url(#cratesAreaGradient)"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="pallets"
                            name="Pallets"
                            stroke="#f59e0b"
                            fill="url(#palletsAreaGradient)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Backload Route Analysis */}
                {backloadRouteAnalysis.length > 0 && (
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <MapIcon className="h-5 w-5 text-indigo-500" />
                        Backload Route Analysis
                      </CardTitle>
                      <CardDescription>
                        Top routes for backload packaging movements (delivery
                        destination → backload farm)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={backloadRouteAnalysis}
                            layout="vertical"
                            margin={{
                              top: 10,
                              right: 30,
                              left: 20,
                              bottom: 10,
                            }}
                          >
                            <defs>
                              <linearGradient
                                id="routeBackloadGradient"
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="0"
                              >
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e5e7eb"
                              opacity={0.4}
                              horizontal={true}
                              vertical={false}
                            />
                            <XAxis
                              type="number"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#6b7280", fontSize: 12 }}
                            />
                            <YAxis
                              dataKey="route"
                              type="category"
                              width={200}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#374151", fontSize: 11 }}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 shadow-xl">
                                      <p className="font-semibold text-foreground mb-2">
                                        {data.route}
                                      </p>
                                      <div className="space-y-1 text-sm">
                                        <p>
                                          Movements:{" "}
                                          <span className="font-medium">
                                            {data.count}
                                          </span>
                                        </p>
                                        <p className="text-purple-600">
                                          Bins: {data.bins}
                                        </p>
                                        <p className="text-cyan-600">
                                          Crates: {data.crates}
                                        </p>
                                        <p className="text-amber-600">
                                          Pallets: {data.pallets}
                                        </p>
                                        <p className="text-muted-foreground">
                                          Total: {data.totalPackaging} items
                                        </p>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                              cursor={{ fill: "rgba(0,0,0,0.04)" }}
                            />
                            <Bar
                              dataKey="count"
                              name="Movements"
                              fill="url(#routeBackloadGradient)"
                              radius={[0, 6, 6, 0]}
                              barSize={24}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Backload Cargo Type Distribution */}
                {backloadCargoTypeDistribution.length > 0 && (
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Package className="h-5 w-5 text-teal-500" />
                        Backload Cargo Types
                      </CardTitle>
                      <CardDescription>
                        Distribution of backload movements by cargo type
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={backloadCargoTypeDistribution}
                            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e5e7eb"
                              opacity={0.4}
                              vertical={false}
                            />
                            <XAxis
                              dataKey="cargoType"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#6b7280", fontSize: 12 }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#6b7280", fontSize: 12 }}
                            />
                            <Tooltip
                              content={<CustomTooltip />}
                              cursor={{ fill: "rgba(0,0,0,0.04)" }}
                            />
                            <Bar
                              dataKey="count"
                              name="Count"
                              radius={[6, 6, 0, 0]}
                              barSize={60}
                            >
                              {backloadCargoTypeDistribution.map(
                                (entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.fill}
                                  />
                                ),
                              )}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Info Card */}
                <Card className="bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/30">
                  <CardContent className="pt-6 pb-5">
                    <div className="flex flex-wrap items-center justify-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                        <span className="text-sm">
                          <span className="font-medium">Bins:</span> Standard
                          packaging bins
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-cyan-500"></div>
                        <span className="text-sm">
                          <span className="font-medium">Crates:</span> Reusable
                          crates
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                        <span className="text-sm">
                          <span className="font-medium">Pallets:</span> Shipping
                          pallets
                        </span>
                      </div>
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Backload operations return empty packaging from delivery
                      destinations to farm locations
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/30">
                <CardContent className="pt-12 pb-12">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        No Backload Data Available
                      </h3>
                      <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                        There are no backload packaging movements recorded in
                        the selected time range. Backload data is captured when
                        loads include return packaging information.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
