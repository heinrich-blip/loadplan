import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateLoadTimes } from "@/hooks/useLoads";
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

export function AlterLoadTimesDialog({ open, onOpenChange, load }) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      actual_loading_arrival: load.actual_loading_arrival || "",
      actual_loading_arrival_verified: load.actual_loading_arrival_verified || false,
      actual_loading_departure: load.actual_loading_departure || "",
      actual_loading_departure_verified: load.actual_loading_departure_verified || false,
      actual_offloading_arrival: load.actual_offloading_arrival || "",
      actual_offloading_arrival_verified: load.actual_offloading_arrival_verified || false,
      actual_offloading_departure: load.actual_offloading_departure || "",
      actual_offloading_departure_verified: load.actual_offloading_departure_verified || false,
    },
  });
  const updateTimes = useUpdateLoadTimes();

  const onSubmit = (values: FormData) => {
    updateTimes.mutate({
      id: load.id,
      times: {
        ...values,
        actual_loading_arrival_source: values.actual_loading_arrival ? "manual" : undefined,
        actual_loading_departure_source: values.actual_loading_departure ? "manual" : undefined,
        actual_offloading_arrival_source: values.actual_offloading_arrival ? "manual" : undefined,
        actual_offloading_departure_source: values.actual_offloading_departure ? "manual" : undefined,
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
            <label>Loading Arrival</label>
            <Input type="datetime-local" {...form.register("actual_loading_arrival")} />
            <Checkbox {...form.register("actual_loading_arrival_verified")} /> Verified
          </div>
          <div>
            <label>Loading Departure</label>
            <Input type="datetime-local" {...form.register("actual_loading_departure")} />
            <Checkbox {...form.register("actual_loading_departure_verified")} /> Verified
          </div>
          <div>
            <label>Offloading Arrival</label>
            <Input type="datetime-local" {...form.register("actual_offloading_arrival")} />
            <Checkbox {...form.register("actual_offloading_arrival_verified")} /> Verified
          </div>
          <div>
            <label>Offloading Departure</label>
            <Input type="datetime-local" {...form.register("actual_offloading_departure")} />
            <Checkbox {...form.register("actual_offloading_departure_verified")} /> Verified
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
