import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/AuthLayout';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { User } from '@/lib/types';

export function RegisterPage() {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (token) navigate('/projects', { replace: true });
  }, [token, navigate]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email is invalid';
    if (password.length < 8) e.password = 'Password must be at least 8 characters';
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      login(res.token, res.user);
      navigate('/projects', { replace: true });
    } catch (err) {
      const e = err as ApiError;
      if (e.fields) setFieldErrors(e.fields);
      else setFormError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your account"
      subtitle="Organize projects and tasks in a space that stays out of your way."
    >
      <form onSubmit={onSubmit} className="space-y-6" noValidate data-testid="register-form">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            data-testid="register-name-input"
          />
          {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
            data-testid="register-email-input"
          />
          {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
            data-testid="register-password-input"
          />
          {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
        </div>
        {formError && (
          <div
            className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-sm text-destructive"
            data-testid="register-error"
          >
            {formError}
          </div>
        )}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={loading}
          data-testid="register-submit-button"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="text-sm text-center text-muted-foreground">
          Already here?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline" data-testid="link-login">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
