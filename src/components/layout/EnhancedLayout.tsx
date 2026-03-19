import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, BarChart3 } from 'lucide-react';
import CommandPalette from '../CommandPalette';

export default function EnhancedLayout() {
  const { pathname } = useLocation();

  const links = [
    { to: '/', label: 'דשבורד', icon: LayoutDashboard },
    { to: '/invoices', label: 'חשבוניות', icon: FileText },
    { to: '/suppliers', label: 'ספקים', icon: Users },
    { to: '/analytics', label: 'אנליטיקס', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-primary shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="no-underline flex items-center gap-3">
            <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-primary-dark font-black text-sm">P</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-wider text-white leading-none">PASEO</h1>
              <span className="text-[10px] text-blue-200 tracking-wide">ניהול חשבוניות וספקים</span>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            <CommandPalette />
            <div className="w-px h-6 bg-white/20 mx-1 hidden sm:block" />
            {links.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || (to !== '/' && pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg no-underline text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-blue-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
