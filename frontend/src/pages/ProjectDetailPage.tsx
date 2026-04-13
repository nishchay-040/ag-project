import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge, PriorityChip } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { PageTransition } from '@/components/PageTransition';
import { apiFetch, ApiError } from '@/lib/api';
import type { ProjectWithTasks, Task, TaskStatus, User } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { TaskDialog } from '@/components/TaskDialog';
import { ArrowLeft, Plus, Trash2, Pencil, Calendar } from 'lucide-react';

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectWithTasks | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<'' | TaskStatus>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  async function loadProject() {
    if (!id) return;
    setLoadError(null);
    try {
      const p = await apiFetch<ProjectWithTasks>(`/projects/${id}`);
      setProject(p);
    } catch (err) {
      setLoadError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const r = await apiFetch<{ users: User[] }>('/users');
      setUsers(r.users);
    } catch { /* non-fatal */ }
  }

  useEffect(() => { loadProject(); loadUsers(); /* eslint-disable-next-line */ }, [id]);

  const filteredTasks = useMemo(() => {
    if (!project) return [];
    return project.tasks.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (assigneeFilter) {
        if (assigneeFilter === 'unassigned') return t.assignee_id === null;
        if (t.assignee_id !== assigneeFilter) return false;
      }
      return true;
    });
  }, [project, statusFilter, assigneeFilter]);

  const stats = useMemo(() => {
    if (!project) return { total: 0, todo: 0, in_progress: 0, done: 0 };
    return project.tasks.reduce(
      (acc, t) => { acc.total++; acc[t.status]++; return acc; },
      { total: 0, todo: 0, in_progress: 0, done: 0 } as Record<string, number>
    );
  }, [project]);

  const isOwner = !!(project && user && project.owner_id === user.id);

  async function handleStatusChange(task: Task, newStatus: TaskStatus) {
    if (!project) return;
    const prev = project;
    setProject({
      ...project,
      tasks: project.tasks.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)),
    });
    try {
      const updated = await apiFetch<Task>(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setProject((p) => p ? {
        ...p,
        tasks: p.tasks.map((t) => (t.id === task.id ? updated : t)),
      } : p);
    } catch (err) {
      setProject(prev);
      alert(`Failed to update task: ${(err as ApiError).message}`);
    }
  }

  async function handleDeleteTask(task: Task) {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    const prev = project;
    setProject((p) => p ? { ...p, tasks: p.tasks.filter((t) => t.id !== task.id) } : p);
    try {
      await apiFetch(`/tasks/${task.id}`, { method: 'DELETE' });
    } catch (err) {
      setProject(prev);
      alert(`Failed to delete task: ${(err as ApiError).message}`);
    }
  }

  async function handleDeleteProject() {
    if (!project) return;
    if (!confirm(`Delete project "${project.name}" and all its tasks?`)) return;
    try {
      await apiFetch(`/projects/${project.id}`, { method: 'DELETE' });
      navigate('/projects', { replace: true });
    } catch (err) {
      alert(`Failed to delete project: ${(err as ApiError).message}`);
    }
  }

  function openCreateTask() { setEditingTask(null); setTaskDialogOpen(true); }
  function openEditTask(t: Task) { setEditingTask(t); setTaskDialogOpen(true); }

  function upsertTask(task: Task) {
    setProject((p) => {
      if (!p) return p;
      const exists = p.tasks.find((t) => t.id === task.id);
      return {
        ...p,
        tasks: exists
          ? p.tasks.map((t) => (t.id === task.id ? task : t))
          : [...p.tasks, task],
      };
    });
  }

  if (loading) {
    return <div className="container py-16"><p className="text-muted-foreground">Loading…</p></div>;
  }
  if (loadError || !project) {
    return (
      <div className="container py-16">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-3">
          <Link to="/projects"><ArrowLeft className="mr-1.5 h-4 w-4" />All projects</Link>
        </Button>
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4 text-sm text-destructive">
          {loadError || 'Project not found'}
        </div>
      </div>
    );
  }

  const userById = new Map(users.map((u) => [u.id, u]));

  return (
    <PageTransition>
      <div className="container py-10 md:py-14">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-3" data-testid="back-to-projects">
          <Link to="/projects"><ArrowLeft className="mr-1.5 h-4 w-4" />All projects</Link>
        </Button>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Project</p>
            <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight" data-testid="project-title">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={openCreateTask} data-testid="create-task-button">
              <Plus className="mr-1.5 h-4 w-4" /> New task
            </Button>
            {isOwner && (
              <Button variant="destructive" onClick={handleDeleteProject} data-testid="delete-project-button">
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10" data-testid="project-stats">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="To do" value={stats.todo} tone="slate" />
          <StatCard label="In progress" value={stats.in_progress} tone="amber" />
          <StatCard label="Done" value={stats.done} tone="emerald" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Status</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
              data-testid="status-filter"
            >
              <option value="">All statuses</option>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </Select>
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Assignee</label>
            <Select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              data-testid="assignee-filter"
            >
              <option value="">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Tasks */}
        {filteredTasks.length === 0 ? (
          <div
            className="rounded-3xl border border-dashed border-border/70 p-14 text-center bg-white/60"
            data-testid="tasks-empty"
          >
            <p className="text-sm text-muted-foreground">
              {project.tasks.length === 0
                ? 'No tasks yet. Create the first one to get rolling.'
                : 'No tasks match the current filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="tasks-list">
            {filteredTasks.map((t, i) => {
              const assignee = t.assignee_id ? userById.get(t.assignee_id) : null;
              return (
                <motion.article
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut', delay: i * 0.03 }}
                  className="group rounded-2xl border border-border/40 bg-card p-5 md:p-6 shadow-soft
                             transition-all duration-300 ease-out hover:border-primary/20 hover:shadow-soft-lg"
                  data-testid={`task-row-${t.id}`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground truncate">{t.title}</h3>
                        <Badge variant={t.status} data-testid={`task-status-badge-${t.id}`}>
                          {STATUS_LABELS[t.status]}
                        </Badge>
                        <PriorityChip priority={t.priority} />
                      </div>
                      {t.description && (
                        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                          {t.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
                        <span className="inline-flex items-center gap-2">
                          <Avatar name={assignee?.name || null} size="sm" />
                          <span>{assignee?.name || 'Unassigned'}</span>
                        </span>
                        {t.due_date && (
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(t.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t, e.target.value as TaskStatus)}
                        className="h-9 w-[150px]"
                        data-testid={`task-status-select-${t.id}`}
                      >
                        {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditTask(t)}
                        aria-label="Edit task"
                        data-testid={`task-edit-${t.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(t)}
                        aria-label="Delete task"
                        data-testid={`task-delete-${t.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          projectId={project.id}
          task={editingTask}
          users={users}
          onSaved={upsertTask}
        />
      </div>
    </PageTransition>
  );
}

function StatCard({
  label, value, tone,
}: {
  label: string; value: number; tone?: 'slate' | 'amber' | 'emerald';
}) {
  const toneDot =
    tone === 'slate' ? 'bg-slate-300' :
    tone === 'amber' ? 'bg-amber-400' :
    tone === 'emerald' ? 'bg-emerald-400' :
    'bg-primary/60';
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${toneDot}`} />
        <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 font-display text-3xl font-medium tracking-tight">{value}</p>
    </div>
  );
}
