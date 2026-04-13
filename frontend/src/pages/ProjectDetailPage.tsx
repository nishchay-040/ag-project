import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch, ApiError } from '@/lib/api';
import type { ProjectWithTasks, Task, TaskStatus, User } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { TaskDialog } from '@/components/TaskDialog';
import { ArrowLeft, Plus, Trash2, Pencil } from 'lucide-react';

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
    } catch {
      /* non-fatal */
    }
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

  const isOwner = !!(project && user && project.owner_id === user.id);

  async function handleStatusChange(task: Task, newStatus: TaskStatus) {
    if (!project) return;
    const prev = project;
    // Optimistic update
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
      // Revert
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

  function openCreateTask() {
    setEditingTask(null);
    setTaskDialogOpen(true);
  }
  function openEditTask(t: Task) {
    setEditingTask(t);
    setTaskDialogOpen(true);
  }

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

  if (loading) return <div className="container py-8"><p className="text-muted-foreground">Loading…</p></div>;
  if (loadError || !project) {
    return (
      <div className="container py-8">
        <Button asChild variant="outline" size="sm" className="mb-4">
          <Link to="/projects"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Link>
        </Button>
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {loadError || 'Project not found'}
        </div>
      </div>
    );
  }

  const userById = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="container py-8">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link to="/projects"><ArrowLeft className="mr-1.5 h-4 w-4" />All projects</Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {project.description && <p className="mt-1 text-muted-foreground">{project.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreateTask}>
            <Plus className="mr-1.5 h-4 w-4" /> New task
          </Button>
          {isOwner && (
            <Button variant="outline" onClick={handleDeleteProject}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete project
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}>
            <option value="">All statuses</option>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Assignee</label>
          <Select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {project.tasks.length === 0 ? 'No tasks yet. Create the first one.' : 'No tasks match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium truncate">{t.title}</h3>
                    <Badge variant={t.priority}>{t.priority}</Badge>
                  </div>
                  {t.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>{t.assignee_id ? userById.get(t.assignee_id)?.name || 'Assigned' : 'Unassigned'}</span>
                    {t.due_date && <span>Due {new Date(t.due_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={t.status}
                    onChange={(e) => handleStatusChange(t, e.target.value as TaskStatus)}
                    className="h-9 w-[140px]"
                  >
                    {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => openEditTask(t)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(t)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
  );
}
