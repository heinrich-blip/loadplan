# LoadPlan - Copilot Instructions

## Project Overview
LoadPlan is a fleet management and logistics system for scheduling loads, tracking vehicles, and managing drivers. Built with React + Vite + TypeScript, backed by Supabase.

## Tech Stack & Path Aliases
- **Frontend**: React 18, TypeScript, Vite
- **UI**: shadcn/ui components (`src/components/ui/`), Tailwind CSS
- **State**: TanStack Query for server state, React Context for auth
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Path alias**: `@/` → `src/` (e.g., `import { Button } from "@/components/ui/button"`)

## Architecture Patterns

### Pages (`src/pages/`)
Pages wrap content with `MainLayout` and compose domain components:
```tsx
import { MainLayout } from "@/components/layout/MainLayout";
export default function LoadsPage() {
  return <MainLayout title="Loads"><LoadsTable /><CreateLoadDialog /></MainLayout>;
}
```

### Data Hooks (`src/hooks/`)
All data operations use TanStack Query with this consistent pattern:
```tsx
// Query hook - useXxx()
export function useLoads() {
  return useQuery({ queryKey: ['loads'], queryFn: async () => { /* supabase query */ } });
}

// Mutation hooks - useCreateXxx, useUpdateXxx, useDeleteXxx
export function useCreateLoad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (load: LoadInsert) => { /* supabase insert */ },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({ title: 'Load created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create load', description: error.message, variant: 'destructive' });
    },
  });
}
```

### Forms
Use react-hook-form + zod for validation:
```tsx
const formSchema = z.object({ priority: z.enum(['high', 'medium', 'low']), /* ... */ });
const form = useForm<FormData>({ resolver: zodResolver(formSchema), defaultValues: { /* ... */ } });
```

### Supabase Types
Types are auto-generated in `src/integrations/supabase/types.ts`. Reference database types:
```tsx
import { Database } from '@/integrations/supabase/types';
type LoadStatus = Database['public']['Enums']['load_status'];
```

## Domain Concepts

### Locations
- **Origins**: BV, CBC (farms/loading points)
- **Destinations**: Bulawayo Depot, Rezende Depot, Mutare Depot, export locations (Freshmark, Fresh Approach)
- Coordinates defined in `src/lib/depots.ts` with geofence radii

### Cargo Types
`VanSalesRetail | Retail | Vendor | RetailVendor | Fertilizer | BV | CBC | Packaging | Export`

### Load Status Flow
`scheduled` → `in-transit` → `delivered` (or `pending`)

### Backloads
Return trips carrying packaging/fertilizer back to farms. Stored as JSON in `time_window` field:
```tsx
const backloadInfo = parseBackloadInfo(load.time_window);
```

## Key Files
- `src/lib/depots.ts` - Fixed depot coordinates and geofences
- `src/lib/waypoints.ts` - Route waypoints from JSON data
- `src/lib/telematicsGuru.js` - Telematics API client (GPS tracking)
- `supabase/functions/telematics-proxy/` - Edge function for API proxying

## Commands
```bash
npm run dev      # Start dev server (port 8080)
npm run build    # Production build
npm run lint     # ESLint
```

## Component Conventions
- Dialog components: `CreateXxxDialog`, `EditXxxDialog` (controlled via `open`/`onOpenChange`)
- Tables: `XxxTable` with loading skeletons, action dropdowns
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes
- Toast notifications via `toast()` from `@/hooks/use-toast`

## Adding New Features
1. Add Supabase migration in `supabase/migrations/`
2. Create/update types in `src/integrations/supabase/types.ts` if needed
3. Create data hook in `src/hooks/useXxx.ts` following existing patterns
4. Create components in `src/components/{domain}/`
5. Add page in `src/pages/` with route in `src/App.tsx`
