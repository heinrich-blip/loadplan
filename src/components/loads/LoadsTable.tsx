import
  {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import
  {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import
  {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
import { Load, useDeleteLoad } from "@/hooks/useLoads";
import { AlterLoadTimesDialog } from "./AlterLoadTimesDialog";
import { DeliveryConfirmationDialog } from "./DeliveryConfirmationDialog";
import { exportLoadToPdf } from "@/lib/exportLoadToPdf";
import { cn, getLocationDisplayName } from "@/lib/utils";
import { format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import
  {
    Calendar,
    CheckCircle,
    FileDown,
    MapPin,
    MoreHorizontal,
    Navigation,
    Pencil,
    RotateCcw,
    Trash2,
    Truck,
    User,
    Users,
  } from "lucide-react";
import { useMemo, useState } from "react";
import { AddBackloadDialog } from "./AddBackloadDialog";
import { AddThirdPartyBackloadDialog } from "./AddThirdPartyBackloadDialog";
import { StatusStepper } from "./StatusToggle";
import { VehicleTrackingDialog } from "./VehicleTrackingDialog";

interface LoadsTableProps {
  loads: Load[];
  onLoadClick?: (load: Load) => void;
  onEditLoad?: (load: Load) => void;
  onConfirmDelivery?: (load: Load) => void;
  isLoading?: boolean;
}

const cargoColors: Record<string, string> = {
  VanSalesRetail:
    "bg-cargo-vansales/10 text-cargo-vansales border-cargo-vansales/20",
  Retail: "bg-cargo-retail/10 text-cargo-retail border-cargo-retail/20",
  Vendor: "bg-cargo-bv/10 text-cargo-bv border-cargo-bv/20",
  RetailVendor: "bg-cargo-cbc/10 text-cargo-cbc border-cargo-cbc/20",
  Fertilizer: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  BV: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  CBC: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Packaging: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

// Display labels for cargo types
const cargoLabels: Record<string, string> = {
  VanSalesRetail: "Van Sales/Retail",
  Retail: "Retail",
  Vendor: "Vendor",
  RetailVendor: "Retail Vendor",
  Fertilizer: "Fertilizer",
  BV: "BV (Backload)",
  CBC: "CBC (Backload)",
  Packaging: "Packaging (Backload)",
};

// Parse time_window JSON and get times data including backload info
function parseTimeWindowData(timeWindow: string) {
  try {
    const data = JSON.parse(timeWindow);
    return {
      originArrival: data.origin?.plannedArrival || "",
      originDeparture: data.origin?.plannedDeparture || "",
      destArrival: data.destination?.plannedArrival || "",
      destDeparture: data.destination?.plannedDeparture || "",
      backload: data.backload || null,
    };
  } catch {
    return {
      originArrival: "",
      originDeparture: "",
      destArrival: "",
      destDeparture: "",
      backload: null,
    };
  }
}

// Group loads by loading date
function groupLoadsByDate(loads: Load[]): Map<string, Load[]> {
  const grouped = new Map<string, Load[]>();

  loads.forEach((load) => {
    const dateKey = load.loading_date;
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(load);
  });

  // Sort by date
  return new Map(
    [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  );
}

// Format date header with relative day indicator
function formatDateHeader(dateStr: string): {
  main: string;
  relative: string | null;
} {
  const date = parseISO(dateStr);
  const main = format(date, "EEEE, d MMMM yyyy");

  let relative: string | null = null;
  if (isToday(date)) {
    relative = "Today";
  } else if (isTomorrow(date)) {
    relative = "Tomorrow";
  } else if (isYesterday(date)) {
    relative = "Yesterday";
  }

  return { main, relative };
}

export function LoadsTable({
  loads,
  onLoadClick,
  onEditLoad,
  onConfirmDelivery,
  isLoading,
}: LoadsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loadToDelete, setLoadToDelete] = useState<Load | null>(null);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [loadToTrack, setLoadToTrack] = useState<Load | null>(null);
  const [backloadDialogOpen, setBackloadDialogOpen] = useState(false);
  const [loadForBackload, setLoadForBackload] = useState<Load | null>(null);
  const [thirdPartyBackloadDialogOpen, setThirdPartyBackloadDialogOpen] =
    useState(false);
  const [loadForThirdPartyBackload, setLoadForThirdPartyBackload] =
    useState<Load | null>(null);
  const [alterDialogOpen, setAlterDialogOpen] = useState(false);
  const [loadToAlter, setLoadToAlter] = useState<Load | null>(null);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [loadForDelivery, setLoadForDelivery] = useState<Load | null>(null);
  const [verificationOnly, setVerificationOnly] = useState(false);
    // Helper: check if any actual time is missing or unverified
    function needsVerification(load: Load) {
      return (
        !load.actual_loading_arrival || !load.actual_loading_arrival_verified ||
        !load.actual_loading_departure || !load.actual_loading_departure_verified ||
        !load.actual_offloading_arrival || !load.actual_offloading_arrival_verified ||
        !load.actual_offloading_departure || !load.actual_offloading_departure_verified
      );
    }

    // Quick Add handler: set current time for missing fields
    function handleQuickAdd(load: Load) {
      const now = new Date();
      const times: any = {};
      // Prepare new actual times
      if (!load.actual_loading_arrival) {
        times.actual_loading_arrival = now.toISOString();
        times.actual_loading_arrival_verified = true;
        times.actual_loading_arrival_source = 'manual';
      }
      if (!load.actual_loading_departure) {
        times.actual_loading_departure = now.toISOString();
        times.actual_loading_departure_verified = true;
        times.actual_loading_departure_source = 'manual';
      }
      if (!load.actual_offloading_arrival) {
        times.actual_offloading_arrival = now.toISOString();
        times.actual_offloading_arrival_verified = true;
        times.actual_offloading_arrival_source = 'manual';
      }
      if (!load.actual_offloading_departure) {
        times.actual_offloading_departure = now.toISOString();
        times.actual_offloading_departure_verified = true;
        times.actual_offloading_departure_source = 'manual';
      }

      // Also update time_window JSON
      let timeWindowData;
      try {
        timeWindowData = load.time_window ? JSON.parse(load.time_window) : {};
      } catch {
        timeWindowData = {};
      }
      timeWindowData.origin = timeWindowData.origin || {};
      timeWindowData.destination = timeWindowData.destination || {};
      if (!load.actual_loading_arrival) {
        timeWindowData.origin.actualArrival = times.actual_loading_arrival;
      }
      if (!load.actual_loading_departure) {
        timeWindowData.origin.actualDeparture = times.actual_loading_departure;
      }
      if (!load.actual_offloading_arrival) {
        timeWindowData.destination.actualArrival = times.actual_offloading_arrival;
      }
      if (!load.actual_offloading_departure) {
        timeWindowData.destination.actualDeparture = times.actual_offloading_departure;
      }

      if (Object.keys(times).length > 0) {
        times.time_window = JSON.stringify(timeWindowData);
        import("@/hooks/useLoads").then(({ useUpdateLoadTimes }) => {
          const update = useUpdateLoadTimes();
          update.mutate({ id: load.id, times });
        });
      }
    }
  const deleteLoad = useDeleteLoad();

  const handleDeleteClick = (e: React.MouseEvent, load: Load) => {
    e.stopPropagation();
    setLoadToDelete(load);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, load: Load) => {
    e.stopPropagation();
    onEditLoad?.(load);
  };

  const handleTrackClick = (e: React.MouseEvent, load: Load) => {
    e.stopPropagation();
    setLoadToTrack(load);
    setTrackingDialogOpen(true);
  };

  const handleDeliveryClick = (e: React.MouseEvent, load: Load) => {
    e.stopPropagation();
    setLoadForDelivery(load);
    setVerificationOnly(false);
    setDeliveryDialogOpen(true);
  };

  const handleBackloadClick = (e: React.MouseEvent, load: Load) => {
    e.stopPropagation();
    // Check if this is a third-party load (TP- prefix)
    if (load.load_id?.startsWith("TP-")) {
      setLoadForThirdPartyBackload(load);
      setThirdPartyBackloadDialogOpen(true);
    } else {
      setLoadForBackload(load);
      setBackloadDialogOpen(true);
    }
  };

  const handleThirdPartyBackloadClick = (e: React.MouseEvent, load: Load) => {
    e.stopPropagation();
    setLoadForThirdPartyBackload(load);
    setThirdPartyBackloadDialogOpen(true);
  };

  const handleExportPdf = (e: React.MouseEvent, load: Load) => {
    e.stopPropagation();
    exportLoadToPdf(load, loads);
  };

  const handleConfirmDelete = () => {
    if (loadToDelete) {
      deleteLoad.mutate(loadToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setLoadToDelete(null);
        },
      });
    }
  };

  // Group loads by loading date
  const groupedLoads = useMemo(() => groupLoadsByDate(loads), [loads]);

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Load ID</TableHead>
              <TableHead className="font-semibold">Schedule</TableHead>
              <TableHead className="font-semibold">Route</TableHead>
              <TableHead className="font-semibold">Cargo</TableHead>
              <TableHead className="font-semibold">Assignment</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-10 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-10 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-10 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-10 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-10 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-24" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (loads.length === 0) {
    return (
      <div className="rounded-xl border bg-card shadow-sm p-12 text-center">
        <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-1">
          No loads found
        </h3>
        <p className="text-muted-foreground">
          Create your first load to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(groupedLoads.entries()).map(([dateKey, dateLoads]) => {
        const { main: dateMain, relative } = formatDateHeader(dateKey);

        return (
          <div key={dateKey} className="animate-fade-in">
            {/* Date Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-semibold text-primary">{dateMain}</span>
                {relative && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {relative}
                  </Badge>
                )}
              </div>
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">
                {dateLoads.length} load{dateLoads.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Loads Table for this date */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">Load ID</TableHead>
                    <TableHead className="font-semibold">Schedule</TableHead>
                    <TableHead className="font-semibold">Route</TableHead>
                    <TableHead className="font-semibold">Cargo</TableHead>
                    <TableHead className="font-semibold">Assignment</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold w-[120px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dateLoads.map((load, index) => (
                    <TableRow
                      key={load.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/30",
                        "animate-fade-in",
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => onLoadClick?.(load)}
                    >
                      <TableCell>
                        {needsVerification(load) && (
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="destructive">Needs Verification</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLoadForDelivery(load);
                                setVerificationOnly(true);
                                setDeliveryDialogOpen(true);
                              }}
                            >
                              Verify Times
                            </Button>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-foreground">
                            {load.load_id}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Truck className="h-3 w-3" />
                            {load.fleet_vehicle?.vehicle_id || "Unassigned"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const times = parseTimeWindowData(load.time_window);
                          return (
                            <div className="flex items-center gap-2">
                              {/* Loading */}
                              <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                  <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                    {format(
                                      parseISO(load.loading_date),
                                      "dd MMM",
                                    )}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-0.5">
                                  {times.originDeparture
                                    ? `Dep ${times.originDeparture}`
                                    : "Loading"}
                                </span>
                              </div>

                              {/* Arrow */}
                              <div className="flex flex-col items-center px-1">
                                <div className="w-6 h-0.5 bg-gradient-to-r from-green-400 to-blue-400 rounded" />
                                <span className="text-[9px] text-muted-foreground">
                                  →
                                </span>
                              </div>

                              {/* Offloading */}
                              <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                                    {format(
                                      parseISO(load.offloading_date),
                                      "dd MMM",
                                    )}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-0.5">
                                  {times.destArrival
                                    ? `Arr ${times.destArrival}`
                                    : "Offloading"}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const times = parseTimeWindowData(load.time_window);
                          const backload = times.backload;
                          return (
                            <div className="space-y-2">
                              {/* Primary Route */}
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <div className="text-sm">
                                  <span className="font-medium">
                                    {getLocationDisplayName(load.origin)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {" "}
                                    →{" "}
                                  </span>
                                  <span>
                                    {getLocationDisplayName(load.destination)}
                                  </span>
                                </div>
                              </div>

                              {/* Backload Section - Enhanced visibility */}
                              {backload?.enabled && (
                                <div className="relative ml-2 pl-3 border-l-2 border-orange-400">
                                  <div className="flex items-start gap-2 p-2 rounded-md bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800/50">
                                    {/* Return Icon */}
                                    <div className="flex-shrink-0 mt-0.5">
                                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                                        <RotateCcw className="h-3.5 w-3.5 text-white" />
                                      </div>
                                    </div>

                                    {/* Backload Details */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">
                                          {backload.isThirdParty
                                            ? "Third Party Return"
                                            : "Return Load"}
                                        </span>
                                        {backload.cargoType && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] px-1.5 py-0 h-4 bg-orange-100 text-orange-600 border-orange-300 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-700"
                                          >
                                            {backload.cargoType}
                                          </Badge>
                                        )}
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                  <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => handleEditClick(e, load)}>
                                                  <Pencil className="h-4 w-4 mr-2" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => handleTrackClick(e, load)}>
                                                  <Navigation className="h-4 w-4 mr-2" /> Track
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => handleDeliveryClick(e, load)}>
                                                  <CheckCircle className="h-4 w-4 mr-2" /> Confirm Delivery
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => handleBackloadClick(e, load)}>
                                                  <RotateCcw className="h-4 w-4 mr-2" /> Add Backload
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => handleExportPdf(e, load)}>
                                                  <FileDown className="h-4 w-4 mr-2" /> Export PDF
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => { setLoadToAlter(load); setAlterDialogOpen(true); }}>
                                                  <Calendar className="h-4 w-4 mr-2" /> Alter Times
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleQuickAdd(load)}>
                                                  <CheckCircle className="h-4 w-4 mr-2" /> Quick Add Times
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => handleDeleteClick(e, load)}>
                                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                          {alterDialogOpen && loadToAlter?.id === load.id && (
                                            <div>
                                              <AlterLoadTimesDialog open={alterDialogOpen} onOpenChange={setAlterDialogOpen} load={loadToAlter} />
                                            </div>
                                          )}
                                        </TableCell>
                                        {!backload.cargoType && (
                                          <>
                                            <span className="text-muted-foreground">
                                              {getLocationDisplayName(load.destination)}
                                            </span>
                                            <span className="text-orange-500 font-medium">→</span>
                                            <span className="font-medium text-orange-700 dark:text-orange-300">
                                              {getLocationDisplayName(backload.destination)}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                      {/* Show cargo description for third-party backloads */}
                                      {backload.isThirdParty &&
                                        backload.thirdParty
                                          ?.cargoDescription && (
                                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
                                            {
                                              backload.thirdParty
                                                .cargoDescription
                                            }
                                          </p>
                                        )}
                                      {/* Show quantities for regular backloads */}
                                      {backload.quantities &&
                                        (backload.quantities.bins > 0 ||
                                          backload.quantities.crates > 0 ||
                                          backload.quantities.pallets > 0) && (
                                          <div className="flex items-center gap-2 mt-1">
                                            {backload.quantities.bins > 0 && (
                                              <span className="inline-flex items-center text-xs text-orange-600 dark:text-orange-400">
                                                <span className="font-semibold">
                                                  {backload.quantities.bins}
                                                </span>
                                                <span className="ml-0.5 text-muted-foreground">
                                                  Bins
                                                </span>
                                              </span>
                                            )}
                                            {backload.quantities.crates > 0 && (
                                              <span className="inline-flex items-center text-xs text-orange-600 dark:text-orange-400">
                                                <span className="font-semibold">
                                                  {backload.quantities.crates}
                                                </span>
                                                <span className="ml-0.5 text-muted-foreground">
                                                  Crates
                                                </span>
                                              </span>
                                            )}
                                            {backload.quantities.pallets >
                                              0 && (
                                              <span className="inline-flex items-center text-xs text-orange-600 dark:text-orange-400">
                                                <span className="font-semibold">
                                                  {backload.quantities.pallets}
                                                </span>
                                                <span className="ml-0.5 text-muted-foreground">
                                                  Pallets
                                                </span>
                                              </span>
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium",
                            cargoColors[load.cargo_type],
                          )}
                        >
                          {cargoLabels[load.cargo_type] || load.cargo_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="text-sm">
                            <p className="font-medium">
                              {load.driver?.name || "Unassigned"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {load.driver?.contact || "-"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusStepper load={load} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) =>
                                handleEditClick(
                                  e as unknown as React.MouseEvent,
                                  load,
                                )
                              }
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Load
                            </DropdownMenuItem>
                            {load.status !== "delivered" && (
                              <DropdownMenuItem
                                onClick={(e) =>
                                  handleBackloadClick(
                                    e as unknown as React.MouseEvent,
                                    load,
                                  )
                                }
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Add Backload
                              </DropdownMenuItem>
                            )}
                            {load.status !== "delivered" &&
                              !load.load_id?.startsWith("TP-") && (
                                <DropdownMenuItem
                                  onClick={(e) =>
                                    handleThirdPartyBackloadClick(
                                      e as unknown as React.MouseEvent,
                                      load,
                                    )
                                  }
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  Add Third-Party Backload
                                </DropdownMenuItem>
                              )}
                            {load.fleet_vehicle &&
                              load.status !== "delivered" && (
                                <DropdownMenuItem
                                  onClick={(e) =>
                                    handleTrackClick(
                                      e as unknown as React.MouseEvent,
                                      load,
                                    )
                                  }
                                >
                                  <Navigation className="h-4 w-4 mr-2" />
                                  Track Vehicle
                                </DropdownMenuItem>
                              )}
                            {load.status !== "delivered" && (
                              <DropdownMenuItem
                                onClick={(e) =>
                                  handleDeliveryClick(
                                    e as unknown as React.MouseEvent,
                                    load,
                                  )
                                }
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm Delivery
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) =>
                                handleExportPdf(
                                  e as unknown as React.MouseEvent,
                                  load,
                                )
                              }
                            >
                              <FileDown className="h-4 w-4 mr-2" />
                              Export to PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) =>
                                handleDeleteClick(
                                  e as unknown as React.MouseEvent,
                                  load,
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Load</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete load{" "}
              <span className="font-semibold">{loadToDelete?.load_id}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoad.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VehicleTrackingDialog
        open={trackingDialogOpen}
        onOpenChange={setTrackingDialogOpen}
        load={loadToTrack}
        telematicsAssetId={loadToTrack?.fleet_vehicle?.telematics_asset_id}
      />

      <AddBackloadDialog
        open={backloadDialogOpen}
        onOpenChange={setBackloadDialogOpen}
        load={loadForBackload}
      />

      <AddThirdPartyBackloadDialog
        open={thirdPartyBackloadDialogOpen}
        onOpenChange={setThirdPartyBackloadDialogOpen}
        load={loadForThirdPartyBackload}
      />

      <DeliveryConfirmationDialog
        open={deliveryDialogOpen}
        onOpenChange={setDeliveryDialogOpen}
        load={loadForDelivery}
        verificationOnly={verificationOnly}
      />
    </div>
  );
}
