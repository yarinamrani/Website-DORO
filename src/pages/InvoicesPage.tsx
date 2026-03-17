import { useState, useEffect } from 'react';
import { Plus, FileText, Trash2, X, ChevronDown, ChevronUp, RefreshCw, Search } from 'lucide-react';
import {
  getInvoices, getSuppliers, createInvoice,
  updateInvoiceStatus, deleteInvoice,
} from '../lib/invoiceService';
import type { Invoice, InvoiceFormData, InvoiceItemFormData, InvoiceStatus, Supplier } from '../types/invoices';

const statusLabels: Record<InvoiceStatus, string> = {
  received: 'התקבלה',
  checked: 'נבדקה',
  disputed: 'מחלוקת',
  paid: 'שולמה',
};

const statusColors: Record<InvoiceStatus, string> = {
  received: 'bg-info-light text-info border border-info/20',
  checked: 'bg-success-light text-success border border-success/20',
  disputed: 'bg-danger-light text-danger border border-danger/20',
  paid: 'bg-gray-100 text-text-secondary border border-border-light',
};

const emptyItem: InvoiceItemFormData = {
  product_name: '', sku: '', quantity: 1, unit_price: 0, category: '', notes: '',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<InvoiceFormData>({
    supplier_id: '', invoice_number: '', invoice_date: today,
    received_date: today, total_amount: 0, status: 'received', notes: '',
    items: [{ ...emptyItem }],
  });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      const [invs, sups] = await Promise.all([getInvoices(), getSuppliers()]);
      setInvoices(invs);
      setSuppliers(sups);
    } catch (e) {
      setError('שגיאה בטעינת נתונים');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm({
      supplier_id: suppliers[0]?.id || '',
      invoice_number: '', invoice_date: today, received_date: today,
      total_amount: 0, status: 'received', notes: '',
      items: [{ ...emptyItem }],
    });
    setShowForm(true);
  }

  function updateItem(index: number, field: keyof InvoiceItemFormData, value: string | number) {
    const updated = [...form.items];
    updated[index] = { ...updated[index], [field]: value };
    const total = updated.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);
    setForm({ ...form, items: updated, total_amount: total });
  }

  function addItem() {
    setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  }

  function removeItem(index: number) {
    if (form.items.length <= 1) return;
    const updated = form.items.filter((_, i) => i !== index);
    const total = updated.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);
    setForm({ ...form, items: updated, total_amount: total });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.supplier_id) { setError('בחר ספק'); return; }
    if (!form.invoice_number.trim()) { setError('מספר חשבונית הוא שדה חובה'); return; }
    if (form.items.some(it => !it.product_name.trim())) { setError('שם מוצר הוא שדה חובה בכל פריט'); return; }

    try {
      await createInvoice(form);
      setShowForm(false);
      setError('');
      await load();
    } catch (err) {
      setError('שגיאה בשמירת חשבונית');
      console.error(err);
    }
  }

  async function handleStatusChange(id: string, status: InvoiceStatus) {
    try {
      await updateInvoiceStatus(id, status);
      await load();
    } catch (err) {
      setError('שגיאה בעדכון סטטוס');
      console.error(err);
    }
  }

  async function handleDelete(id: string, num: string) {
    if (!confirm(`למחוק חשבונית #${num}?`)) return;
    try {
      await deleteInvoice(id);
      await load();
    } catch (err) {
      setError('שגיאה במחיקת חשבונית');
      console.error(err);
    }
  }

  const filtered = invoices.filter(inv => {
    const matchSearch = !searchTerm ||
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-border-light">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">חשבוניות</h1>
            <p className="text-text-secondary text-sm mt-0.5">{invoices.length} חשבוניות סה״כ</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl border-none cursor-pointer font-medium text-sm hover:bg-primary-light transition-colors shadow-sm"
          >
            <Plus size={18} />
            חשבונית חדשה
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="bg-danger-light text-danger px-4 py-3 rounded-xl mb-4 text-sm border border-danger/20 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="bg-transparent border-none cursor-pointer text-danger"><X size={16} /></button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="חפש לפי מספר חשבונית או ספק..."
            />
          </div>
          <div className="flex gap-1.5 bg-white border border-border rounded-xl p-1">
            {(['all', ...Object.keys(statusLabels)] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer transition-all ${
                  filterStatus === st
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-transparent text-text-secondary hover:bg-surface'
                }`}
              >
                {st === 'all' ? 'הכל' : statusLabels[st as InvoiceStatus]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-surface-warm rounded-3xl flex items-center justify-center mx-auto mb-5">
              <FileText size={36} className="text-text-muted" />
            </div>
            <p className="text-text-primary text-lg font-medium mb-2">
              {invoices.length === 0 ? 'אין חשבוניות עדיין' : 'לא נמצאו תוצאות'}
            </p>
            <p className="text-text-secondary text-sm mb-5">
              {invoices.length === 0 ? 'התחל בהוספת חשבונית ראשונה' : 'נסה לשנות את החיפוש או הפילטר'}
            </p>
            {invoices.length === 0 && (
              <button onClick={openNew} className="bg-primary text-white px-6 py-2.5 rounded-xl border-none cursor-pointer font-medium text-sm hover:bg-primary-light transition-colors">
                + חשבונית ראשונה
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl border border-border-light overflow-hidden hover:shadow-sm transition-shadow">
                <div
                  className="p-5 flex items-center gap-4 cursor-pointer hover:bg-surface/50 transition-colors"
                  onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-text-primary">#{inv.invoice_number}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusColors[inv.status]}`}>
                        {statusLabels[inv.status]}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {inv.supplier?.name} · {new Date(inv.invoice_date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <span className="font-bold text-lg text-text-primary">₪{Number(inv.total_amount).toLocaleString()}</span>
                  <div className="text-text-muted">
                    {expandedId === inv.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {expandedId === inv.id && (
                  <div className="border-t border-border-light p-5 bg-surface/30">
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {(Object.keys(statusLabels) as InvoiceStatus[]).map(st => (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(inv.id, st)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                            inv.status === st
                              ? statusColors[st]
                              : 'bg-white text-text-secondary border-border hover:border-primary hover:text-primary'
                          }`}
                        >
                          {statusLabels[st]}
                        </button>
                      ))}
                      <button
                        onClick={() => handleDelete(inv.id, inv.invoice_number)}
                        className="mr-auto flex items-center gap-1.5 px-3 py-1.5 text-danger hover:bg-danger-light bg-transparent border border-transparent hover:border-danger/20 rounded-lg cursor-pointer text-xs font-medium transition-all"
                      >
                        <Trash2 size={14} />
                        מחק
                      </button>
                    </div>
                    {inv.notes && (
                      <p className="text-sm text-text-secondary mb-3 bg-white px-4 py-2.5 rounded-lg border border-border-light">{inv.notes}</p>
                    )}
                    <p className="text-xs text-text-muted">
                      תאריך קבלה: {new Date(inv.received_date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Invoice Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border-light">
              <h2 className="text-lg font-bold text-text-primary">חשבונית חדשה</h2>
              <button onClick={() => setShowForm(false)} className="p-2 bg-surface hover:bg-border-light rounded-lg border-none cursor-pointer text-text-secondary transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-text-primary">ספק *</label>
                  <select
                    value={form.supplier_id}
                    onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm outline-none bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    dir="rtl"
                  >
                    <option value="">בחר ספק</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-text-primary">מספר חשבונית *</label>
                  <input
                    value={form.invoice_number}
                    onChange={e => setForm({ ...form, invoice_number: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-text-primary">תאריך חשבונית</label>
                  <input
                    type="date"
                    value={form.invoice_date}
                    onChange={e => setForm({ ...form, invoice_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-text-primary">תאריך קבלה</label>
                  <input
                    type="date"
                    value={form.received_date}
                    onChange={e => setForm({ ...form, received_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-text-primary">פריטים</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-primary text-sm font-semibold bg-transparent border-none cursor-pointer hover:text-primary-light transition-colors"
                  >
                    + הוסף פריט
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {form.items.map((item, i) => (
                    <div key={i} className="bg-surface rounded-xl p-4 border border-border-light">
                      <div className="grid grid-cols-[1fr_80px_100px_32px] gap-3 items-end">
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">שם מוצר *</label>
                          <input
                            value={item.product_name}
                            onChange={e => updateItem(i, 'product_name', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-border text-sm outline-none focus:border-primary transition-all"
                            placeholder="למשל: אוברול תינוק"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">כמות</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 rounded-lg border border-border text-sm outline-none text-center focus:border-primary transition-all"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">מחיר ₪</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price || ''}
                            onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg border border-border text-sm outline-none focus:border-primary transition-all"
                            dir="ltr"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="p-2 text-text-muted hover:text-danger bg-transparent border-none cursor-pointer transition-colors"
                          disabled={form.items.length <= 1}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <input
                          value={item.sku || ''}
                          onChange={e => updateItem(i, 'sku', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs outline-none focus:border-primary transition-all"
                          placeholder="מק״ט (אופציונלי)"
                          dir="ltr"
                        />
                        <input
                          value={item.category || ''}
                          onChange={e => updateItem(i, 'category', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs outline-none focus:border-primary transition-all"
                          placeholder="קטגוריה (אופציונלי)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-primary/5 px-5 py-4 rounded-xl border border-primary/10">
                <span className="font-bold text-primary">סה״כ</span>
                <span className="font-bold text-2xl text-primary">₪{form.total_amount.toLocaleString()}</span>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5 text-text-primary">הערות</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm outline-none resize-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  rows={2}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white py-3.5 rounded-xl border-none cursor-pointer font-bold text-base hover:bg-primary-light transition-colors shadow-sm"
              >
                שמור חשבונית
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
