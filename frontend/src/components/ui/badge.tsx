import * as React from 'react';
import { cn } from '@/lib/utils';

const variantClasses: Record<string, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  todo: 'bg-slate-100 text-slate-700 border-slate-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  done: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-blue-100 text-blue-800 border-blue-200',
  high: 'bg-red-100 text-red-800 border-red-200',
};

export function Badge({
  variant = 'default',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variantClasses }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
