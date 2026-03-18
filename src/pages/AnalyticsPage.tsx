import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw, TrendingUp, TrendingDown, Calendar, Clock } from 'lucide-react';
import { getInvoices } from '../lib/gmailInvoiceService';
import type { GmailInvoice } from '../lib/gmailInvoiceService';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];


interface MonthlySpend {
  key: string;
  label: string;
  amount: number;
}

interface SupplierStat {
  name: string;
  count: number;
  total: number;
}

interface MissingAmountGroup {
  supplier: string;
  count: number;
  invoices: { invoice_number: string; date: string }[];
}

function computeAnalytics(invoices: GmailInvoice[]) {
  // --- Monthly spending (last 6 months) ---
  const monthMap = new Map<string, number>();
  for (const inv of invoices) {
    if (!inv.date || !inv.amount) continue;
    const d = new Date(inv.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, (monthMap.get(key) || 0) + inv.amount);
  }
  const allMonthKeys = Array.from(monthMap.keys()).sort();
  const last6Keys = allMonthKeys.slice(-6);
  const monthlySpending: MonthlySpend[] = last6Keys.map(key => {
    const [y, m] = key.split('-');
    return {
      key,
      label: `${HEBREW_MONTHS[parseInt(m) - 1]} ${y}`,
      amount: monthMap.get(key) || 0,
    };
  });

  // --- Supplier stats ---
  const supplierMap = new Map<string, SupplierStat>();
  for (const inv of invoices) {
    let s = supplierMap.get(inv.supplier);
    if (!s) {
      s = { name: inv.supplier, count: 0, total: 0 };
      supplierMap.set(inv.supplier, s);
    }
    s.count++;
    if (inv.amount) s.total += inv.amount;
  }
  const allSuppliers = Array.from(supplierMap.values());
  const topByCount = [...allSuppliers].sort((a, b) => b.count - a.count).slice(0, 10);
  const topByAmount = [...allSuppliers].sort((a, b) => b.total - a.total).slice(0, 10);

  // --- Month-over-month comparison ---
  const now = new Date();
  const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const curMonthTotal = monthMap.get(curKey) || 0;
  const prevMonthTotal = monthMap.get(prevKey) || 0;
  const momChange = prevMonthTotal > 0
    ? ((curMonthTotal - prevMonthTotal) / prevMonthTotal) * 100
    : 0;

  // --- Missing amounts grouped by supplier ---
  const missingMap = new Map<string, MissingAmountGroup>();
  for (const inv of invoices) {
    if (inv.amount) continue;
    let g = missingMap.get(inv.supplier);
    if (!g) {
      g = { supplier: inv.supplier, count: 0, invoices: [] };
      missingMap.set(inv.supplier, g);
    }
    g.count++;
    g.invoices.push({ invoice_number: inv.invoice_number, date: inv.date });
  }
  const missingAmounts = Array.from(missingMap.values()).sort((a, b) => b.count - a.count);
  const totalMissing = missingAmounts.reduce((sum, g) => sum + g.count, 0);

  // --- Supplier frequency: how often each supplier invoices (avg days between invoices) ---
  const supplierFrequency: { name: string; avgDays: number; count: number }[] = [];
  for (const [name, stat] of supplierMap) {
    if (stat.count < 2) continue;
    const dates = invoices
      .filter(i => i.supplier === name && i.date)
      .map(i => new Date(i.date).getTime())
      .sort();
    if (dates.length < 2) continue;
    const totalDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
    const avgDays = Math.round(totalDays / (dates.length - 1));
    supplierFrequency.push({ name, avgDays, count: stat.count });
  }
  supplierFrequency.sort((a, b) => a.avgDays - b.avgDays);

  // --- Recent 15 invoices ---
  const sorted = [...invoices].sort((a, b) => b.date.localeCompare(a.date));
  const recent15 = sorted.slice(0, 15);

  return {
    monthlySpending,
    topByCount,
    topByAmount,
    curMonthTotal,
    prevMonthTotal,
    momChange,
    curMonthLabel: HEBREW_MONTHS[now.getMonth()],
    prevMonthLabel: HEBREW_MONTHS[prevDate.getMonth()],
    missingAmounts,
    totalMissing,
    supplierFrequency,
    recent15,
  };
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReturnType<typeof computeAnalytics> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const invoices = await getInvoices();
        setData(computeAnalytics(invoices));
      } catch (e) {
        console.error('Error loading analytics:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={32} className="text-gray-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">טוען ניתוח נתונים...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    monthlySpending, topByCount, topByAmount,
    curMonthTotal, prevMonthTotal, momChange,
    curMonthLabel, prevMonthLabel,
    missingAmounts, totalMissing, supplierFrequency,
    recent15,
  } = data;

  const maxMonthly = Math.max(...monthlySpending.map(m => m.amount), 1);
  const maxCount = Math.max(...topByCount.map(s => s.count), 1);
  const maxAmount = Math.max(...topByAmount.map(s => s.total), 1);
  void 0; // unused

  const blueGradient = [
    'bg-blue-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700',
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowRight size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ניתוח נתונים</h1>
            <p className="text-gray-500 text-sm mt-0.5">תובנות וסטטיסטיקות חשבוניות</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Row 1: Monthly Spending + Month-over-Month */}
        <div className="grid md:grid-cols-[1fr_320px] gap-6">
          {/* Monthly Spending Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar size={20} className="text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">הוצאות חודשיות</h2>
            </div>
            <div className="space-y-3">
              {monthlySpending.map((m, i) => (
                <div key={m.key} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-28 shrink-0 text-left">{m.label}</span>
                  <div className="flex-1 relative h-8">
                    <div
                      className={`h-full rounded-lg ${blueGradient[i] || 'bg-blue-500'} transition-all duration-700 ease-out`}
                      style={{ width: `${Math.max((m.amount / maxMonthly) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-800 w-24 text-left" dir="ltr">
                    {m.amount.toLocaleString()} &#8362;
                  </span>
                </div>
              ))}
            </div>
            {monthlySpending.length === 0 && (
              <p className="text-gray-400 text-center py-8">אין נתוני הוצאות</p>
            )}
          </div>

          {/* Month-over-Month Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              {momChange > 0 ? <TrendingUp size={20} className="text-red-500" /> : <TrendingDown size={20} className="text-green-500" />}
              השוואה חודשית
            </h2>
            <div className="text-center space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">{curMonthLabel}</p>
                <p className="text-3xl font-bold text-gray-900">
                  {curMonthTotal.toLocaleString()} &#8362;
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 ${
                  momChange > 0
                    ? 'bg-red-100 text-red-700'
                    : momChange < 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                }`}>
                  {momChange > 0 ? <TrendingUp size={14} /> : momChange < 0 ? <TrendingDown size={14} /> : null}
                  {momChange > 0 ? '+' : ''}{momChange.toFixed(1)}%
                </div>
                <span className="text-xs text-gray-400">
                  {momChange > 0 ? 'עלייה' : momChange < 0 ? 'ירידה' : 'ללא שינוי'} ביחס ל{prevMonthLabel}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">{prevMonthLabel}</p>
                <p className="text-xl font-semibold text-gray-600">
                  {prevMonthTotal.toLocaleString()} &#8362;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Top Suppliers by Count + by Amount */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top 10 by Count */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">10 ספקים מובילים - לפי כמות חשבוניות</h2>
            <div className="space-y-2.5">
              {topByCount.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-purple-700 bg-purple-100 w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 w-36 shrink-0 truncate" title={s.name}>{s.name}</span>
                  <div className="flex-1 relative h-6">
                    <div
                      className="h-full rounded-md bg-purple-400 transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.max((s.count / maxCount) * 100, 4)}%`,
                        opacity: 1 - i * 0.06,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-8 text-left">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top 10 by Amount */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">10 ספקים מובילים - לפי סכום</h2>
            <div className="space-y-2.5">
              {topByAmount.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 w-36 shrink-0 truncate" title={s.name}>{s.name}</span>
                  <div className="flex-1 relative h-6">
                    <div
                      className="h-full rounded-md bg-emerald-400 transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.max((s.total / maxAmount) * 100, 4)}%`,
                        opacity: 1 - i * 0.06,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-20 text-left" dir="ltr">
                    {s.total.toLocaleString()} &#8362;
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Missing Amounts + Supplier Frequency */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Missing Amounts */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-orange-500" />
                <h2 className="text-lg font-bold text-gray-900">חשבוניות ללא סכום</h2>
              </div>
              <span className="text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                {totalMissing} חשבוניות
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">הסכום נמצא בקובץ PDF המצורף ולא בגוף המייל</p>
            {missingAmounts.length === 0 ? (
              <p className="text-gray-400 text-center py-4">כל החשבוניות כוללות סכום</p>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {missingAmounts.map(g => (
                  <div key={g.supplier} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm font-medium text-gray-900">{g.supplier}</span>
                    <span className="text-sm text-orange-600 font-bold bg-orange-50 px-2.5 py-0.5 rounded-full">
                      {g.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Supplier Frequency */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Calendar size={20} className="text-indigo-500" />
              <h2 className="text-lg font-bold text-gray-900">תדירות חשבוניות לפי ספק</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">ממוצע ימים בין חשבוניות - עוזר לזהות חשבוניות שלא הגיעו</p>
            {supplierFrequency.length === 0 ? (
              <p className="text-gray-400 text-center py-4">אין מספיק נתונים</p>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {supplierFrequency.map(s => (
                  <div key={s.name} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{s.name}</span>
                      <span className="text-xs text-gray-400">({s.count} חשבוניות)</span>
                    </div>
                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                      s.avgDays <= 7 ? 'bg-indigo-50 text-indigo-600' :
                      s.avgDays <= 14 ? 'bg-blue-50 text-blue-600' :
                      s.avgDays <= 30 ? 'bg-sky-50 text-sky-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      כל {s.avgDays} ימים
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 4: Recent Activity Timeline */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">פעילות אחרונה</h2>
          <div className="relative">
            <div className="absolute top-2 bottom-2 right-[7px] w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {recent15.map((inv, i) => (
                <div key={inv.id} className="flex gap-4 relative">
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-1 z-10 ${
                    i === 0 ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
                  }`} />
                  <div className="flex-1 pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{inv.supplier}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(inv.date).toLocaleDateString('he-IL')} &middot; {inv.doc_type}
                        </p>
                      </div>
                      {inv.amount && (
                        <span className="text-sm font-semibold text-gray-800 shrink-0" dir="ltr">
                          {inv.amount.toLocaleString()} &#8362;
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
