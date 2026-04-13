import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth';
import { LogOut } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link
          to="/projects"
          className="flex items-center gap-2 font-display text-lg font-medium tracking-tight"
          data-testid="navbar-logo"
        >
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
          TaskFlow
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5">
              <Avatar name={user.name} size="sm" />
              <span className="text-sm text-foreground/80" data-testid="navbar-user-name">
                {user.name}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-button">
              <LogOut className="mr-1.5 h-4 w-4" />
              Log out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
