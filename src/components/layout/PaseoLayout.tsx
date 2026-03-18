import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, ChefHat, Bell, Settings } from 'lucide-react';

const navLinks = [
  { to: '/', label: 'דשבורד', icon: LayoutDashboard },
  { to: '/invoices', label: 'חשבוניות', icon: FileText },
  { to: '/suppliers', label: 'ספקים', icon: Users },
];

export default function PaseoLayout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-navy fixed top-0 right-0 bottom-0 z-40">
        {/* Logo */}
        <div className="p-6 pb-2">
          <Link to="/" className="no-underline flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              <ChefHat size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[18px] font-black tracking-[0.08em] text-white leading-none">PASEO</h1>
              <span className="text-[10px] text-text-muted tracking-wide mt-0.5">ניהול חשבוניות</span>
            </div>
          </Link>
        </div>

        {/* Restaurant selector */}
        <div className="mx-4 mt-4 mb-2 p-3 rounded-xl bg-navy-light border border-navy-lighter/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <span className="text-primary-light text-xs font-bold">גג</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">גג על הים</p>
              <p className="text-text-muted text-[11px]">PASEO Group</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-4">
          <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wider px-3 mb-2">תפריט ראשי</p>
          <div className="flex flex-col gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline text-[14px] font-medium transition-all duration-200 ${
                    active
                      ? 'bg-primary/15 text-primary-light'
                      : 'text-text-muted hover:text-white hover:bg-navy-light'
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                  <span>{label}</span>
                  {active && (
                    <div className="mr-auto w-1.5 h-1.5 rounded-full bg-primary-light" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-navy-lighter/30">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <span className="text-white text-sm font-bold">מ</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">מנהל מערכת</p>
              <p className="text-text-muted text-[11px]">admin@paseo.co.il</p>
            </div>
            <button className="p-1.5 text-text-muted hover:text-white bg-transparent border-none cursor-pointer transition-colors rounded-lg hover:bg-navy-light">
              <Settings size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 lg:mr-[260px] flex flex-col min-h-screen">
        {/* Top bar - mobile header + desktop top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border">
          <div className="px-4 lg:px-8 h-16 flex items-center justify-between">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2.5">
              <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center">
                <ChefHat size={16} className="text-white" />
              </div>
              <span className="text-base font-black tracking-wider text-navy">PASEO</span>
            </div>

            {/* Breadcrumb / page context on desktop */}
            <div className="hidden lg:block">
              <p className="text-text-muted text-sm">
                {pathname === '/' && 'סקירה כללית'}
                {pathname === '/invoices' && 'ניהול חשבוניות'}
                {pathname === '/suppliers' && 'ניהול ספקים'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button className="relative p-2.5 text-text-secondary hover:text-text-primary bg-transparent hover:bg-surface border-none cursor-pointer transition-all rounded-xl">
                <Bell size={18} />
                <span className="absolute top-2 left-2 w-2 h-2 bg-danger rounded-full border-2 border-white" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-border mobile-bottom-bar">
        <div className="flex items-center justify-around px-2 pt-2 pb-2">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl no-underline transition-all duration-200 min-w-[64px] ${
                  active
                    ? 'text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${active ? 'bg-primary-50' : ''}`}>
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
                </div>
                <span className={`text-[11px] ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
