import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Users, TrendingUp, AlertTriangle,
  Package, ArrowUpRight, ArrowDownRight, DollarSign,
  Plus, RefreshCw, Calendar, BarChart3, Zap,
  ChevronLeft,
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
    bg: 'bg-blue-50',
    icon: 'bg-blue-50 text-blue-600',
    dot: 'bg-blue-500',
  },
  warning: {
    bg: 'bg-amber-50',
    icon: 'bg-amber-50 text-amber-600',
    dot: 'bg-amber-500',
  },
  success: {
    bg: 'bg-green-50',
    icon: 'bg-green-50 text-green-600',
    dot: 'bg-green-500',
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
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center">
            <RefreshCw size={24} className="text-teal-500 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-gray-800 text-base font-semibold">טוען דשבורד...</p>
            <p className="text-gray-400 text-sm mt-1">אנא המתן רגע</p>
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
      color: 'text-teal-600',
      iconBg: 'bg-teal-50',
      iconText: 'text-teal-600',
    },
    {
      to: '/invoices',
      label: 'חשבוניות החודש',
      value: stats.monthInvoices,
      icon: FileText,
      color: 'text-blue-600',
      iconBg: 'bg-blue-50',
      iconText: 'text-blue-600',
    },
    {
      to: undefined,
      label: 'סה״כ החודש',
      value: `₪${stats.monthTotal.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      iconBg: 'bg-green-50',
      iconText: 'text-green-600',
    },
    {
      to: undefined,
      label: 'התראות מחיר',
      value: stats.priceAlerts,
      icon: AlertTriangle,
      color: stats.priceAlerts > 0 ? 'text-amber-600' : 'text-gray-400',
      iconBg: stats.priceAlerts > 0 ? 'bg-amber-50' : 'bg-gray-100',
      iconText: stats.priceAlerts > 0 ? 'text-amber-600' : 'text-gray-400',
    },
  ];

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'בוקר טוב' : now.getHours() < 17 ? 'צהריים טובים' : 'ערב טוב';

  return (
    <div className="animate-fade-in">
      {/* ===== HEADER SECTION ===== */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-8 lg:pt-10 pb-8 lg:pb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <p className="text-sm text-teal-600 font-medium mb-1">סקירה כללית</p>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight leading-tight">
                {greeting}
              </h1>
              <p className="text-gray-500 text-base mt-1.5">
                הנה סקירה של הפעילות העסקית שלך
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/suppliers"
                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl no-underline text-sm font-medium transition-all duration-200 border border-gray-300"
              >
                <Users size={16} />
                <span className="hidden sm:inline">ספקים</span>
              </Link>
              <Link
                to="/invoices"
                className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-5 py-2.5 rounded-xl no-underline text-sm font-semibold transition-all duration-200"
              >
                <Plus size={16} />
                חשבונית חדשה
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===== STAT CARDS ===== */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-6 lg:mt-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
          {statCards.map(({ to, label, value, icon: Icon, iconBg, iconText }) => {
            const card = (
              <div className="bg-white rounded-2xl p-4 lg:p-6 border border-gray-200 hover:border-gray-300 transition-all duration-200 cursor-pointer group">
                <div className="flex items-center justify-between mb-4 lg:mb-5">
                  <div className={`w-11 h-11 lg:w-12 lg:h-12 rounded-xl ${iconBg} flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}>
                    <Icon size={20} className={iconText} />
                  </div>
                  {to && (
                    <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <ChevronLeft size={14} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <p className="text-2xl lg:text-[32px] font-bold text-gray-900 tracking-tight num-ltr leading-none" dir="ltr">{value}</p>
                <p className="text-[13px] text-gray-500 mt-2 font-medium">{label}</p>
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
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Zap size={18} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">עדכונים אחרונים</h2>
                  <p className="text-xs text-gray-400 mt-0.5">פעילות אחרונה במערכת</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-1.5">
                <Calendar size={14} className="text-teal-500" />
                <select
                  value={alertDays}
                  onChange={e => setAlertDays(Number(e.target.value))}
                  className="bg-transparent border-none text-sm text-gray-600 cursor-pointer font-medium outline-none"
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
              <div className="bg-white rounded-2xl border border-gray-200 p-14 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <FileText size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-900 text-lg font-bold mb-2">אין עדכונים בתקופה הנבחרת</p>
                <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
                  התחל בהוספת ספקים וחשבוניות כדי לראות את הפעילות כאן
                </p>
                <div className="flex gap-3 justify-center">
                  <Link
                    to="/suppliers"
                    className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-xl text-sm font-semibold no-underline transition-all duration-200"
                  >
                    הוסף ספק
                  </Link>
                  <Link
                    to="/invoices"
                    className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-xl text-sm font-semibold no-underline hover:bg-gray-50 transition-all duration-200"
                  >
                    הזן חשבונית
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {alerts.map(alert => {
                  const Icon = alertIcons[alert.type];
                  const style = alertStyles[alert.severity];
                  return (
                    <div
                      key={alert.id}
                      className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-200 hover:border-gray-300 transition-all duration-200 group cursor-default"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`w-10 h-10 rounded-xl ${style.icon} flex items-center justify-center shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-105`}>
                          <Icon size={17} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-gray-900 text-[14px] leading-snug">{alert.title}</p>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5 bg-gray-50 px-2 py-0.5 rounded-lg">
                              {new Date(alert.date).toLocaleDateString('he-IL')}
                            </span>
                          </div>
                          <p className="text-gray-500 text-[13px] mt-1 leading-relaxed">{alert.description}</p>
                          <div className="mt-2.5">
                            <span className="inline-flex items-center gap-1.5 text-[11px] bg-gray-50 px-3 py-1 rounded-full text-gray-500 font-medium border border-gray-200">
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
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <BarChart3 size={18} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">שינויי מחירים</h2>
                <p className="text-xs text-gray-400 mt-0.5">30 ימים אחרונים</p>
              </div>
            </div>

            {priceChanges.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <TrendingUp size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-900 font-bold text-lg mb-1.5">הכל יציב</p>
                <p className="text-gray-500 text-sm leading-relaxed">
                  אין שינויי מחירים ב-30 הימים האחרונים
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {priceChanges.map(pc => {
                  const isUp = pc.price_change_percent > 0;
                  return (
                    <div
                      key={pc.id}
                      className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-200 hover:border-gray-300 transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-[14px] text-gray-900 truncate flex-1">{pc.product_name}</span>
                        <span className={`flex items-center gap-1 text-[13px] font-bold px-3 py-1 rounded-full mr-2 ${
                          isUp ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                          <span dir="ltr">{Math.abs(pc.price_change_percent).toFixed(1)}%</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-400 line-through num-ltr" dir="ltr">₪{pc.old_price}</span>
                        <svg width="16" height="8" viewBox="0 0 16 8" className="text-gray-400 rotate-180">
                          <path d="M0 4h12M10 1l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className={`font-bold num-ltr ${isUp ? 'text-red-600' : 'text-green-600'}`} dir="ltr">
                          ₪{pc.new_price}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-gray-100">
                        <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-teal-700">{pc.supplier?.name?.charAt(0)}</span>
                        </div>
                        <p className="text-[12px] text-gray-400 font-medium">{pc.supplier?.name}</p>
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
