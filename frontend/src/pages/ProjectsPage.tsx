import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { PageTransition } from '@/components/PageTransition';
import { apiFetch, ApiError } from '@/lib/api';
import type { Project } from '@/lib/types';
import { Plus, FolderOpen, ArrowUpRight } from 'lucide-react';

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoadError(null);
    try {
      const res = await apiFetch<{ projects: Project[] }>('/projects');
      setProjects(res.projects);
    } catch (err) {
      setLoadError((err as ApiError).message);
      setProjects([]);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <PageTransition>
      <div className="container py-10 md:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 md:mb-12">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Workspace</p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight">
              Projects
            </h1>
          </div>
          <Button onClick={() => setOpen(true)} data-testid="create-project-button">
            <Plus className="mr-1.5 h-4 w-4" /> New project
          </Button>
        </div>

        {loadError && (
          <div
            className="mb-6 rounded-2xl bg-destructive/5 border border-destructive/20 p-4 text-sm text-destructive"
            data-testid="projects-error"
          >
            {loadError}
          </div>
        )}

        {projects === null ? (
          <p className="text-muted-foreground" data-testid="projects-loading">Loading projects…</p>
        ) : projects.length === 0 ? (
          <EmptyState onCreate={() => setOpen(true)} />
        ) : (
          <div
            className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            data-testid="projects-grid"
          >
            {projects.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.04 }}
              >
                <Link
                  to={`/projects/${p.id}`}
                  className="group block h-full"
                  data-testid={`project-card-${p.id}`}
                >
                  <article
                    className="h-full rounded-2xl border border-border/40 bg-card p-6 md:p-8 shadow-soft
                               transition-all duration-300 ease-out
                               group-hover:-translate-y-1 group-hover:shadow-soft-lg group-hover:border-primary/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-xl font-medium tracking-tight text-foreground line-clamp-2">
                        {p.name}
                      </h3>
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground/60 transition-colors group-hover:text-primary" />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3 min-h-[2.75rem]">
                      {p.description || 'No description'}
                    </p>
                    <div className="mt-6 pt-6 border-t border-border/50 text-xs tracking-wide uppercase text-muted-foreground">
                      Created {new Date(p.created_at).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </div>
                  </article>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <CreateProjectDialog
          open={open}
          onOpenChange={setOpen}
          onCreated={(p) => setProjects((prev) => (prev ? [p, ...prev] : [p]))}
        />
      </div>
    </PageTransition>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="rounded-3xl border border-dashed border-border/70 p-16 text-center bg-white/60"
      data-testid="projects-empty"
    >
      <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent">
        <FolderOpen className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-display text-2xl font-medium tracking-tight">No projects yet</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
        Create your first project to start organizing tasks and inviting teammates.
      </p>
      <Button className="mt-6" onClick={onCreate} data-testid="empty-create-project-button">
        <Plus className="mr-1.5 h-4 w-4" /> Create project
      </Button>
    </div>
  );
}

function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (p: Project) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName(''); setDescription(''); setFieldErrors({}); setError(null);
    }
  }, [open]);

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    setFieldErrors(errs);
    setError(null);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      const p = await apiFetch<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({ name, description: description || undefined }),
      });
      onCreated(p);
      onOpenChange(false);
    } catch (err) {
      const e = err as ApiError;
      if (e.fields) setFieldErrors(e.fields);
      else setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="create-project-dialog">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Give your project a name. You can add tasks and teammates once it's created.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              data-testid="project-name-input"
            />
            {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              data-testid="project-description-input"
            />
          </div>
          {error && (
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} data-testid="project-submit-button">
              {submitting ? 'Creating…' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
