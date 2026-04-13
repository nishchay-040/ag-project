import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/AuthLayout';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { User } from '@/lib/types';

export function LoginPage() {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (token) {
      const dest = (location.state as any)?.from?.pathname || '/projects';
      navigate(dest, { replace: true });
    }
  }, [token, location, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email is invalid';
    if (!password) e.password = 'Password is required';
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
      const res = await apiFetch<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(res.token, res.user);
      navigate('/projects', { replace: true });
    } catch (err) {
      const e = err as ApiError;
      if (e.fields) setFieldErrors(e.fields);
      setFormError(e.status === 401 ? 'Invalid email or password' : e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to TaskFlow"
      subtitle="Pick up where you left off — your projects and tasks are waiting."
    >
      <form onSubmit={onSubmit} className="space-y-6" noValidate data-testid="login-form">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
            data-testid="login-email-input"
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
            autoComplete="current-password"
            disabled={loading}
            data-testid="login-password-input"
          />
          {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
        </div>
        {formError && (
          <div
            className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-sm text-destructive"
            data-testid="login-error"
          >
            {formError}
          </div>
        )}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={loading}
          data-testid="login-submit-button"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-sm text-center text-muted-foreground">
          New here?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline" data-testid="link-register">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
