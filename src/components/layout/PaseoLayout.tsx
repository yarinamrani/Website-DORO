import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, BarChart3, ChefHat, Bell } from 'lucide-react';
import CommandPalette from '../CommandPalette';

const navLinks = [
  { to: '/', label: 'דשבורד', icon: LayoutDashboard },
  { to: '/invoices', label: 'חשבוניות', icon: FileText },
  { to: '/suppliers', label: 'ספקים', icon: Users },
  { to: '/analytics', label: 'אנליטיקס', icon: BarChart3 },
];

export default function PaseoLayout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* ===== TOP NAVIGATION ===== */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="h-16 lg:h-[68px] flex items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/" className="no-underline flex items-center gap-3 group shrink-0">
              <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
                <ChefHat size={20} className="text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-black tracking-[0.1em] text-gray-900 leading-none">PASEO</h1>
                <span className="text-[10px] text-gray-400 tracking-wide mt-0.5 hidden sm:block">ניהול חשבוניות</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 rounded-2xl p-1.5">
              {navLinks.map(({ to, label, icon: Icon }) => {
                const active = pathname === to || (to !== '/' && pathname.startsWith(to));
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl no-underline text-[13px] font-semibold transition-colors duration-200 ${
                      active
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <CommandPalette />
              <button className="relative p-2.5 text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 cursor-pointer transition-colors duration-200 rounded-xl">
                <Bell size={17} />
                <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-teal-500 rounded-full" />
              </button>
              <div className="hidden lg:flex items-center gap-2.5 mr-1 pr-3 border-r border-gray-200">
                <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-sm font-bold">מ</span>
                </div>
                <div className="hidden xl:block">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">מנהל מערכת</p>
                  <p className="text-[11px] text-gray-400">PASEO Group</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== PAGE CONTENT ===== */}
      <main className="pb-24 md:pb-0">
        <Outlet />
      </main>

      {/* ===== MOBILE BOTTOM NAVIGATION ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around px-2 pt-2 pb-2">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl no-underline transition-colors duration-200 min-w-[60px] ${
                  active
                    ? 'text-teal-700'
                    : 'text-gray-400 hover:text-gray-500'
                }`}
              >
                <div className={`p-2 rounded-xl transition-colors duration-200 ${
                  active
                    ? 'bg-teal-50'
                    : ''
                }`}>
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.6} />
                </div>
                <span className={`text-[10px] ${active ? 'font-bold text-teal-700' : 'font-medium'}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
