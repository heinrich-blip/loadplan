// Manual/verified time update mutation
export function useUpdateLoadTimes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      times
    }: {
      id: string;
      times: Partial<{
        actual_loading_arrival: string;
        actual_loading_arrival_verified: boolean;
        actual_loading_arrival_source: 'auto' | 'manual';
        actual_loading_departure: string;
        actual_loading_departure_verified: boolean;
        actual_loading_departure_source: 'auto' | 'manual';
        actual_offloading_arrival: string;
        actual_offloading_arrival_verified: boolean;
        actual_offloading_arrival_source: 'auto' | 'manual';
        actual_offloading_departure: string;
        actual_offloading_departure_verified: boolean;
        actual_offloading_departure_source: 'auto' | 'manual';
      }>;
    }) => {
      const { data, error } = await supabase
        .from('loads')
        .update(times)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: 'Load times updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update load times', description: error.message, variant: 'destructive' });
    },
  });
}
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type LoadStatus = Database['public']['Enums']['load_status'];
type CargoType = Database['public']['Enums']['cargo_type'];
type PriorityLevel = Database['public']['Enums']['priority_level'];

export interface BackloadQuantities {
  bins: number;
  crates: number;
  pallets: number;
}

export interface BackloadInfo {
  enabled: boolean;
  destination: string; // Farm where backload goes (BV, CBC)
  cargoType: 'Packaging' | 'Fertilizer' | 'BV' | 'CBC';
  offloadingDate: string; // Date of backload delivery
  quantities?: BackloadQuantities;
  notes?: string;
}

export interface Load {
  id: string;
  load_id: string;
  priority: PriorityLevel;
  loading_date: string;
  offloading_date: string;
  time_window: string;
  origin: string;
  destination: string;
  cargo_type: CargoType;
  quantity: number;
  weight: number;
  special_handling: string[];
  fleet_vehicle_id: string | null;
  driver_id: string | null;
  co_driver_id: string | null;
  notes: string;
  status: LoadStatus;
  created_at: string;
  updated_at: string;
  // Actual geofence-triggered times
  actual_loading_arrival?: string | null;
  actual_loading_arrival_verified?: boolean;
  actual_loading_arrival_source?: 'auto' | 'manual';
  actual_loading_departure?: string | null;
  actual_loading_departure_verified?: boolean;
  actual_loading_departure_source?: 'auto' | 'manual';
  actual_offloading_arrival?: string | null;
  actual_offloading_arrival_verified?: boolean;
  actual_offloading_arrival_source?: 'auto' | 'manual';
  actual_offloading_departure?: string | null;
  actual_offloading_departure_verified?: boolean;
  actual_offloading_departure_source?: 'auto' | 'manual';
  // Joined data
  driver?: { id: string; name: string; contact: string } | null;
  fleet_vehicle?: { id: string; vehicle_id: string; type: string; telematics_asset_id?: string | null } | null;
}

// Helper to parse backload info from time_window
export function parseBackloadInfo(timeWindow: string): BackloadInfo | null {
  try {
    const data = JSON.parse(timeWindow);
    if (data.backload?.enabled) {
      return data.backload as BackloadInfo;
    }
    return null;
  } catch {
    return null;
  }
}

export interface LoadInsert {
  load_id: string;
  priority: PriorityLevel;
  loading_date: string;
  offloading_date: string;
  time_window: string;
  origin: string;
  destination: string;
  cargo_type: CargoType;
  quantity?: number;
  weight?: number;
  special_handling?: string[];
  fleet_vehicle_id?: string | null;
  driver_id?: string | null;
  co_driver_id?: string | null;
  notes?: string;
  status?: LoadStatus;
}

export function useLoads() {
  return useQuery({
    queryKey: ['loads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loads')
        .select(`
          *,
          driver:drivers!loads_driver_id_fkey(id, name, contact),
          fleet_vehicle:fleet_vehicles(id, vehicle_id, type, telematics_asset_id)
        `)
        .order('loading_date', { ascending: true });
      
      if (error) throw error;
      return data as unknown as Load[];
    },
  });
}

