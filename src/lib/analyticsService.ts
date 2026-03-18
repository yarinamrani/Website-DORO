import { supabase } from './supabase';
import type {
  MonthlySpending,
  SupplierSpending,
  MonthlySupplierSpending,
  SpendingComparison,
  CategorySpending,
  PriceVolatilityScore,
  SearchResult,
} from '../types/analytics';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  return `${HEBREW_MONTHS[parseInt(month) - 1]} ${year}`;
}

// ==================== MONTHLY SPENDING ====================

export async function getMonthlySpending(months: number = 12): Promise<MonthlySpending[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceStr = since.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_date, total_amount')
    .gte('invoice_date', sinceStr)
    .order('invoice_date', { ascending: true });

  if (error) throw error;

  const byMonth: Record<string, { total: number; count: number }> = {};

  for (const inv of data || []) {
    const month = inv.invoice_date.substring(0, 7); // "2026-01"
    if (!byMonth[month]) byMonth[month] = { total: 0, count: 0 };
    byMonth[month].total += Number(inv.total_amount);
    byMonth[month].count += 1;
  }

  // Fill in missing months
  const result: MonthlySpending[] = [];
  const cursor = new Date(since.getFullYear(), since.getMonth(), 1);
  const now = new Date();

  while (cursor <= now) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    result.push({
      month: key,
      monthLabel: formatMonthLabel(key),
      total: byMonth[key]?.total || 0,
      invoiceCount: byMonth[key]?.count || 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return result;
}

// ==================== SPENDING COMPARISON ====================

export async function getSpendingComparison(): Promise<SpendingComparison> {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];

  const [{ data: currentData }, { data: prevData }] = await Promise.all([
    supabase.from('invoices').select('total_amount').gte('invoice_date', currentStart),
    supabase.from('invoices').select('total_amount')
      .gte('invoice_date', prevStart)
      .lt('invoice_date', currentStart),
  ]);

  const currentTotal = (currentData || []).reduce((s, i) => s + Number(i.total_amount), 0);
  const prevTotal = (prevData || []).reduce((s, i) => s + Number(i.total_amount), 0);
  const changePercent = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

  return {
    currentMonth: currentTotal,
    previousMonth: prevTotal,
    changePercent,
    currentLabel: formatMonthLabel(currentMonth),
    previousLabel: formatMonthLabel(prevMonth.includes('-00')
      ? `${now.getFullYear() - 1}-12`
      : prevMonth),
  };
}

// ==================== SUPPLIER SPENDING ====================

export async function getSupplierSpending(months: number = 3): Promise<SupplierSpending[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceStr = since.toISOString().split('T')[0];

  const prevSince = new Date(since);
  prevSince.setMonth(prevSince.getMonth() - months);
  const prevSinceStr = prevSince.toISOString().split('T')[0];

  const [{ data: current }, { data: previous }, { data: suppliers }] = await Promise.all([
    supabase.from('invoices')
      .select('supplier_id, total_amount')
      .gte('invoice_date', sinceStr),
    supabase.from('invoices')
      .select('supplier_id, total_amount')
      .gte('invoice_date', prevSinceStr)
      .lt('invoice_date', sinceStr),
    supabase.from('suppliers').select('id, name'),
  ]);

  const supplierMap: Record<string, string> = {};
  for (const s of suppliers || []) supplierMap[s.id] = s.name;

  const currentBySupplier: Record<string, { total: number; count: number }> = {};
  const prevBySupplier: Record<string, number> = {};
  let grandTotal = 0;

  for (const inv of current || []) {
    if (!currentBySupplier[inv.supplier_id]) currentBySupplier[inv.supplier_id] = { total: 0, count: 0 };
    currentBySupplier[inv.supplier_id].total += Number(inv.total_amount);
    currentBySupplier[inv.supplier_id].count += 1;
    grandTotal += Number(inv.total_amount);
  }

  for (const inv of previous || []) {
    prevBySupplier[inv.supplier_id] = (prevBySupplier[inv.supplier_id] || 0) + Number(inv.total_amount);
  }

  const result: SupplierSpending[] = Object.entries(currentBySupplier)
    .map(([id, { total, count }]) => {
      const prev = prevBySupplier[id] || 0;
      return {
        supplierId: id,
        supplierName: supplierMap[id] || 'ספק לא ידוע',
        total,
        invoiceCount: count,
        avgPerInvoice: count > 0 ? total / count : 0,
        percentOfTotal: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
        trend: prev > 0 ? ((total - prev) / prev) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  return result;
}

// ==================== MONTHLY SUPPLIER BREAKDOWN ====================

export async function getMonthlySupplierSpending(months: number = 6): Promise<MonthlySupplierSpending[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceStr = since.toISOString().split('T')[0];

  const [{ data: invoices }, { data: suppliers }] = await Promise.all([
    supabase.from('invoices')
      .select('invoice_date, total_amount, supplier_id')
      .gte('invoice_date', sinceStr)
      .order('invoice_date', { ascending: true }),
    supabase.from('suppliers').select('id, name'),
  ]);

  const supplierMap: Record<string, string> = {};
  for (const s of suppliers || []) supplierMap[s.id] = s.name;

  const byMonth: Record<string, Record<string, number>> = {};

  for (const inv of invoices || []) {
    const month = inv.invoice_date.substring(0, 7);
    if (!byMonth[month]) byMonth[month] = {};
    const name = supplierMap[inv.supplier_id] || 'אחר';
    byMonth[month][name] = (byMonth[month][name] || 0) + Number(inv.total_amount);
  }

  const result: MonthlySupplierSpending[] = [];
  const cursor = new Date(since.getFullYear(), since.getMonth(), 1);
  const now = new Date();

  while (cursor <= now) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    result.push({
      month: key,
      monthLabel: formatMonthLabel(key),
      supplierTotals: byMonth[key] || {},
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return result;
}

// ==================== CATEGORY SPENDING ====================

export async function getCategorySpending(months: number = 3): Promise<CategorySpending[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceStr = since.toISOString().split('T')[0];

  // Get invoice IDs in range
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id')
    .gte('invoice_date', sinceStr);

  if (!invoices || invoices.length === 0) return [];

  const ids = invoices.map(i => i.id);

  const { data: items, error } = await supabase
    .from('invoice_items')
    .select('category, quantity, unit_price')
    .in('invoice_id', ids);

  if (error) throw error;

  const byCategory: Record<string, { total: number; count: number }> = {};
  let grandTotal = 0;

  for (const item of items || []) {
    const cat = item.category || 'ללא קטגוריה';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
    const itemTotal = Number(item.quantity) * Number(item.unit_price);
    byCategory[cat].total += itemTotal;
    byCategory[cat].count += 1;
    grandTotal += itemTotal;
  }

  return Object.entries(byCategory)
    .map(([category, { total, count }]) => ({
      category,
      total,
      itemCount: count,
      percentOfTotal: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

// ==================== PRICE VOLATILITY ====================

export async function getPriceVolatility(): Promise<PriceVolatilityScore[]> {
  const { data, error } = await supabase
    .from('price_history')
    .select('supplier_id, price_change_percent, old_price, supplier:suppliers(id, name)')
    .not('old_price', 'is', null)
    .neq('price_change_percent', 0);

  if (error) throw error;

  const bySupplier: Record<string, {
    name: string;
    changes: number[];
    increases: number;
    decreases: number;
  }> = {};

  for (const pc of data || []) {
    if (!bySupplier[pc.supplier_id]) {
      bySupplier[pc.supplier_id] = {
        name: (pc.supplier as unknown as { name: string } | null)?.name || 'ספק לא ידוע',
        changes: [],
        increases: 0,
        decreases: 0,
      };
    }
    const change = Number(pc.price_change_percent);
    bySupplier[pc.supplier_id].changes.push(change);
    if (change > 0) bySupplier[pc.supplier_id].increases++;
    else bySupplier[pc.supplier_id].decreases++;
  }

  return Object.entries(bySupplier)
    .map(([id, { name, changes, increases, decreases }]) => {
      const absChanges = changes.map(Math.abs);
      const avg = absChanges.reduce((s, c) => s + c, 0) / absChanges.length;
      const maxIncrease = Math.max(...changes, 0);
      // Score: weighted combination of frequency and magnitude
      const score = Math.min(100, Math.round(
        (changes.length * 10) + (avg * 5) + (maxIncrease * 2)
      ));

      return {
        supplierId: id,
        supplierName: name,
        totalChanges: changes.length,
        avgChangePercent: avg,
        maxIncrease,
        increases,
        decreases,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ==================== GLOBAL SEARCH ====================

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const results: SearchResult[] = [];

  const [{ data: invoices }, { data: suppliers }, { data: items }] = await Promise.all([
    supabase.from('invoices')
      .select('id, invoice_number, total_amount, invoice_date, status, supplier:suppliers(name)')
      .or(`invoice_number.ilike.%${query}%`)
      .limit(10),
    supabase.from('suppliers')
      .select('id, name, contact_name, phone')
      .or(`name.ilike.%${query}%,contact_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10),
    supabase.from('invoice_items')
      .select('id, product_name, unit_price, quantity, invoice_id')
      .ilike('product_name', `%${query}%`)
      .limit(10),
  ]);

  // Also search by amount if query is numeric
  if (/^\d+\.?\d*$/.test(query.trim())) {
    const amount = parseFloat(query.trim());
    const { data: amountInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, invoice_date, status, supplier:suppliers(name)')
      .gte('total_amount', amount - 1)
      .lte('total_amount', amount + 1)
      .limit(5);

    for (const inv of amountInvoices || []) {
      results.push({
        type: 'invoice',
        id: inv.id,
        title: `חשבונית #${inv.invoice_number}`,
        subtitle: `₪${Number(inv.total_amount).toLocaleString()} · ${(inv.supplier as unknown as { name: string } | null)?.name || ''}`,
        route: '/invoices',
        amount: Number(inv.total_amount),
        icon: 'invoice',
      });
    }
  }

  for (const inv of invoices || []) {
    if (results.find(r => r.id === inv.id)) continue;
    results.push({
      type: 'invoice',
      id: inv.id,
      title: `חשבונית #${inv.invoice_number}`,
      subtitle: `₪${Number(inv.total_amount).toLocaleString()} · ${(inv.supplier as unknown as { name: string } | null)?.name || ''} · ${new Date(inv.invoice_date).toLocaleDateString('he-IL')}`,
      route: '/invoices',
      amount: Number(inv.total_amount),
      icon: 'invoice',
    });
  }

  for (const s of suppliers || []) {
    results.push({
      type: 'supplier',
      id: s.id,
      title: s.name,
      subtitle: [s.contact_name, s.phone].filter(Boolean).join(' · ') || 'ספק',
      route: '/suppliers',
      icon: 'supplier',
    });
  }

  for (const item of items || []) {
    results.push({
      type: 'product',
      id: item.id,
      title: item.product_name,
      subtitle: `₪${Number(item.unit_price).toLocaleString()} × ${item.quantity}`,
      route: '/invoices',
      amount: Number(item.unit_price),
      icon: 'product',
    });
  }

  return results;
}
