import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3,
  RefreshCw, ArrowUpRight, ArrowDownRight, Minus,
  PieChart, Activity, AlertTriangle, Calendar,
} from 'lucide-react';
import {
  getMonthlySpending,
  getSupplierSpending,
  getSpendingComparison,
  getCategorySpending,
  getPriceVolatility,
} from '../lib/analyticsService';
import type {
  MonthlySpending,
  SupplierSpending,
  SpendingComparison,
  CategorySpending,
  PriceVolatilityScore,
} from '../types/analytics';

// ==================== SVG CHART COMPONENTS ====================

const CHART_COLORS = [
  '#1E3A5F', '#E8A838', '#059669', '#2563EB', '#DC2626',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1',
];

function BarChart({ data, height = 240 }: { data: MonthlySpending[]; height?: number }) {
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.total), 1);
  const barWidth = Math.max(20, Math.min(48, (600 - data.length * 4) / data.length));
  const chartWidth = data.length * (barWidth + 8) + 60;
  const chartHeight = height;
  const paddingBottom = 50;
  const paddingTop = 20;
  const paddingLeft = 55;
  const usableHeight = chartHeight - paddingBottom - paddingTop;

  // Grid lines
  const gridLines = 5;
  const gridStep = maxVal / gridLines;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full min-w-[400px]"
        style={{ maxHeight: `${height}px` }}
      >
        {/* Grid lines */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = paddingTop + usableHeight - (i * usableHeight / gridLines);
          const val = Math.round(gridStep * i);
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray={i === 0 ? '0' : '4,4'}
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-[#9CA3AF]"
                fontFamily="Heebo, sans-serif"
              >
                {val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = maxVal > 0 ? (d.total / maxVal) * usableHeight : 0;
          const x = paddingLeft + i * (barWidth + 8) + 4;
          const y = paddingTop + usableHeight - barH;
          const shortLabel = d.monthLabel.split(' ')[0].substring(0, 3);

          return (
            <g key={d.month}>
              {/* Bar with rounded top */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={4}
                fill={i === data.length - 1 ? '#E8A838' : '#1E3A5F'}
                opacity={i === data.length - 1 ? 1 : 0.7}
                className="transition-all duration-300 hover:opacity-100"
              />
              {/* Hover tooltip background */}
              {d.total > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  className="text-[9px] fill-[#6B7280] opacity-0 hover:opacity-100"
                  fontFamily="Heebo, sans-serif"
                >
                  {`₪${d.total.toLocaleString()}`}
                </text>
              )}
              {/* Month label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - 28}
                textAnchor="middle"
                className="text-[10px] fill-[#6B7280]"
                fontFamily="Heebo, sans-serif"
              >
                {shortLabel}
              </text>
              {/* Invoice count */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - 14}
                textAnchor="middle"
                className="text-[9px] fill-[#9CA3AF]"
                fontFamily="Heebo, sans-serif"
              >
                {d.invoiceCount > 0 ? `${d.invoiceCount} חש׳` : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const size = 180;
  const center = size / 2;
  const radius = 70;
  const innerRadius = 45;

  let currentAngle = -90; // Start from top

  const slices = data.map(d => {
    const angle = (d.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const ix1 = center + innerRadius * Math.cos(startRad);
    const iy1 = center + innerRadius * Math.sin(startRad);
    const ix2 = center + innerRadius * Math.cos(endRad);
    const iy2 = center + innerRadius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      'Z',
    ].join(' ');

    return { ...d, path };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <path
            key={i}
            d={s.path}
            fill={s.color}
            className="transition-all duration-300 hover:opacity-80"
            stroke="white"
            strokeWidth="2"
          />
        ))}
        {/* Center text */}
        <text x={center} y={center - 5} textAnchor="middle" className="text-[11px] fill-[#6B7280]" fontFamily="Heebo, sans-serif">
          סה״כ
        </text>
        <text x={center} y={center + 14} textAnchor="middle" className="text-[14px] fill-[#1A1A2E] font-bold" fontFamily="Heebo, sans-serif">
          ₪{total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total.toLocaleString()}
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-text-secondary truncate max-w-[120px]">{d.label}</span>
            <span className="text-text-muted text-xs mr-auto" dir="ltr">
              {((d.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// HorizontalBar used in supplier tab
function _HorizontalBar({
  label, value, maxValue, color, suffix = '',
}: { label: string; value: number; maxValue: number; color: string; suffix?: string }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-text-secondary truncate w-28 shrink-0 text-right">{label}</span>
      <div className="flex-1 bg-surface rounded-full h-6 overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
        />
        <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-text-primary" dir="ltr">
          {suffix === '₪'
            ? `₪${value.toLocaleString()}`
            : `${value.toFixed(1)}${suffix}`
          }
        </span>
      </div>
    </div>
  );
}
void _HorizontalBar;

function _SparkLine({ values, color = '#1E3A5F' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 80;
  const h = 24;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
void _SparkLine;

// ==================== VOLATILITY METER ====================

function VolatilityMeter({ score }: { score: number }) {
  const color = score > 70 ? '#DC2626' : score > 40 ? '#D97706' : '#059669';
  const label = score > 70 ? 'גבוה' : score > 40 ? 'בינוני' : 'נמוך';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-surface rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

// ==================== MAIN PAGE ====================

type Tab = 'overview' | 'suppliers' | 'volatility';

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [periodMonths, setPeriodMonths] = useState(6);

  const [monthly, setMonthly] = useState<MonthlySpending[]>([]);
  const [supplierSpend, setSupplierSpend] = useState<SupplierSpending[]>([]);
  const [comparison, setComparison] = useState<SpendingComparison | null>(null);
  const [categories, setCategories] = useState<CategorySpending[]>([]);
  const [volatility, setVolatility] = useState<PriceVolatilityScore[]>([]);

  useEffect(() => {
    loadData();
  }, [periodMonths]);

  async function loadData() {
    try {
      setLoading(true);
      const [m, s, c, cat, v] = await Promise.all([
        getMonthlySpending(periodMonths),
        getSupplierSpending(periodMonths),
        getSpendingComparison(),
        getCategorySpending(periodMonths),
        getPriceVolatility(),
      ]);
      setMonthly(m);
      setSupplierSpend(s);
      setComparison(c);
      setCategories(cat);
      setVolatility(v);
    } catch (e) {
      console.error('Error loading analytics:', e);
    } finally {
      setLoading(false);
    }
  }

  const totalSpend = useMemo(() => monthly.reduce((s, m) => s + m.total, 0), [monthly]);
  const avgMonthly = useMemo(() => {
    const nonZero = monthly.filter(m => m.total > 0);
    return nonZero.length > 0 ? totalSpend / nonZero.length : 0;
  }, [monthly, totalSpend]);
  const totalInvoices = useMemo(() => monthly.reduce((s, m) => s + m.invoiceCount, 0), [monthly]);

  const topSupplierData = useMemo(
    () => supplierSpend.slice(0, 8).map((s, i) => ({
      label: s.supplierName,
      value: s.total,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })),
    [supplierSpend],
  );

  const categoryData = useMemo(
    () => categories.slice(0, 8).map((c, i) => ({
      label: c.category,
      value: c.total,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })),
    [categories],
  );

  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: 'overview', label: 'סקירה כללית', icon: BarChart3 },
    { key: 'suppliers', label: 'ניתוח ספקים', icon: PieChart },
    { key: 'volatility', label: 'יציבות מחירים', icon: Activity },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={28} className="text-primary animate-spin" />
          <p className="text-text-secondary text-sm">טוען אנליטיקס...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <div className="bg-gradient-to-r from-primary to-primary-light">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">אנליטיקס הוצאות</h1>
              <p className="text-blue-200 text-sm">ניתוח מעמיק של הוצאות, ספקים ומגמות מחירים</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={periodMonths}
                onChange={e => setPeriodMonths(Number(e.target.value))}
                className="bg-white/10 border border-white/20 text-white rounded-lg px-4 py-2.5 text-sm outline-none backdrop-blur-sm cursor-pointer"
                dir="rtl"
              >
                <option value={3} className="text-text-primary">3 חודשים</option>
                <option value={6} className="text-text-primary">6 חודשים</option>
                <option value={12} className="text-text-primary">12 חודשים</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            label="סה״כ הוצאות"
            value={`₪${totalSpend.toLocaleString()}`}
            icon={DollarSign}
            color="bg-primary"
            bg="bg-white"
            sub={`${periodMonths} חודשים אחרונים`}
          />
          <SummaryCard
            label="ממוצע חודשי"
            value={`₪${Math.round(avgMonthly).toLocaleString()}`}
            icon={Calendar}
            color="bg-info"
            bg="bg-white"
            sub={`${totalInvoices} חשבוניות`}
          />
          {comparison && (
            <SummaryCard
              label={comparison.currentLabel}
              value={`₪${comparison.currentMonth.toLocaleString()}`}
              icon={comparison.changePercent >= 0 ? TrendingUp : TrendingDown}
              color={comparison.changePercent > 5 ? 'bg-danger' : comparison.changePercent < -5 ? 'bg-success' : 'bg-warning'}
              bg="bg-white"
              sub={
                comparison.previousMonth > 0
                  ? `${comparison.changePercent >= 0 ? '+' : ''}${comparison.changePercent.toFixed(1)}% מ${comparison.previousLabel}`
                  : 'אין נתונים להשוואה'
              }
              subColor={comparison.changePercent > 5 ? 'text-danger' : comparison.changePercent < -5 ? 'text-success' : 'text-warning'}
            />
          )}
          <SummaryCard
            label="ספקים פעילים"
            value={String(supplierSpend.length)}
            icon={Activity}
            color="bg-violet-500"
            bg="bg-white"
            sub={`${volatility.filter(v => v.score > 50).length} עם תנודתיות גבוהה`}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-border rounded-xl p-1 mb-6 w-fit">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-none cursor-pointer transition-all ${
                tab === key
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-transparent text-text-secondary hover:bg-surface'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pb-8">
          {tab === 'overview' && (
            <OverviewTab
              monthly={monthly}
              categoryData={categoryData}
              comparison={comparison}
            />
          )}
          {tab === 'suppliers' && (
            <SuppliersTab
              supplierSpend={supplierSpend}
              topSupplierData={topSupplierData}
              monthly={monthly}
            />
          )}
          {tab === 'volatility' && (
            <VolatilityTab volatility={volatility} />
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== SUMMARY CARD ====================

function SummaryCard({
  label, value, icon: Icon, color, bg, sub, subColor,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  color: string;
  bg: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-5 border border-border-light hover:shadow-md transition-all duration-200`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-sm text-text-secondary mt-0.5">{label}</p>
      {sub && (
        <p className={`text-xs mt-1 ${subColor || 'text-text-muted'}`}>{sub}</p>
      )}
    </div>
  );
}

// ==================== OVERVIEW TAB ====================

function OverviewTab({
  monthly,
  categoryData,
  comparison,
}: {
  monthly: MonthlySpending[];
  categoryData: { label: string; value: number; color: string }[];
  comparison: SpendingComparison | null;
}) {
  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6">
      {/* Monthly Spending Chart */}
      <div className="bg-white rounded-2xl p-6 border border-border-light">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-text-primary">הוצאות חודשיות</h3>
            <p className="text-sm text-text-secondary mt-0.5">סה״כ הוצאות לפי חודש</p>
          </div>
          <BarChart3 size={20} className="text-text-muted" />
        </div>
        {monthly.length > 0 ? (
          <BarChart data={monthly} />
        ) : (
          <EmptyState message="אין נתוני הוצאות" />
        )}
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-border-light">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-text-primary">פילוח לפי קטגוריה</h3>
            <p className="text-sm text-text-secondary mt-0.5">התפלגות הוצאות לפי סוג מוצר</p>
          </div>
          <PieChart size={20} className="text-text-muted" />
        </div>
        {categoryData.length > 0 ? (
          <DonutChart data={categoryData} />
        ) : (
          <EmptyState message="אין נתוני קטגוריות" />
        )}
      </div>

      {/* Month over Month */}
      {comparison && comparison.previousMonth > 0 && (
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-border-light">
          <h3 className="text-lg font-bold text-text-primary mb-5">השוואה חודש מול חודש</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <ComparisonBlock
              label={comparison.previousLabel}
              value={comparison.previousMonth}
              subLabel="חודש קודם"
            />
            <div className="flex items-center justify-center">
              <div className={`flex items-center gap-2 px-5 py-3 rounded-xl text-lg font-bold ${
                comparison.changePercent > 0
                  ? 'bg-danger-light text-danger'
                  : comparison.changePercent < 0
                    ? 'bg-success-light text-success'
                    : 'bg-surface text-text-secondary'
              }`}>
                {comparison.changePercent > 0 ? <ArrowUpRight size={20} /> :
                 comparison.changePercent < 0 ? <ArrowDownRight size={20} /> :
                 <Minus size={20} />}
                {comparison.changePercent > 0 ? '+' : ''}{comparison.changePercent.toFixed(1)}%
              </div>
            </div>
            <ComparisonBlock
              label={comparison.currentLabel}
              value={comparison.currentMonth}
              subLabel="חודש נוכחי"
              highlight
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ComparisonBlock({ label, value, subLabel, highlight }: {
  label: string; value: number; subLabel: string; highlight?: boolean;
}) {
  return (
    <div className={`text-center p-5 rounded-xl ${highlight ? 'bg-primary/5 border border-primary/10' : 'bg-surface border border-border-light'}`}>
      <p className="text-sm text-text-secondary mb-1">{subLabel}</p>
      <p className="text-sm font-medium text-text-primary mb-2">{label}</p>
      <p className={`text-3xl font-bold ${highlight ? 'text-primary' : 'text-text-primary'}`}>
        ₪{value.toLocaleString()}
      </p>
    </div>
  );
}

// ==================== SUPPLIERS TAB ====================

function SuppliersTab({
  supplierSpend,
  topSupplierData,
  monthly: _monthly,
}: {
  supplierSpend: SupplierSpending[];
  topSupplierData: { label: string; value: number; color: string }[];
  monthly: MonthlySpending[];
}) {
  const maxSpend = supplierSpend.length > 0 ? supplierSpend[0].total : 1;

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6">
      {/* Supplier Ranking */}
      <div className="bg-white rounded-2xl p-6 border border-border-light">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-text-primary">דירוג ספקים לפי הוצאה</h3>
            <p className="text-sm text-text-secondary mt-0.5">הספקים שעולים הכי הרבה</p>
          </div>
        </div>
        {supplierSpend.length > 0 ? (
          <div className="flex flex-col gap-4">
            {supplierSpend.slice(0, 10).map((s, i) => (
              <div key={s.supplierId}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted w-5 text-center">{i + 1}</span>
                    <span className="text-sm font-semibold text-text-primary">{s.supplierName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.trend !== 0 && (
                      <span className={`flex items-center gap-0.5 text-xs font-medium ${
                        s.trend > 0 ? 'text-danger' : 'text-success'
                      }`}>
                        {s.trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(s.trend).toFixed(0)}%
                      </span>
                    )}
                    <span className="text-sm font-bold text-text-primary">₪{s.total.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mr-7">
                  <div className="flex-1 bg-surface rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${(s.total / maxSpend) * 100}%`,
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="text-xs text-text-muted w-16 text-left" dir="ltr">
                    {s.percentOfTotal.toFixed(1)}% | {s.invoiceCount} חש׳
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="אין נתוני ספקים" />
        )}
      </div>

      {/* Donut + Stats */}
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-2xl p-6 border border-border-light">
          <h3 className="text-lg font-bold text-text-primary mb-5">חלוקת הוצאות</h3>
          {topSupplierData.length > 0 ? (
            <DonutChart data={topSupplierData} />
          ) : (
            <EmptyState message="אין נתונים" />
          )}
        </div>

        {/* Top Supplier Stats */}
        {supplierSpend.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-border-light">
            <h3 className="text-lg font-bold text-text-primary mb-4">סיכום</h3>
            <div className="flex flex-col gap-3">
              <StatRow
                label="ספק יקר ביותר"
                value={supplierSpend[0].supplierName}
                sub={`₪${supplierSpend[0].total.toLocaleString()}`}
              />
              <StatRow
                label="ממוצע לחשבונית"
                value={`₪${Math.round(
                  supplierSpend.reduce((s, sp) => s + sp.avgPerInvoice, 0) / supplierSpend.length
                ).toLocaleString()}`}
              />
              <StatRow
                label="ספקים פעילים"
                value={`${supplierSpend.length} ספקים`}
              />
              {supplierSpend.some(s => s.trend > 20) && (
                <div className="bg-warning-light border border-warning/20 rounded-lg p-3 flex items-center gap-2 mt-1">
                  <AlertTriangle size={14} className="text-warning shrink-0" />
                  <span className="text-xs text-warning font-medium">
                    {supplierSpend.filter(s => s.trend > 20).length} ספקים עם עלייה של מעל 20%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-light last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="text-left">
        <span className="text-sm font-bold text-text-primary">{value}</span>
        {sub && <p className="text-xs text-text-muted">{sub}</p>}
      </div>
    </div>
  );
}

// ==================== VOLATILITY TAB ====================

function VolatilityTab({ volatility }: { volatility: PriceVolatilityScore[] }) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Volatility Ranking */}
      <div className="bg-white rounded-2xl p-6 border border-border-light lg:col-span-2">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-text-primary">יציבות מחירים לפי ספק</h3>
            <p className="text-sm text-text-secondary mt-0.5">
              ספקים עם תנודתיות גבוהה מעלים מחירים לעיתים קרובות - כדאי לנהל מולם משא ומתן
            </p>
          </div>
          <Activity size={20} className="text-text-muted" />
        </div>

        {volatility.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-right py-3 px-3 text-text-secondary font-medium">ספק</th>
                  <th className="text-center py-3 px-3 text-text-secondary font-medium">תנודתיות</th>
                  <th className="text-center py-3 px-3 text-text-secondary font-medium">שינויים</th>
                  <th className="text-center py-3 px-3 text-text-secondary font-medium">העלאות</th>
                  <th className="text-center py-3 px-3 text-text-secondary font-medium">הורדות</th>
                  <th className="text-center py-3 px-3 text-text-secondary font-medium">ממוצע שינוי</th>
                  <th className="text-center py-3 px-3 text-text-secondary font-medium">שיא העלאה</th>
                </tr>
              </thead>
              <tbody>
                {volatility.map((v, i) => (
                  <tr
                    key={v.supplierId}
                    className={`border-b border-border-light last:border-0 hover:bg-surface/50 transition-colors ${
                      v.score > 70 ? 'bg-danger-light/30' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        >
                          {v.supplierName.charAt(0)}
                        </div>
                        <span className="font-semibold text-text-primary">{v.supplierName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <VolatilityMeter score={v.score} />
                    </td>
                    <td className="py-3 px-3 text-center text-text-primary font-medium">{v.totalChanges}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-danger font-medium">{v.increases}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-success font-medium">{v.decreases}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-medium text-text-primary">{v.avgChangePercent.toFixed(1)}%</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {v.maxIncrease > 0 ? (
                        <span className="text-danger font-bold">+{v.maxIncrease.toFixed(1)}%</span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="אין נתוני שינויי מחירים עדיין" />
        )}
      </div>

      {/* Insights Cards */}
      {volatility.length > 0 && (
        <>
          <div className="bg-white rounded-2xl p-6 border border-border-light">
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-danger" />
              ספקים לתשומת לב
            </h3>
            <div className="flex flex-col gap-3">
              {volatility.filter(v => v.score > 40).slice(0, 5).map(v => (
                <div key={v.supplierId} className="flex items-center justify-between p-3 bg-surface rounded-xl">
                  <div>
                    <p className="font-semibold text-sm text-text-primary">{v.supplierName}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {v.increases} העלאות מחיר, שיא +{v.maxIncrease.toFixed(1)}%
                    </p>
                  </div>
                  <VolatilityMeter score={v.score} />
                </div>
              ))}
              {volatility.filter(v => v.score > 40).length === 0 && (
                <p className="text-sm text-text-secondary text-center py-4">כל הספקים יציבים</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-border-light">
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <TrendingDown size={16} className="text-success" />
              ספקים יציבים
            </h3>
            <div className="flex flex-col gap-3">
              {volatility.filter(v => v.score <= 40).slice(0, 5).map(v => (
                <div key={v.supplierId} className="flex items-center justify-between p-3 bg-surface rounded-xl">
                  <div>
                    <p className="font-semibold text-sm text-text-primary">{v.supplierName}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {v.totalChanges} שינויים, ממוצע {v.avgChangePercent.toFixed(1)}%
                    </p>
                  </div>
                  <VolatilityMeter score={v.score} />
                </div>
              ))}
              {volatility.filter(v => v.score <= 40).length === 0 && (
                <p className="text-sm text-text-secondary text-center py-4">אין ספקים יציבים כרגע</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ==================== EMPTY STATE ====================

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center mb-3">
        <BarChart3 size={24} className="text-text-muted" />
      </div>
      <p className="text-text-secondary text-sm">{message}</p>
      <p className="text-text-muted text-xs mt-1">הוסף חשבוניות כדי לראות ניתוח מפורט</p>
    </div>
  );
}
