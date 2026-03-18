import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Users, TrendingUp, AlertTriangle,
  Package, ArrowUpRight, ArrowDownRight, DollarSign,
  Plus, RefreshCw, Calendar, BarChart3, Zap,
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
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center">
            <RefreshCw size={24} className="text-primary animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-text-secondary text-sm font-medium">טוען דשבורד...</p>
            <p className="text-text-muted text-xs mt-1">אנא המתן רגע</p>
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
      iconBg: 'bg-violet-50',
      trend: null,
    },
    {
      to: '/invoices',
      label: 'חשבוניות החודש',
      value: stats.monthInvoices,
      icon: FileText,
      color: 'text-info',
      iconBg: 'bg-info-light',
      trend: null,
    },
    {
      to: undefined,
      label: 'סה״כ החודש',
      value: `₪${stats.monthTotal.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-success',
      iconBg: 'bg-success-light',
      trend: null,
    },
    {
      to: undefined,
      label: 'התראות מחיר',
      value: stats.priceAlerts,
      icon: AlertTriangle,
      color: stats.priceAlerts > 0 ? 'text-warning' : 'text-text-muted',
      iconBg: stats.priceAlerts > 0 ? 'bg-warning-light' : 'bg-surface',
      trend: null,
    },
  ];

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'בוקר טוב' : now.getHours() < 17 ? 'צהריים טובים' : 'ערב טוב';

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="px-4 lg:px-8 pt-6 lg:pt-8 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-[28px] font-extrabold text-text-primary tracking-tight">
              {greeting} 👋
            </h1>
            <p className="text-text-secondary text-sm mt-1.5">
              הנה סקירה של הפעילות העסקית שלך
            </p>
          </div>
          <div className="flex gap-2.5">
            <Link
              to="/suppliers"
              className="flex items-center gap-2 bg-white hover:bg-surface text-text-secondary px-4 py-2.5 rounded-xl no-underline text-sm font-medium transition-all border border-border hover:border-navy-lighter/20 hover:text-text-primary"
            >
              <Users size={16} />
              <span className="hidden sm:inline">ספקים</span>
            </Link>
            <Link
              to="/invoices"
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl no-underline text-sm font-semibold transition-all shadow-sm shadow-primary/20 hover:shadow-primary/30"
            >
              <Plus size={16} />
              חשבונית חדשה
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8 stagger-children">
          {statCards.map(({ to, label, value, icon: Icon, color, iconBg }) => {
            const card = (
              <div className="bg-white rounded-2xl p-4 lg:p-5 border border-border-light card-hover cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 lg:w-11 lg:h-11 rounded-xl ${iconBg} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                    <Icon size={18} className={color} />
                  </div>
                  {to && (
                    <ArrowUpRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity -rotate-90" />
                  )}
                </div>
                <p className="text-2xl lg:text-[28px] font-extrabold text-text-primary tracking-tight num-ltr" dir="ltr">{value}</p>
                <p className="text-[13px] text-text-secondary mt-1 font-medium">{label}</p>
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

      {/* Content Grid */}
      <div className="px-4 lg:px-8 pb-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* Activity Feed */}
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-navy/5 flex items-center justify-center">
                  <Zap size={16} className="text-navy" />
                </div>
                <h2 className="text-[17px] font-bold text-text-primary">עדכונים אחרונים</h2>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-text-muted" />
                <select
                  value={alertDays}
                  onChange={e => setAlertDays(Number(e.target.value))}
                  className="bg-white border border-border rounded-lg px-3 py-1.5 text-sm text-text-secondary cursor-pointer hover:border-navy-lighter/40 transition-colors"
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
              <div className="bg-white rounded-2xl border border-border-light p-12 text-center">
                <div className="w-20 h-20 bg-surface rounded-3xl flex items-center justify-center mx-auto mb-5">
                  <FileText size={32} className="text-text-muted" />
                </div>
                <p className="text-text-primary text-lg font-bold mb-2">אין עדכונים בתקופה הנבחרת</p>
                <p className="text-text-secondary text-sm mb-6 max-w-xs mx-auto">
                  התחל בהוספת ספקים וחשבוניות כדי לראות את הפעילות כאן
                </p>
                <div className="flex gap-3 justify-center">
                  <Link
                    to="/suppliers"
                    className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold no-underline hover:bg-primary-dark transition-all shadow-sm shadow-primary/20"
                  >
                    הוסף ספק
                  </Link>
                  <Link
                    to="/invoices"
                    className="bg-white text-text-primary border border-border px-5 py-2.5 rounded-xl text-sm font-semibold no-underline hover:bg-surface hover:border-navy-lighter/30 transition-all"
                  >
                    הזן חשבונית
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 stagger-children">
                {alerts.map(alert => {
                  const Icon = alertIcons[alert.type];
                  const style = alertStyles[alert.severity];
                  return (
                    <div
                      key={alert.id}
                      className="bg-white rounded-xl p-4 border border-border-light hover:border-border transition-all group cursor-default"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl ${style.icon} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-text-primary text-[14px] leading-snug">{alert.title}</p>
                            <span className="text-[11px] text-text-muted whitespace-nowrap mt-0.5">
                              {new Date(alert.date).toLocaleDateString('he-IL')}
                            </span>
                          </div>
                          <p className="text-text-secondary text-[13px] mt-0.5 leading-relaxed">{alert.description}</p>
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] bg-surface px-2.5 py-1 rounded-lg text-text-secondary font-medium border border-border-light">
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
          <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-navy/5 flex items-center justify-center">
                <BarChart3 size={16} className="text-navy" />
              </div>
              <h2 className="text-[17px] font-bold text-text-primary">שינויי מחירים</h2>
            </div>

            {priceChanges.length === 0 ? (
              <div className="bg-white rounded-2xl border border-border-light p-10 text-center">
                <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp size={28} className="text-text-muted" />
                </div>
                <p className="text-text-primary font-bold mb-1">הכל יציב</p>
                <p className="text-text-secondary text-sm">
                  אין שינויי מחירים ב-30 הימים האחרונים
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 stagger-children">
                {priceChanges.map(pc => {
                  const isUp = pc.price_change_percent > 0;
                  return (
                    <div
                      key={pc.id}
                      className="bg-white rounded-xl p-4 border border-border-light hover:border-border transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="font-semibold text-[14px] text-text-primary truncate flex-1">{pc.product_name}</span>
                        <span className={`flex items-center gap-1 text-[13px] font-bold px-2.5 py-1 rounded-lg mr-2 ${
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
                      <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border-light">
                        <div className="w-5 h-5 rounded-md bg-surface flex items-center justify-center">
                          <span className="text-[10px] font-bold text-text-muted">{pc.supplier?.name?.charAt(0)}</span>
                        </div>
                        <p className="text-[12px] text-text-muted">{pc.supplier?.name}</p>
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
