import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { apiFetch, ApiError } from '@/lib/api';
import type { Task, TaskPriority, TaskStatus, User } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  task: Task | null;
  users: User[];
  onSaved: (task: Task) => void;
}

export function TaskDialog({ open, onOpenChange, projectId, task, users, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setAssigneeId(task.assignee_id || '');
      setDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
    } else {
      setTitle(''); setDescription(''); setStatus('todo'); setPriority('medium');
      setAssigneeId(''); setDueDate('');
    }
    setFieldErrors({});
    setError(null);
  }, [open, task]);

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    setFieldErrors(errs);
    setError(null);
    if (Object.keys(errs).length) return;

    const payload: Record<string, any> = {
      title,
      description: description || null,
      status,
      priority,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
    };

    setSubmitting(true);
    try {
      const saved = task
        ? await apiFetch<Task>(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : await apiFetch<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(payload) });
      onSaved(saved);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription>
            {task ? 'Update task details.' : 'Add a new task to this project.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={submitting} />
            {fieldErrors.title && <p className="text-sm text-destructive">{fieldErrors.title}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={submitting} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-status">Status</Label>
              <Select id="task-status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} disabled={submitting}>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} disabled={submitting}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Select id="task-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} disabled={submitting}>
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
              {fieldErrors.assignee_id && <p className="text-sm text-destructive">{fieldErrors.assignee_id}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={submitting}
              />
              {fieldErrors.due_date && <p className="text-sm text-destructive">{fieldErrors.due_date}</p>}
            </div>
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : task ? 'Save changes' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
