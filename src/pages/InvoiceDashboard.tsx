import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Users, TrendingUp, AlertTriangle,
  Package, ArrowUpRight, ArrowDownRight, DollarSign,
  Plus, RefreshCw, Calendar, BarChart3, Zap,
  Sparkles, ChevronLeft,
} from 'lucide-react';
import { getDashboardAlerts, getDashboardStats, getPriceChanges } from '../lib/invoiceService';
import type { DashboardAlert, PriceChange } from '../types/invoices';

const alertIcons = {
  new_invoice: FileText,
  price_increase: TrendingUp,
  price_decrease: ArrowDownRight,
  new_product: Package,
};

const alertStyles = {
  info: {
    bg: 'bg-info-light/60',
    icon: 'bg-info/10 text-info',
    dot: 'bg-info',
  },
  warning: {
    bg: 'bg-warning-light/60',
    icon: 'bg-warning/10 text-warning',
    dot: 'bg-warning',
  },
  success: {
    bg: 'bg-success-light/60',
    icon: 'bg-success/10 text-success',
    dot: 'bg-success',
  },
};

export default function InvoiceDashboard() {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [stats, setStats] = useState({
    totalSuppliers: 0, monthInvoices: 0, monthTotal: 0, priceAlerts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [alertDays, setAlertDays] = useState(30);

  useEffect(() => { loadData(); }, [alertDays]);

  async function loadData() {
    try {
      setLoading(true);
      const [a, s, pc] = await Promise.all([
        getDashboardAlerts(alertDays),
        getDashboardStats(),
        getPriceChanges(30),
      ]);
      setAlerts(a);
      setStats(s);
      setPriceChanges(pc);
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center shadow-lg shadow-purple-500/25 animate-float">
            <RefreshCw size={28} className="text-white animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-text-primary text-base font-bold">טוען דשבורד...</p>
            <p className="text-text-muted text-sm mt-1">אנא המתן רגע</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      to: '/suppliers',
      label: 'ספקים פעילים',
      value: stats.totalSuppliers,
      icon: Users,
      color: 'text-violet-600',
      iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
      iconText: 'text-white',
    },
    {
      to: '/invoices',
      label: 'חשבוניות החודש',
      value: stats.monthInvoices,
      icon: FileText,
      color: 'text-indigo-600',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-blue-600',
      iconText: 'text-white',
    },
    {
      to: undefined,
      label: 'סה״כ החודש',
      value: `₪${stats.monthTotal.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      iconText: 'text-white',
    },
    {
      to: undefined,
      label: 'התראות מחיר',
      value: stats.priceAlerts,
      icon: AlertTriangle,
      color: stats.priceAlerts > 0 ? 'text-amber-600' : 'text-text-muted',
      iconBg: stats.priceAlerts > 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gray-200',
      iconText: 'text-white',
    },
  ];

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'בוקר טוב' : now.getHours() < 17 ? 'צהריים טובים' : 'ערב טוב';

  return (
    <div className="animate-fade-in">
      {/* ===== GRADIENT HERO SECTION ===== */}
      <div className="relative gradient-hero overflow-hidden">
        {/* Decorative orbs */}
        <div className="gradient-orb w-96 h-96 bg-pink-400 -top-48 -left-48" />
        <div className="gradient-orb w-80 h-80 bg-purple-300 -bottom-40 right-10" />
        <div className="gradient-orb w-64 h-64 bg-violet-600 top-10 right-1/3 opacity-20" />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-10 lg:pt-14 pb-24 lg:pb-28">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white/90 text-xs font-medium px-3.5 py-1.5 rounded-full mb-4 border border-white/10">
                <Sparkles size={13} />
                <span>סקירה כללית</span>
              </div>
              <h1 className="text-3xl lg:text-[42px] font-extrabold text-white tracking-tight leading-tight">
                {greeting}
              </h1>
              <p className="text-white/70 text-base lg:text-lg mt-2 font-light">
                הנה סקירה של הפעילות העסקית שלך
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/suppliers"
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white px-5 py-2.5 rounded-xl no-underline text-sm font-medium transition-all duration-300 border border-white/15 hover:border-white/30"
              >
                <Users size={16} />
                <span className="hidden sm:inline">ספקים</span>
              </Link>
              <Link
                to="/invoices"
                className="flex items-center gap-2 gradient-accent text-white px-5 py-2.5 rounded-xl no-underline text-sm font-bold transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02]"
              >
                <Plus size={16} />
                חשבונית חדשה
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FLOATING STAT CARDS ===== */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 -mt-14 lg:-mt-16 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5 stagger-children">
          {statCards.map(({ to, label, value, icon: Icon, color, iconBg, iconText }) => {
            const card = (
              <div className="bg-white rounded-2xl p-4 lg:p-6 border border-white/80 shadow-xl shadow-purple-500/5 card-hover cursor-pointer group">
                <div className="flex items-center justify-between mb-4 lg:mb-5">
                  <div className={`w-11 h-11 lg:w-12 lg:h-12 rounded-xl ${iconBg} flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                    <Icon size={20} className={iconText} />
                  </div>
                  {to && (
                    <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <ChevronLeft size={14} className="text-text-muted" />
                    </div>
                  )}
                </div>
                <p className="text-2xl lg:text-[32px] font-extrabold text-text-primary tracking-tight num-ltr leading-none" dir="ltr">{value}</p>
                <p className="text-[13px] text-text-secondary mt-2 font-medium">{label}</p>
              </div>
            );
            return to ? (
              <Link key={label} to={to} className="no-underline">{card}</Link>
            ) : (
              <div key={label}>{card}</div>
            );
          })}
        </div>
      </div>

      {/* ===== CONTENT GRID ===== */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 lg:py-10">
        <div className="grid lg:grid-cols-[1fr_400px] gap-6 lg:gap-8">
          {/* Activity Feed */}
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-sm shadow-purple-500/20">
                  <Zap size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">עדכונים אחרונים</h2>
                  <p className="text-xs text-text-muted mt-0.5">פעילות אחרונה במערכת</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-xl border border-border-light px-3 py-1.5 shadow-sm">
                <Calendar size={14} className="text-primary" />
                <select
                  value={alertDays}
                  onChange={e => setAlertDays(Number(e.target.value))}
                  className="bg-transparent border-none text-sm text-text-secondary cursor-pointer font-medium outline-none"
                  dir="rtl"
                >
                  <option value={7}>7 ימים</option>
                  <option value={14}>14 ימים</option>
                  <option value={30}>30 ימים</option>
                  <option value={90}>90 ימים</option>
                </select>
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="bg-white rounded-[20px] border border-border-light p-14 text-center shadow-sm">
                <div className="w-24 h-24 gradient-subtle rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <FileText size={36} className="text-primary/40" />
                </div>
                <p className="text-text-primary text-xl font-bold mb-2">אין עדכונים בתקופה הנבחרת</p>
                <p className="text-text-secondary text-sm mb-8 max-w-xs mx-auto leading-relaxed">
                  התחל בהוספת ספקים וחשבוניות כדי לראות את הפעילות כאן
                </p>
                <div className="flex gap-3 justify-center">
                  <Link
                    to="/suppliers"
                    className="gradient-hero text-white px-6 py-3 rounded-xl text-sm font-bold no-underline hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-[1.02]"
                  >
                    הוסף ספק
                  </Link>
                  <Link
                    to="/invoices"
                    className="bg-white text-text-primary border border-border px-6 py-3 rounded-xl text-sm font-bold no-underline hover:bg-surface hover:border-primary/20 transition-all duration-300"
                  >
                    הזן חשבונית
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 stagger-children">
                {alerts.map(alert => {
                  const Icon = alertIcons[alert.type];
                  const style = alertStyles[alert.severity];
                  return (
                    <div
                      key={alert.id}
                      className="bg-white rounded-2xl p-4 lg:p-5 border border-border-light hover:border-primary/15 transition-all duration-300 group cursor-default shadow-sm hover:shadow-md hover:shadow-purple-500/5"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`w-10 h-10 rounded-xl ${style.icon} flex items-center justify-center shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110`}>
                          <Icon size={17} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-text-primary text-[14px] leading-snug">{alert.title}</p>
                            <span className="text-[11px] text-text-muted whitespace-nowrap mt-0.5 bg-surface px-2 py-0.5 rounded-lg">
                              {new Date(alert.date).toLocaleDateString('he-IL')}
                            </span>
                          </div>
                          <p className="text-text-secondary text-[13px] mt-1 leading-relaxed">{alert.description}</p>
                          <div className="mt-2.5">
                            <span className="inline-flex items-center gap-1.5 text-[11px] bg-surface/80 px-3 py-1 rounded-full text-text-secondary font-medium border border-border-light">
                              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                              {alert.supplier_name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Price Changes Panel */}
          <div className="animate-slide-up" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shadow-amber-500/20">
                <BarChart3 size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">שינויי מחירים</h2>
                <p className="text-xs text-text-muted mt-0.5">30 ימים אחרונים</p>
              </div>
            </div>

            {priceChanges.length === 0 ? (
              <div className="bg-white rounded-[20px] border border-border-light p-12 text-center shadow-sm">
                <div className="w-20 h-20 gradient-subtle rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <TrendingUp size={32} className="text-primary/40" />
                </div>
                <p className="text-text-primary font-bold text-lg mb-1.5">הכל יציב</p>
                <p className="text-text-secondary text-sm leading-relaxed">
                  אין שינויי מחירים ב-30 הימים האחרונים
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 stagger-children">
                {priceChanges.map(pc => {
                  const isUp = pc.price_change_percent > 0;
                  return (
                    <div
                      key={pc.id}
                      className="bg-white rounded-2xl p-4 lg:p-5 border border-border-light hover:border-primary/15 transition-all duration-300 group shadow-sm hover:shadow-md hover:shadow-purple-500/5"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-[14px] text-text-primary truncate flex-1">{pc.product_name}</span>
                        <span className={`flex items-center gap-1 text-[13px] font-bold px-3 py-1 rounded-full mr-2 ${
                          isUp ? 'bg-danger-light text-danger' : 'bg-success-light text-success'
                        }`}>
                          {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                          <span dir="ltr">{Math.abs(pc.price_change_percent).toFixed(1)}%</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-text-muted line-through num-ltr" dir="ltr">₪{pc.old_price}</span>
                        <svg width="16" height="8" viewBox="0 0 16 8" className="text-text-muted rotate-180">
                          <path d="M0 4h12M10 1l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className={`font-bold num-ltr ${isUp ? 'text-danger' : 'text-success'}`} dir="ltr">
                          ₪{pc.new_price}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-border-light">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-white">{pc.supplier?.name?.charAt(0)}</span>
                        </div>
                        <p className="text-[12px] text-text-muted font-medium">{pc.supplier?.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
