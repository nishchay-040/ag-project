import { cn } from '@/lib/utils';

// Soft pastel palette — deterministically picked from the name so the same user always gets the same color.
const PALETTE = [
  { bg: 'bg-emerald-50', fg: 'text-emerald-700' },
  { bg: 'bg-amber-50', fg: 'text-amber-700' },
  { bg: 'bg-sky-50', fg: 'text-sky-700' },
  { bg: 'bg-rose-50', fg: 'text-rose-700' },
  { bg: 'bg-violet-50', fg: 'text-violet-700' },
  { bg: 'bg-teal-50', fg: 'text-teal-700' },
  { bg: 'bg-orange-50', fg: 'text-orange-700' },
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { bg, fg } = PALETTE[hashStr(name || 'unknown') % PALETTE.length];
  const sizeCls =
    size === 'sm' ? 'h-7 w-7 text-[11px]' :
    size === 'lg' ? 'h-10 w-10 text-sm' :
    'h-8 w-8 text-xs';
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium select-none',
        bg, fg, sizeCls, className
      )}
      aria-label={name || 'User'}
    >
      {initials(name)}
    </span>
  );
}
