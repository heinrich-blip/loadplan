import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Load, useUpdateLoad } from '@/hooks/useLoads';
import { cn } from '@/lib/utils';
import { LoadStatus } from '@/types/load';
import { AlertCircle, CheckCircle2, Clock, Loader2, Truck } from 'lucide-react';
import { useState } from 'react';

interface StatusToggleProps {
  load: Load;
  compact?: boolean;
}

// Status flow: pending -> scheduled -> in-transit -> delivered
const statusOrder: LoadStatus[] = ['pending', 'scheduled', 'in-transit', 'delivered'];

const statusConfig: Record<LoadStatus, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  activeColor: string;
}> = {
  pending: {
    label: 'Pending',
    icon: AlertCircle,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-amber-300 dark:border-amber-700',
    activeColor: 'bg-amber-500',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Clock,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
    activeColor: 'bg-blue-500',
  },
  'in-transit': {
    label: 'In Transit',
    icon: Truck,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-purple-300 dark:border-purple-700',
    activeColor: 'bg-purple-500',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-green-300 dark:border-green-700',
    activeColor: 'bg-green-500',
  },
};

export function StatusToggle({ load, compact = false }: StatusToggleProps) {
  const updateLoad = useUpdateLoad();
  const [isUpdating, setIsUpdating] = useState(false);
  const currentStatusIndex = statusOrder.indexOf(load.status);

  const handleStatusChange = async (newStatus: LoadStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (newStatus === load.status || isUpdating) return;
    
    setIsUpdating(true);
    
    updateLoad.mutate({
      id: load.id,
      status: newStatus,
    }, {
      onSettled: () => {
        setIsUpdating(false);
      },
    });
  };

  const currentConfig = statusConfig[load.status];
  const CurrentIcon = currentConfig.icon;

  if (compact) {
    // Compact version - single toggle showing current status with click to advance
    const canAdvance = currentStatusIndex < statusOrder.length - 1;
    const nextStatus = canAdvance ? statusOrder[currentStatusIndex + 1] : null;
    const nextConfig = nextStatus ? statusConfig[nextStatus] : null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => nextStatus && handleStatusChange(nextStatus, e)}
              disabled={!canAdvance || isUpdating}
              className={cn(
                'group relative flex items-center gap-2 px-3 py-1.5 rounded-full',
                'border-2 transition-all duration-300 ease-out',
                currentConfig.bgColor,
                currentConfig.borderColor,
                canAdvance && !isUpdating && 'hover:scale-105 cursor-pointer',
                !canAdvance && 'cursor-default',
                isUpdating && 'opacity-70'
              )}
            >
              {isUpdating ? (
                <Loader2 className={cn('h-4 w-4 animate-spin', currentConfig.color)} />
              ) : (
                <CurrentIcon className={cn('h-4 w-4', currentConfig.color)} />
              )}
              <span className={cn('text-xs font-medium', currentConfig.color)}>
                {currentConfig.label}
              </span>
              {canAdvance && !isUpdating && (
                <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[8px] text-primary-foreground font-bold">→</span>
                </div>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {canAdvance ? (
              <span>Click to update to <strong>{nextConfig?.label}</strong></span>
            ) : (
              <span>Load delivered ✓</span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full version - pill toggle with all status options
  return (
    <TooltipProvider>
      <div 
        className="inline-flex items-center p-1 rounded-full bg-muted/50 border border-border/50 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {statusOrder.map((status, index) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          const isActive = status === load.status;
          const isPast = index < currentStatusIndex;
          const isNext = index === currentStatusIndex + 1;
          const isDisabled = isUpdating;

          return (
            <Tooltip key={status}>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => handleStatusChange(status, e)}
                  disabled={isDisabled}
                  className={cn(
                    'relative flex items-center justify-center rounded-full transition-all duration-300',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    isActive ? [
                      'px-3 py-1.5',
                      config.bgColor,
                      'border-2',
                      config.borderColor,
                      'shadow-md',
                    ] : [
                      'w-8 h-8',
                      'hover:bg-muted',
                      isPast && 'bg-muted/80',
                      isNext && 'ring-2 ring-primary/20',
                    ],
                    isDisabled && 'opacity-50 cursor-not-allowed',
                    !isDisabled && !isActive && 'cursor-pointer hover:scale-110',
                  )}
                >
                  {isUpdating && isActive ? (
                    <Loader2 className={cn('h-4 w-4 animate-spin', config.color)} />
                  ) : (
                    <Icon 
                      className={cn(
                        'h-4 w-4 transition-colors',
                        isActive ? config.color : 'text-muted-foreground',
                        isPast && 'text-muted-foreground/60',
                        isNext && !isActive && 'text-primary'
                      )} 
                    />
                  )}
                  {isActive && (
                    <span className={cn('ml-1.5 text-xs font-medium whitespace-nowrap', config.color)}>
                      {config.label}
                    </span>
                  )}
                  
                  {/* Progress indicator dot */}
                  {isPast && !isActive && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-500" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <span>
                  {isActive ? (
                    <>Current: <strong>{config.label}</strong></>
                  ) : (
                    <>Set to <strong>{config.label}</strong></>
                  )}
                </span>
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        {/* Progress line */}
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div className="h-0.5 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-full opacity-10" 
               style={{ width: `${(currentStatusIndex / (statusOrder.length - 1)) * 100}%` }} 
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

// Simple inline status stepper for row display
export function StatusStepper({ load, onRequestDelivered }: { load: Load; onRequestDelivered?: (load: Load) => void }) {
  const updateLoad = useUpdateLoad();
  const [isUpdating, setIsUpdating] = useState(false);
  const currentStatusIndex = statusOrder.indexOf(load.status);

  const handleStatusClick = async (newStatus: LoadStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (newStatus === load.status || isUpdating) return;
    // Intercept Delivered to require times via dialog if handler provided
    if (newStatus === 'delivered' && onRequestDelivered) {
      onRequestDelivered(load);
      return;
    }
    
    setIsUpdating(true);
    
    updateLoad.mutate({
      id: load.id,
      status: newStatus,
    }, {
      onSettled: () => {
        setIsUpdating(false);
      },
    });
  };

  return (
    <TooltipProvider>
      <div 
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {statusOrder.map((status, index) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          const isActive = status === load.status;
          const isPast = index < currentStatusIndex;
          const isClickable = !isUpdating;

          return (
            <Tooltip key={status}>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => handleStatusClick(status, e)}
                  disabled={!isClickable}
                  className={cn(
                    'relative flex items-center justify-center rounded-full transition-all duration-200',
                    isActive ? [
                      'w-auto px-2.5 py-1',
                      config.bgColor,
                      'border',
                      config.borderColor,
                    ] : [
                      'w-6 h-6',
                      isPast ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700' : 'bg-muted/50 border border-border/50',
                      isClickable && 'hover:scale-110 hover:bg-muted cursor-pointer',
                    ],
                    !isClickable && 'cursor-not-allowed opacity-60',
                  )}
                >
                  {isUpdating && isActive ? (
                    <Loader2 className={cn('h-3 w-3 animate-spin', config.color)} />
                  ) : isPast && !isActive ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                  ) : (
                    <Icon className={cn(
                      'h-3 w-3',
                      isActive ? config.color : 'text-muted-foreground'
                    )} />
                  )}
                  {isActive && (
                    <span className={cn('ml-1 text-[10px] font-medium', config.color)}>
                      {config.label}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {isActive ? config.label : `Set to ${config.label}`}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