export function useCreateLoad() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (load: LoadInsert) => {
      const { data, error } = await supabase
        .from('loads')
        .insert(load)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: 'Load created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create load', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLoad() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Load> & { id: string }) => {
      const { data, error } = await supabase
        .from('loads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: 'Load updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update load', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLoad() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('loads')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: 'Load deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete load', description: error.message, variant: 'destructive' });
    },
  });
}

// Geofence event types
export type GeofenceEventType = 
  | 'loading_arrival'    // Truck entered loading geofence
  | 'loading_departure'  // Truck exited loading geofence - starts in-transit
  | 'offloading_arrival' // Truck entered offloading geofence
  | 'offloading_departure'; // Truck exited offloading geofence - delivery complete

// Hook for handling geofence-triggered load updates
export function useGeofenceLoadUpdate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      loadId, 
      eventType, 
      timestamp 
    }: { 
      loadId: string; 
      eventType: GeofenceEventType; 
      timestamp: Date;
    }) => {
      // Fetch current load to merge time_window JSON updates
      const { data: currentLoad, error: fetchError } = await supabase
        .from('loads')
        .select('id, time_window')
        .eq('id', loadId)
        .single();
      if (fetchError) throw fetchError;

      const updates: Record<string, unknown> = {};
      const isoTimestamp = timestamp.toISOString();
      // Prepare merged time_window JSON
      interface TimeWindowSection {
        plannedArrival?: string;
        plannedDeparture?: string;
        actualArrival?: string;
        actualDeparture?: string;
      }
      interface TimeWindowData {
        origin?: TimeWindowSection;
        destination?: TimeWindowSection;
        backload?: unknown;
      }
      let timeWindowData: TimeWindowData = {};
      try {
        const parsed = currentLoad?.time_window ? JSON.parse(currentLoad.time_window as unknown as string) : {};
        if (parsed && typeof parsed === 'object') {
          timeWindowData = parsed as TimeWindowData;
        }
      } catch {
        timeWindowData = {};
      }
      if (!timeWindowData.origin) timeWindowData.origin = {};
      if (!timeWindowData.destination) timeWindowData.destination = {};
      
      switch (eventType) {
        case 'loading_arrival':
          updates.actual_loading_arrival = isoTimestamp;
          updates.actual_loading_arrival_verified = true;
          updates.actual_loading_arrival_source = 'auto';
          timeWindowData.origin.actualArrival = isoTimestamp;
          // Status remains scheduled until departure
          break;
        case 'loading_departure':
          updates.actual_loading_departure = isoTimestamp;
          updates.actual_loading_departure_verified = true;
          updates.actual_loading_departure_source = 'auto';
          timeWindowData.origin.actualDeparture = isoTimestamp;
          updates.status = 'in-transit';
          break;
        case 'offloading_arrival':
          updates.actual_offloading_arrival = isoTimestamp;
          updates.actual_offloading_arrival_verified = true;
          updates.actual_offloading_arrival_source = 'auto';
          timeWindowData.destination.actualArrival = isoTimestamp;
          // Status still in-transit until departure
          break;
        case 'offloading_departure':
          updates.actual_offloading_departure = isoTimestamp;
          updates.actual_offloading_departure_verified = true;
          updates.actual_offloading_departure_source = 'auto';
          timeWindowData.destination.actualDeparture = isoTimestamp;
          updates.status = 'delivered';
          break;
      }

      updates.time_window = JSON.stringify(timeWindowData);
      
      const { data, error } = await supabase
        .from('loads')
        .update(updates)
        .eq('id', loadId)
        .select()
        .single();
      
      if (error) throw error;
      return { data, eventType };
    },
    onSuccess: ({ eventType }) => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      
      // Show appropriate toast based on event
      const messages: Record<GeofenceEventType, string> = {
        loading_arrival: '🚛 Truck arrived at loading point',
        loading_departure: '🚀 Load departed - now in transit',
        offloading_arrival: '📦 Truck arrived at destination',
        offloading_departure: '✅ Delivery completed',
      };
      
      toast({ 
        title: messages[eventType],
        description: `Time recorded: ${new Date().toLocaleTimeString()}`,
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update load status', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// Generate unique load ID with optional prefix for different load types
export function generateLoadId(prefix: string = 'LOAD'): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${prefix}-${year}-${random}`;
}
