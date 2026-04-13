import * as React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'todo' | 'in_progress' | 'done'
  | 'low' | 'medium' | 'high';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-accent text-accent-foreground border-border/50',
  // status
  todo: 'bg-slate-50 text-slate-500 border-slate-100',
  in_progress: 'bg-amber-50 text-amber-600 border-amber-100',
  done: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  // priority — rendered as subtle rounded-md chips elsewhere; kept here for fallback
  low: 'bg-slate-50 text-slate-400 border-slate-100',
  medium: 'bg-blue-50 text-blue-500 border-blue-100',
  high: 'bg-orange-50 text-orange-500 border-orange-100',
};

export function Badge({
  variant = 'default',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export function PriorityChip({
  priority,
  className,
}: {
  priority: 'low' | 'medium' | 'high';
  className?: string;
}) {
  const map: Record<string, string> = {
    low: 'text-slate-400 bg-slate-50',
    medium: 'text-blue-500 bg-blue-50',
    high: 'text-orange-500 bg-orange-50',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize',
        map[priority],
        className
      )}
    >
      {priority}
    </span>
  );
}
