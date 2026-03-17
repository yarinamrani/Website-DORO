import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users } from 'lucide-react';

export default function PaseoLayout() {
  const { pathname } = useLocation();

  const links = [
    { to: '/invoices', label: 'דשבורד', icon: LayoutDashboard },
    { to: '/invoices/list', label: 'חשבוניות', icon: FileText },
    { to: '/invoices/suppliers', label: 'ספקים', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-beige/30">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/invoices" className="no-underline flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-wider text-text-primary" style={{ fontFamily: 'Heebo' }}>PASEO</h1>
            <span className="text-xs text-text-secondary bg-beige px-2 py-1 rounded-full">ניהול חשבוניות</span>
          </Link>
          <nav className="flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link key={to} to={to} className={`flex items-center gap-2 px-4 py-2 rounded-lg no-underline text-sm font-medium transition-colors ${active ? 'bg-amber-100 text-amber-800' : 'text-text-secondary hover:bg-gray-100 hover:text-text-primary'}`}>
                  <Icon size={16} />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
