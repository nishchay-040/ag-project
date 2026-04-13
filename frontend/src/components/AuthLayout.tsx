import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Form side */}
      <div className="flex items-center justify-center px-6 py-12 md:px-16 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-md space-y-8"
        >
          <div className="space-y-3">
            {eyebrow && (
              <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                {eyebrow}
              </p>
            )}
            <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </motion.div>
      </div>

      {/* Gradient side */}
      <div className="relative hidden lg:block overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" aria-hidden />
        <div className="relative h-full w-full flex flex-col justify-end p-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
            className="max-w-sm space-y-3"
          >
            <p className="text-xs font-medium tracking-widest uppercase text-foreground/60">
              TaskFlow
            </p>
            <p className="font-display text-2xl text-foreground/80 leading-snug">
              A calm, uncluttered space for the work that matters.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
