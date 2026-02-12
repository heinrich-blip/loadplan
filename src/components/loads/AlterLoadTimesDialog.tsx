import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateLoadTimes, type Load } from "@/hooks/useLoads";
import { formatISO } from "date-fns";

const schema = z.object({
  actual_loading_arrival: z.string().optional(),
  actual_loading_arrival_verified: z.boolean().optional(),
  actual_loading_departure: z.string().optional(),
  actual_loading_departure_verified: z.boolean().optional(),
  actual_offloading_arrival: z.string().optional(),
  actual_offloading_arrival_verified: z.boolean().optional(),
  actual_offloading_departure: z.string().optional(),
  actual_offloading_departure_verified: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export function AlterLoadTimesDialog({ open, onOpenChange, load }: { open: boolean; onOpenChange: (open: boolean) => void; load: Load | null }) {
  const safeLoad: Partial<Load> = load ?? {};
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      actual_loading_arrival: safeLoad.actual_loading_arrival || "",
      actual_loading_arrival_verified: !!safeLoad.actual_loading_arrival_verified,
      actual_loading_departure: safeLoad.actual_loading_departure || "",
      actual_loading_departure_verified: !!safeLoad.actual_loading_departure_verified,
      actual_offloading_arrival: safeLoad.actual_offloading_arrival || "",
      actual_offloading_arrival_verified: !!safeLoad.actual_offloading_arrival_verified,
      actual_offloading_departure: safeLoad.actual_offloading_departure || "",
      actual_offloading_departure_verified: !!safeLoad.actual_offloading_departure_verified,
    },
  });
  const updateTimes = useUpdateLoadTimes();

  const onSubmit = (values: FormData) => {
    if (!load?.id) return;
    // Parse and update time_window JSON
    let timeWindowData;
    try {
      timeWindowData = load?.time_window ? JSON.parse(load.time_window) : {};
    } catch {
      timeWindowData = {};
    }
    timeWindowData.origin = timeWindowData.origin || {};
    timeWindowData.destination = timeWindowData.destination || {};

    if (values.actual_loading_arrival) {
      timeWindowData.origin.actualArrival = values.actual_loading_arrival;
    }
    if (values.actual_loading_departure) {
      timeWindowData.origin.actualDeparture = values.actual_loading_departure;
    }
    if (values.actual_offloading_arrival) {
      timeWindowData.destination.actualArrival = values.actual_offloading_arrival;
    }
    if (values.actual_offloading_departure) {
      timeWindowData.destination.actualDeparture = values.actual_offloading_departure;
    }

    updateTimes.mutate({
      id: load.id,
      times: {
        ...values,
        actual_loading_arrival_source: values.actual_loading_arrival ? "manual" : undefined,
        actual_loading_departure_source: values.actual_loading_departure ? "manual" : undefined,
        actual_offloading_arrival_source: values.actual_offloading_arrival ? "manual" : undefined,
        actual_offloading_departure_source: values.actual_offloading_departure ? "manual" : undefined,
        // @ts-expect-error time_window is intentionally included for structured/legacy time data – add to LoadTimes type in useLoads.ts for proper typing
        time_window: JSON.stringify(timeWindowData),
      },
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alter/Verify Actual Times</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              Loading Arrival
              {load?.actual_loading_arrival_source === 'auto' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Auto</span>
              )}
            </label>
            <Input type="datetime-local" {...form.register("actual_loading_arrival")} />
            <Checkbox {...form.register("actual_loading_arrival_verified")} /> Verified
          </div>
          <div>
            <label className="flex items-center gap-2">
              Loading Departure
              {load?.actual_loading_departure_source === 'auto' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Auto</span>
              )}
            </label>
            <Input type="datetime-local" {...form.register("actual_loading_departure")} />
            <Checkbox {...form.register("actual_loading_departure_verified")} /> Verified
          </div>
          <div>
            <label className="flex items-center gap-2">
              Offloading Arrival
              {load?.actual_offloading_arrival_source === 'auto' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Auto</span>
              )}
            </label>
            <Input type="datetime-local" {...form.register("actual_offloading_arrival")} />
            <Checkbox {...form.register("actual_offloading_arrival_verified")} /> Verified
          </div>
          <div>
            <label className="flex items-center gap-2">
              Offloading Departure
              {load?.actual_offloading_departure_source === 'auto' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Auto</span>
              )}
            </label>
            <Input type="datetime-local" {...form.register("actual_offloading_departure")} />
            <Checkbox {...form.register("actual_offloading_departure_verified")} /> Verified
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!load?.id}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}