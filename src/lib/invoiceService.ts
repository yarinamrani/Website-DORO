import { supabase } from './supabase';
import type {
  Supplier, SupplierFormData,
  Invoice, InvoiceFormData, InvoiceStatus,
  InvoiceItemFormData,
  PriceChange, DashboardAlert,
} from '../types/invoices';

// ==================== SUPPLIERS ====================

export async function getSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function createSupplier(form: SupplierFormData): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert(form)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSupplier(id: string, form: SupplierFormData): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .update({ ...form, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ==================== INVOICES ====================

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, supplier:suppliers(id, name)')
    .order('invoice_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, supplier:suppliers(*), items:invoice_items(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createInvoice(form: InvoiceFormData): Promise<Invoice> {
  // Insert invoice
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .insert({
      supplier_id: form.supplier_id,
      invoice_number: form.invoice_number,
      invoice_date: form.invoice_date,
      received_date: form.received_date,
      total_amount: form.total_amount,
      status: form.status,
      notes: form.notes,
    })
    .select()
    .single();
  if (invError) throw invError;

  // Insert items
  if (form.items.length > 0) {
    const items = form.items.map(item => ({
      invoice_id: invoice.id,
      product_name: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unit_price,
      category: item.category,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(items);
    if (itemsError) throw itemsError;

    // Track price changes
    await trackPriceChanges(form.supplier_id, invoice.id, form.items);
  }

  return invoice;
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ==================== PRICE TRACKING ====================

async function trackPriceChanges(
  supplierId: string,
  invoiceId: string,
  items: InvoiceItemFormData[]
): Promise<void> {
  for (const item of items) {
    // Find the last recorded price for this product from this supplier
    const { data: lastPrice } = await supabase
      .from('price_history')
      .select('new_price')
      .eq('supplier_id', supplierId)
      .eq('product_name', item.product_name)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    const oldPrice = lastPrice?.new_price ?? null;
    const changePercent = oldPrice
      ? ((item.unit_price - oldPrice) / oldPrice) * 100
      : null;

    // Always record the price
    await supabase.from('price_history').insert({
      supplier_id: supplierId,
      product_name: item.product_name,
      sku: item.sku,
      old_price: oldPrice,
      new_price: item.unit_price,
      price_change_percent: changePercent,
      invoice_id: invoiceId,
    });
  }
}

export async function getPriceChanges(days: number = 30): Promise<PriceChange[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('price_history')
    .select('*, supplier:suppliers(id, name)')
    .not('old_price', 'is', null)
    .neq('price_change_percent', 0)
    .gte('recorded_at', since.toISOString())
    .order('recorded_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ==================== DASHBOARD ====================

export async function getDashboardAlerts(days: number = 7): Promise<DashboardAlert[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const alerts: DashboardAlert[] = [];

  // 1. Recent invoices
  const { data: recentInvoices } = await supabase
    .from('invoices')
    .select('*, supplier:suppliers(name)')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  for (const inv of recentInvoices || []) {
    alerts.push({
      id: `inv-${inv.id}`,
      type: 'new_invoice',
      title: `חשבונית חדשה #${inv.invoice_number}`,
      description: `סה״כ ₪${inv.total_amount}`,
      date: inv.created_at,
      supplier_name: inv.supplier?.name || '',
      severity: 'info',
    });
  }

  // 2. Price increases
  const { data: priceIncreases } = await supabase
    .from('price_history')
    .select('*, supplier:suppliers(name)')
    .not('old_price', 'is', null)
    .gt('price_change_percent', 0)
    .gte('recorded_at', since.toISOString())
    .order('price_change_percent', { ascending: false });

  for (const pc of priceIncreases || []) {
    alerts.push({
      id: `price-${pc.id}`,
      type: 'price_increase',
      title: `העלאת מחיר: ${pc.product_name}`,
      description: `₪${pc.old_price} → ₪${pc.new_price} (${pc.price_change_percent > 0 ? '+' : ''}${pc.price_change_percent.toFixed(1)}%)`,
      date: pc.recorded_at,
      supplier_name: pc.supplier?.name || '',
      severity: 'warning',
    });
  }

  // 3. Price decreases
  const { data: priceDecreases } = await supabase
    .from('price_history')
    .select('*, supplier:suppliers(name)')
    .not('old_price', 'is', null)
    .lt('price_change_percent', 0)
    .gte('recorded_at', since.toISOString())
    .order('price_change_percent', { ascending: true });

  for (const pc of priceDecreases || []) {
    alerts.push({
      id: `price-${pc.id}`,
      type: 'price_decrease',
      title: `הורדת מחיר: ${pc.product_name}`,
      description: `₪${pc.old_price} → ₪${pc.new_price} (${pc.price_change_percent.toFixed(1)}%)`,
      date: pc.recorded_at,
      supplier_name: pc.supplier?.name || '',
      severity: 'success',
    });
  }

  // 4. New products (first time appearing in price_history)
  const { data: newProducts } = await supabase
    .from('price_history')
    .select('*, supplier:suppliers(name)')
    .is('old_price', null)
    .gte('recorded_at', since.toISOString())
    .order('recorded_at', { ascending: false });

  for (const np of newProducts || []) {
    alerts.push({
      id: `new-${np.id}`,
      type: 'new_product',
      title: `מוצר חדש: ${np.product_name}`,
      description: `מחיר: ₪${np.new_price}`,
      date: np.recorded_at,
      supplier_name: np.supplier?.name || '',
      severity: 'info',
    });
  }

  // Sort by date descending
  alerts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return alerts;
}

export async function getDashboardStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [suppliersRes, monthInvRes, monthTotalRes, priceAlertsRes] = await Promise.all([
    supabase.from('suppliers').select('*', { count: 'exact', head: true }),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).gte('invoice_date', monthStart),
    supabase.from('invoices').select('total_amount').gte('invoice_date', monthStart),
    supabase.from('price_history').select('*', { count: 'exact', head: true })
      .not('old_price', 'is', null)
      .gt('price_change_percent', 0)
      .gte('recorded_at', monthStart),
  ]);

  if (suppliersRes.error) throw suppliersRes.error;
  if (monthInvRes.error) throw monthInvRes.error;
  if (monthTotalRes.error) throw monthTotalRes.error;
  if (priceAlertsRes.error) throw priceAlertsRes.error;

  const monthTotal = (monthTotalRes.data || []).reduce(
    (sum: number, inv: { total_amount: number }) => sum + Number(inv.total_amount), 0
  );

  return {
    totalSuppliers: suppliersRes.count || 0,
    monthInvoices: monthInvRes.count || 0,
    monthTotal,
    priceAlerts: priceAlertsRes.count || 0,
  };
}
