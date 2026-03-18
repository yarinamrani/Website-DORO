import { useState, useEffect } from 'react';
import { Plus, FileText, Trash2, X, ChevronDown, Search, Filter, Hash, CalendarDays, Receipt } from 'lucide-react';
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
  received: 'bg-info-light text-info',
  checked: 'bg-success-light text-success',
  disputed: 'bg-danger-light text-danger',
  paid: 'bg-gray-100 text-text-secondary',
};

const statusDots: Record<InvoiceStatus, string> = {
  received: 'bg-info',
  checked: 'bg-success',
  disputed: 'bg-danger',
  paid: 'bg-gray-400',
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

  const statusCounts = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="px-4 lg:px-8 pt-6 lg:pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-[28px] font-extrabold text-text-primary tracking-tight">חשבוניות</h1>
            <p className="text-text-secondary text-sm mt-1">
              <span className="num-ltr" dir="ltr">{invoices.length}</span> חשבוניות סה״כ
              {filterStatus !== 'all' && (
                <span className="text-primary font-medium"> · מציג {filtered.length} תוצאות</span>
              )}
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl border-none cursor-pointer font-semibold text-sm transition-all shadow-sm shadow-primary/20 hover:shadow-primary/30"
          >
            <Plus size={18} />
            חשבונית חדשה
          </button>
        </div>
      </div>

      <div className="px-4 lg:px-8 pb-8">
        {/* Error */}
        {error && (
          <div className="bg-danger-light text-danger px-4 py-3 rounded-xl mb-4 text-sm border border-danger/15 flex items-center justify-between animate-slide-up">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
                <X size={12} />
              </div>
              <span className="font-medium">{error}</span>
            </div>
            <button onClick={() => setError('')} className="p-1.5 hover:bg-danger/10 rounded-lg bg-transparent border-none cursor-pointer text-danger transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-lg">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-border bg-white text-sm placeholder:text-text-muted transition-all"
              placeholder="חפש לפי מספר חשבונית או ספק..."
            />
          </div>
          <div className="flex items-center gap-1 bg-white border border-border rounded-xl p-1 overflow-x-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border-none cursor-pointer transition-all whitespace-nowrap ${
                filterStatus === 'all'
                  ? 'bg-navy text-white shadow-sm'
                  : 'bg-transparent text-text-secondary hover:bg-surface'
              }`}
            >
              <Filter size={13} />
              הכל
              <span className="text-[11px] opacity-70">({invoices.length})</span>
            </button>
            {(Object.keys(statusLabels) as InvoiceStatus[]).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border-none cursor-pointer transition-all whitespace-nowrap ${
                  filterStatus === st
                    ? 'bg-navy text-white shadow-sm'
                    : 'bg-transparent text-text-secondary hover:bg-surface'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${filterStatus === st ? 'bg-white/60' : statusDots[st]}`} />
                {statusLabels[st]}
                {statusCounts[st] ? (
                  <span className="text-[11px] opacity-70">({statusCounts[st]})</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice List */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-border-light">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl animate-shimmer" />
                  <div className="flex-1">
                    <div className="h-4 w-32 rounded-lg animate-shimmer mb-2" />
                    <div className="h-3 w-48 rounded-lg animate-shimmer" />
                  </div>
                  <div className="h-6 w-20 rounded-lg animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 animate-scale-in">
            <div className="w-24 h-24 bg-surface rounded-[28px] flex items-center justify-center mx-auto mb-6 border border-border-light">
              <Receipt size={40} className="text-text-muted" />
            </div>
            <p className="text-text-primary text-xl font-bold mb-2">
              {invoices.length === 0 ? 'אין חשבוניות עדיין' : 'לא נמצאו תוצאות'}
            </p>
            <p className="text-text-secondary text-sm mb-6 max-w-sm mx-auto">
              {invoices.length === 0
                ? 'הוסף את החשבונית הראשונה שלך כדי להתחיל לעקוב אחרי הוצאות'
                : 'נסה לשנות את מילות החיפוש או הסר פילטרים'}
            </p>
            {invoices.length === 0 && (
              <button
                onClick={openNew}
                className="bg-primary text-white px-6 py-3 rounded-xl border-none cursor-pointer font-semibold text-sm hover:bg-primary-dark transition-all shadow-sm shadow-primary/20"
              >
                <Plus size={16} className="inline ml-1.5 -mt-0.5" />
                חשבונית ראשונה
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 stagger-children">
            {filtered.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl border border-border-light overflow-hidden hover:border-border transition-all">
                {/* Invoice Row */}
                <div
                  className="p-4 lg:p-5 flex items-center gap-3 lg:gap-4 cursor-pointer hover:bg-surface/40 transition-colors"
                  onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center shrink-0 ${statusColors[inv.status].replace('text-', 'bg-').split(' ')[0]}`}>
                    <FileText size={18} className={statusColors[inv.status].split(' ')[1]} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="font-bold text-text-primary text-[15px]">
                        <span className="text-text-muted font-medium">#</span>{inv.invoice_number}
                      </span>
                      <span className={`status-badge ${statusColors[inv.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ml-1.5 ${statusDots[inv.status]}`} />
                        {statusLabels[inv.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-text-secondary">
                      <span className="font-medium">{inv.supplier?.name}</span>
                      <span className="text-text-muted">·</span>
                      <span className="num-ltr" dir="ltr">{new Date(inv.invoice_date).toLocaleDateString('he-IL')}</span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-left">
                    <span className="font-extrabold text-lg text-text-primary num-ltr" dir="ltr">
                      ₪{Number(inv.total_amount).toLocaleString()}
                    </span>
                  </div>

                  {/* Expand chevron */}
                  <div className={`text-text-muted transition-transform duration-200 ${expandedId === inv.id ? 'rotate-180' : ''}`}>
                    <ChevronDown size={18} />
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === inv.id && (
                  <div className="border-t border-border-light p-4 lg:p-5 bg-surface/30 animate-slide-up">
                    {/* Status actions */}
                    <div className="mb-4">
                      <p className="text-[12px] text-text-muted font-semibold mb-2.5 uppercase tracking-wide">עדכון סטטוס</p>
                      <div className="flex gap-2 flex-wrap">
                        {(Object.keys(statusLabels) as InvoiceStatus[]).map(st => (
                          <button
                            key={st}
                            onClick={() => handleStatusChange(inv.id, st)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold cursor-pointer transition-all border ${
                              inv.status === st
                                ? `${statusColors[st]} border-current/20 shadow-sm`
                                : 'bg-white text-text-secondary border-border hover:border-navy-lighter/30 hover:text-text-primary'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${inv.status === st ? statusDots[st] : 'bg-text-muted'}`} />
                            {statusLabels[st]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                      <div className="bg-white rounded-xl p-3 border border-border-light">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Hash size={12} className="text-text-muted" />
                          <span className="text-[11px] text-text-muted font-medium">מספר חשבונית</span>
                        </div>
                        <p className="text-sm font-bold text-text-primary num-ltr" dir="ltr">{inv.invoice_number}</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-border-light">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CalendarDays size={12} className="text-text-muted" />
                          <span className="text-[11px] text-text-muted font-medium">תאריך קבלה</span>
                        </div>
                        <p className="text-sm font-bold text-text-primary num-ltr" dir="ltr">{new Date(inv.received_date).toLocaleDateString('he-IL')}</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-border-light">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CalendarDays size={12} className="text-text-muted" />
                          <span className="text-[11px] text-text-muted font-medium">תאריך חשבונית</span>
                        </div>
                        <p className="text-sm font-bold text-text-primary num-ltr" dir="ltr">{new Date(inv.invoice_date).toLocaleDateString('he-IL')}</p>
                      </div>
                    </div>

                    {inv.notes && (
                      <div className="bg-white rounded-xl p-3.5 border border-border-light mb-4">
                        <p className="text-[12px] text-text-muted font-medium mb-1">הערות</p>
                        <p className="text-sm text-text-secondary leading-relaxed">{inv.notes}</p>
                      </div>
                    )}

                    {/* Delete action */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleDelete(inv.id, inv.invoice_number)}
                        className="flex items-center gap-1.5 px-3 py-2 text-danger hover:bg-danger-light bg-transparent border border-transparent hover:border-danger/15 rounded-xl cursor-pointer text-[13px] font-medium transition-all"
                      >
                        <Trash2 size={14} />
                        מחק חשבונית
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Invoice Modal */}
      {showForm && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-start lg:items-center justify-center p-4 pt-8 lg:pt-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-scale-in my-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-light">
              <div>
                <h2 className="text-lg font-bold text-text-primary">חשבונית חדשה</h2>
                <p className="text-text-muted text-[13px] mt-0.5">הזן את פרטי החשבונית</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2.5 bg-surface hover:bg-border-light rounded-xl border-none cursor-pointer text-text-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
              {/* Supplier + Invoice number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold mb-2 text-text-primary">ספק *</label>
                  <select
                    value={form.supplier_id}
                    onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm bg-white cursor-pointer transition-all"
                    dir="rtl"
                  >
                    <option value="">בחר ספק</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-2 text-text-primary">מספר חשבונית *</label>
                  <input
                    value={form.invoice_number}
                    onChange={e => setForm({ ...form, invoice_number: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm transition-all"
                    dir="ltr"
                    placeholder="INV-001"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold mb-2 text-text-primary">תאריך חשבונית</label>
                  <input
                    type="date"
                    value={form.invoice_date}
                    onChange={e => setForm({ ...form, invoice_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm transition-all"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-2 text-text-primary">תאריך קבלה</label>
                  <input
                    type="date"
                    value={form.received_date}
                    onChange={e => setForm({ ...form, received_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm transition-all"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[13px] font-bold text-text-primary">פריטים</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 text-primary text-[13px] font-semibold bg-transparent border-none cursor-pointer hover:text-primary-dark transition-colors"
                  >
                    <Plus size={14} />
                    הוסף פריט
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {form.items.map((item, i) => (
                    <div key={i} className="bg-surface rounded-xl p-4 border border-border-light">
                      <div className="grid grid-cols-[1fr_72px_96px_28px] gap-2.5 items-end">
                        <div>
                          <label className="block text-[11px] text-text-muted font-medium mb-1.5">שם מוצר *</label>
                          <input
                            value={item.product_name}
                            onChange={e => updateItem(i, 'product_name', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-border text-sm transition-all bg-white"
                            placeholder="שם המוצר"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-text-muted font-medium mb-1.5">כמות</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 rounded-lg border border-border text-sm text-center transition-all bg-white"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-text-muted font-medium mb-1.5">מחיר ₪</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price || ''}
                            onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg border border-border text-sm transition-all bg-white"
                            dir="ltr"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="p-1.5 text-text-muted hover:text-danger bg-transparent border-none cursor-pointer transition-colors rounded-lg hover:bg-white"
                          disabled={form.items.length <= 1}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                        <input
                          value={item.sku || ''}
                          onChange={e => updateItem(i, 'sku', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-border-light text-[12px] transition-all bg-white"
                          placeholder="מק״ט (אופציונלי)"
                          dir="ltr"
                        />
                        <input
                          value={item.category || ''}
                          onChange={e => updateItem(i, 'category', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-border-light text-[12px] transition-all bg-white"
                          placeholder="קטגוריה (אופציונלי)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-navy/[0.03] px-5 py-4 rounded-xl border border-navy/[0.06]">
                <span className="font-bold text-text-primary text-[15px]">סה״כ</span>
                <span className="font-extrabold text-2xl text-navy num-ltr" dir="ltr">₪{form.total_amount.toLocaleString()}</span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[13px] font-semibold mb-2 text-text-primary">הערות</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm resize-none transition-all"
                  rows={2}
                  placeholder="הערות נוספות..."
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full bg-primary text-white py-3.5 rounded-xl border-none cursor-pointer font-bold text-[15px] hover:bg-primary-dark transition-all shadow-sm shadow-primary/20"
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
