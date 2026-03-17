import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Users, TrendingUp, AlertTriangle,
  Package, ArrowUpRight, ArrowDownRight, ShoppingBag,
} from 'lucide-react';
import { getDashboardAlerts, getDashboardStats, getPriceChanges } from '../lib/invoiceService';
import type { DashboardAlert, PriceChange } from '../types/invoices';

const alertIcons = {
  new_invoice: FileText,
  price_increase: TrendingUp,
  price_decrease: ArrowDownRight,
  new_product: Package,
};

const alertBgColors = {
  info: 'bg-blue-50 border-blue-200',
  warning: 'bg-amber-50 border-amber-200',
  success: 'bg-green-50 border-green-200',
};

const alertIconColors = {
  info: 'text-blue-500',
  warning: 'text-amber-500',
  success: 'text-green-500',
};

export default function InvoiceDashboard() {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [stats, setStats] = useState({
    totalSuppliers: 0, monthInvoices: 0, monthTotal: 0, priceAlerts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [alertDays, setAlertDays] = useState(7);

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
      <div className="min-h-screen bg-beige/30 flex items-center justify-center">
        <p className="text-text-secondary">טוען דשבורד...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-beige/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-text-primary mb-1">דשבורד חשבוניות</h1>
          <p className="text-text-secondary text-sm">סקירה כללית על הסחורה, חשבוניות ושינויי מחירים</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link to="/suppliers" className="no-underline">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users size={20} className="text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-text-primary">{stats.totalSuppliers}</p>
              <p className="text-sm text-text-secondary">ספקים</p>
            </div>
          </Link>

          <Link to="/invoices" className="no-underline">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText size={20} className="text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-text-primary">{stats.monthInvoices}</p>
              <p className="text-sm text-text-secondary">חשבוניות החודש</p>
            </div>
          </Link>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <ShoppingBag size={20} className="text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-text-primary">₪{stats.monthTotal.toLocaleString()}</p>
            <p className="text-sm text-text-secondary">סה״כ החודש</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-text-primary">{stats.priceAlerts}</p>
            <p className="text-sm text-text-secondary">העלאות מחיר</p>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_380px] gap-6">
          {/* Alerts Feed */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-primary">עדכונים אחרונים</h2>
              <select
                value={alertDays}
                onChange={e => setAlertDays(Number(e.target.value))}
                className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none"
                dir="rtl"
              >
                <option value={7}>7 ימים אחרונים</option>
                <option value={14}>14 ימים</option>
                <option value={30}>30 ימים</option>
                <option value={90}>90 ימים</option>
              </select>
            </div>

            {alerts.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                <p className="text-text-secondary">אין עדכונים בתקופה הנבחרת</p>
                <div className="flex gap-3 justify-center mt-4">
                  <Link to="/suppliers" className="text-pink-primary text-sm font-medium no-underline">
                    הוסף ספק
                  </Link>
                  <Link to="/invoices" className="text-pink-primary text-sm font-medium no-underline">
                    הזן חשבונית
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {alerts.map(alert => {
                  const Icon = alertIcons[alert.type];
                  return (
                    <div
                      key={alert.id}
                      className={`rounded-xl p-4 border ${alertBgColors[alert.severity]} flex items-start gap-3`}
                    >
                      <div className={`mt-0.5 ${alertIconColors[alert.severity]}`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary text-sm">{alert.title}</p>
                        <p className="text-text-secondary text-sm">{alert.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-text-secondary">{alert.supplier_name}</span>
                          <span className="text-xs text-text-secondary">·</span>
                          <span className="text-xs text-text-secondary">
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
            <h2 className="text-lg font-bold text-text-primary mb-4">שינויי מחירים (30 יום)</h2>
            {priceChanges.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
                <p className="text-text-secondary text-sm">אין שינויי מחירים</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {priceChanges.map(pc => {
                  const isUp = pc.price_change_percent > 0;
                  return (
                    <div key={pc.id} className="bg-white rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-text-primary truncate">{pc.product_name}</span>
                        <span className={`flex items-center gap-1 text-sm font-bold ${isUp ? 'text-red-500' : 'text-green-600'}`}>
                          {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {Math.abs(pc.price_change_percent).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <span>₪{pc.old_price}</span>
                        <span>←</span>
                        <span className={isUp ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                          ₪{pc.new_price}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">{pc.supplier?.name}</p>
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
