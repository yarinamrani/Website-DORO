import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Users, TrendingUp, AlertTriangle,
  Package, ArrowUpRight, ArrowDownRight, DollarSign,
  Plus, RefreshCw,
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
  info: { bg: 'bg-info-light border-info/20', icon: 'text-info', badge: 'bg-info/10 text-info' },
  warning: { bg: 'bg-warning-light border-warning/20', icon: 'text-warning', badge: 'bg-warning/10 text-warning' },
  success: { bg: 'bg-success-light border-success/20', icon: 'text-success', badge: 'bg-success/10 text-success' },
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
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={28} className="text-primary animate-spin" />
          <p className="text-text-secondary text-sm">טוען דשבורד...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { to: '/suppliers', label: 'ספקים פעילים', value: stats.totalSuppliers, icon: Users, color: 'bg-violet-500', bg: 'bg-violet-50' },
    { to: '/invoices', label: 'חשבוניות החודש', value: stats.monthInvoices, icon: FileText, color: 'bg-info', bg: 'bg-info-light' },
    { to: undefined, label: 'סה״כ החודש', value: `₪${stats.monthTotal.toLocaleString()}`, icon: DollarSign, color: 'bg-success', bg: 'bg-success-light' },
    { to: undefined, label: 'התראות מחיר', value: stats.priceAlerts, icon: AlertTriangle, color: stats.priceAlerts > 0 ? 'bg-warning' : 'bg-text-muted', bg: stats.priceAlerts > 0 ? 'bg-warning-light' : 'bg-gray-50' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-l from-primary to-primary-light">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">דשבורד</h1>
              <p className="text-blue-200 text-sm">סקירה כללית על חשבוניות, ספקים ושינויי מחירים</p>
            </div>
            <div className="flex gap-2">
              <Link to="/suppliers" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg no-underline text-sm font-medium transition-colors border border-white/20">
                <Users size={16} />
                ספקים
              </Link>
              <Link to="/invoices" className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-primary-dark px-4 py-2.5 rounded-lg no-underline text-sm font-bold transition-colors">
                <Plus size={16} />
                חשבונית חדשה
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-5">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map(({ to, label, value, icon: Icon, color, bg }) => {
            const card = (
              <div className={`${bg} rounded-2xl p-5 border border-border-light hover:shadow-md transition-all duration-200 cursor-pointer`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
                    <Icon size={18} className="text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-text-primary">{value}</p>
                <p className="text-sm text-text-secondary mt-0.5">{label}</p>
              </div>
            );
            return to ? (
              <Link key={label} to={to} className="no-underline">{card}</Link>
            ) : (
              <div key={label}>{card}</div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6 pb-8">
          {/* Alerts Feed */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-primary">עדכונים אחרונים</h2>
              <select
                value={alertDays}
                onChange={e => setAlertDays(Number(e.target.value))}
                className="bg-white border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                dir="rtl"
              >
                <option value={7}>7 ימים</option>
                <option value={14}>14 ימים</option>
                <option value={30}>30 ימים</option>
                <option value={90}>90 ימים</option>
              </select>
            </div>

            {alerts.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-border-light">
                <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText size={28} className="text-text-muted" />
                </div>
                <p className="text-text-secondary font-medium mb-1">אין עדכונים בתקופה הנבחרת</p>
                <p className="text-text-muted text-sm mb-5">התחל בהוספת ספקים וחשבוניות</p>
                <div className="flex gap-3 justify-center">
                  <Link to="/suppliers" className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium no-underline hover:bg-primary-light transition-colors">
                    הוסף ספק
                  </Link>
                  <Link to="/invoices" className="bg-white text-primary border border-primary px-5 py-2.5 rounded-lg text-sm font-medium no-underline hover:bg-blue-50 transition-colors">
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
                      className={`rounded-xl p-4 border ${style.bg} flex items-start gap-3 hover:shadow-sm transition-shadow`}
                    >
                      <div className={`w-9 h-9 rounded-lg ${style.badge} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-primary text-sm">{alert.title}</p>
                        <p className="text-text-secondary text-sm mt-0.5">{alert.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-white/80 px-2 py-0.5 rounded-full text-text-secondary border border-border-light">
                            {alert.supplier_name}
                          </span>
                          <span className="text-xs text-text-muted">
                            {new Date(alert.date).toLocaleDateString('he-IL')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Price Changes Sidebar */}
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-4">שינויי מחירים</h2>
            {priceChanges.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-border-light">
                <TrendingUp size={32} className="text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary text-sm">אין שינויי מחירים ב-30 הימים האחרונים</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {priceChanges.map(pc => {
                  const isUp = pc.price_change_percent > 0;
                  return (
                    <div key={pc.id} className="bg-white rounded-xl p-4 border border-border-light hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-text-primary truncate">{pc.product_name}</span>
                        <span className={`flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-full ${
                          isUp ? 'bg-danger-light text-danger' : 'bg-success-light text-success'
                        }`}>
                          {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                          {Math.abs(pc.price_change_percent).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-text-muted line-through">₪{pc.old_price}</span>
                        <span className="text-text-muted">→</span>
                        <span className={`font-bold ${isUp ? 'text-danger' : 'text-success'}`}>
                          ₪{pc.new_price}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1.5">{pc.supplier?.name}</p>
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
