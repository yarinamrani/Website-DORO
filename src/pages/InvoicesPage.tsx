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
  received: 'bg-indigo-50 text-indigo-600',
  checked: 'bg-emerald-50 text-emerald-600',
  disputed: 'bg-rose-50 text-rose-600',
  paid: 'bg-gray-100 text-text-secondary',
};

const statusDots: Record<InvoiceStatus, string> = {
  received: 'bg-indigo-500',
  checked: 'bg-emerald-500',
  disputed: 'bg-rose-500',
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
      {/* ===== GRADIENT HERO HEADER ===== */}
      <div className="relative gradient-hero-dark overflow-hidden">
        <div className="gradient-orb w-80 h-80 bg-violet-600 -top-40 -right-20 opacity-30" />
        <div className="gradient-orb w-64 h-64 bg-pink-500 bottom-0 left-1/4 opacity-20" />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-10 lg:pt-12 pb-20 lg:pb-24">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/80 text-xs font-medium px-3.5 py-1.5 rounded-full mb-3 border border-white/10">
                <FileText size={13} />
                <span>ניהול חשבוניות</span>
              </div>
              <h1 className="text-3xl lg:text-[38px] font-extrabold text-white tracking-tight">חשבוניות</h1>
              <p className="text-white/50 text-sm mt-2">
                <span className="num-ltr" dir="ltr">{invoices.length}</span> חשבוניות סה״כ
                {filterStatus !== 'all' && (
                  <span className="text-amber-400 font-medium"> · מציג {filtered.length} תוצאות</span>
                )}
              </p>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 gradient-accent text-white px-6 py-3 rounded-xl border-none cursor-pointer font-bold text-sm transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02]"
            >
              <Plus size={18} />
              חשבונית חדשה
            </button>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT (floating over hero) ===== */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 -mt-10 relative z-10 pb-8">
        {/* Error */}
        {error && (
          <div className="bg-rose-50 text-rose-600 px-5 py-3.5 rounded-2xl mb-5 text-sm border border-rose-200 flex items-center justify-between animate-slide-up shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <X size={13} />
              </div>
              <span className="font-semibold">{error}</span>
            </div>
            <button onClick={() => setError('')} className="p-2 hover:bg-rose-100 rounded-xl bg-transparent border-none cursor-pointer text-rose-500 transition-colors">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Filters Bar - floating white card */}
        <div className="bg-white rounded-2xl p-3 lg:p-4 border border-border-light shadow-xl shadow-purple-500/5 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-lg">
              <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-11 pl-4 py-2.5 rounded-xl border border-border-light bg-surface/50 text-sm placeholder:text-text-muted transition-all focus:bg-white"
                placeholder="חפש לפי מספר חשבונית או ספק..."
              />
            </div>
            <div className="flex items-center gap-1 bg-surface/50 border border-border-light rounded-xl p-1 overflow-x-auto">
              <button
                onClick={() => setFilterStatus('all')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold border-none cursor-pointer transition-all duration-300 whitespace-nowrap ${
                  filterStatus === 'all'
                    ? 'gradient-hero text-white shadow-md shadow-purple-500/20'
                    : 'bg-transparent text-text-secondary hover:bg-white hover:text-text-primary'
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
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold border-none cursor-pointer transition-all duration-300 whitespace-nowrap ${
                    filterStatus === st
                      ? 'gradient-hero text-white shadow-md shadow-purple-500/20'
                      : 'bg-transparent text-text-secondary hover:bg-white hover:text-text-primary'
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
        </div>

        {/* Invoice List */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-border-light shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl animate-shimmer" />
                  <div className="flex-1">
                    <div className="h-4 w-36 rounded-lg animate-shimmer mb-2.5" />
                    <div className="h-3 w-52 rounded-lg animate-shimmer" />
                  </div>
                  <div className="h-7 w-24 rounded-lg animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 animate-scale-in">
            <div className="w-28 h-28 gradient-subtle rounded-full flex items-center justify-center mx-auto mb-7 shadow-inner">
              <Receipt size={44} className="text-primary/40" />
            </div>
            <p className="text-text-primary text-xl font-bold mb-2">
              {invoices.length === 0 ? 'אין חשבוניות עדיין' : 'לא נמצאו תוצאות'}
            </p>
            <p className="text-text-secondary text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              {invoices.length === 0
                ? 'הוסף את החשבונית הראשונה שלך כדי להתחיל לעקוב אחרי הוצאות'
                : 'נסה לשנות את מילות החיפוש או הסר פילטרים'}
            </p>
            {invoices.length === 0 && (
              <button
                onClick={openNew}
                className="gradient-hero text-white px-7 py-3.5 rounded-xl border-none cursor-pointer font-bold text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-[1.02]"
              >
                <Plus size={16} className="inline ml-1.5 -mt-0.5" />
                חשבונית ראשונה
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 stagger-children">
            {filtered.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl border border-border-light overflow-hidden shadow-sm hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 hover:border-primary/10">
                {/* Invoice Row */}
                <div
                  className="p-4 lg:p-5 flex items-center gap-3 lg:gap-4 cursor-pointer hover:bg-surface/30 transition-colors duration-200"
                  onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                >
                  {/* Icon */}
                  <div className={`w-11 h-11 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center shrink-0 ${statusColors[inv.status]}`}>
                    <FileText size={18} />
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
                  <div className={`text-text-muted transition-transform duration-300 ${expandedId === inv.id ? 'rotate-180' : ''}`}>
                    <ChevronDown size={18} />
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === inv.id && (
                  <div className="border-t border-border-light p-4 lg:p-6 bg-surface/30 animate-slide-up">
                    {/* Status actions */}
                    <div className="mb-5">
                      <p className="text-[12px] text-text-muted font-semibold mb-3 uppercase tracking-wide">עדכון סטטוס</p>
                      <div className="flex gap-2 flex-wrap">
                        {(Object.keys(statusLabels) as InvoiceStatus[]).map(st => (
                          <button
                            key={st}
                            onClick={() => handleStatusChange(inv.id, st)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold cursor-pointer transition-all duration-300 border ${
                              inv.status === st
                                ? `${statusColors[st]} border-current/20 shadow-sm`
                                : 'bg-white text-text-secondary border-border-light hover:border-primary/20 hover:text-text-primary'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${inv.status === st ? statusDots[st] : 'bg-text-muted'}`} />
                            {statusLabels[st]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                      <div className="bg-white rounded-xl p-3.5 border border-border-light shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Hash size={12} className="text-primary/60" />
                          <span className="text-[11px] text-text-muted font-medium">מספר חשבונית</span>
                        </div>
                        <p className="text-sm font-bold text-text-primary num-ltr" dir="ltr">{inv.invoice_number}</p>
                      </div>
                      <div className="bg-white rounded-xl p-3.5 border border-border-light shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <CalendarDays size={12} className="text-primary/60" />
                          <span className="text-[11px] text-text-muted font-medium">תאריך קבלה</span>
                        </div>
                        <p className="text-sm font-bold text-text-primary num-ltr" dir="ltr">{new Date(inv.received_date).toLocaleDateString('he-IL')}</p>
                      </div>
                      <div className="bg-white rounded-xl p-3.5 border border-border-light shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <CalendarDays size={12} className="text-primary/60" />
                          <span className="text-[11px] text-text-muted font-medium">תאריך חשבונית</span>
                        </div>
                        <p className="text-sm font-bold text-text-primary num-ltr" dir="ltr">{new Date(inv.invoice_date).toLocaleDateString('he-IL')}</p>
                      </div>
                    </div>

                    {inv.notes && (
                      <div className="bg-white rounded-xl p-4 border border-border-light mb-5 shadow-sm">
                        <p className="text-[12px] text-text-muted font-medium mb-1.5">הערות</p>
                        <p className="text-sm text-text-secondary leading-relaxed">{inv.notes}</p>
                      </div>
                    )}

                    {/* Delete action */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleDelete(inv.id, inv.invoice_number)}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-rose-500 hover:bg-rose-50 bg-transparent border border-transparent hover:border-rose-200 rounded-xl cursor-pointer text-[13px] font-semibold transition-all duration-300"
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

      {/* ===== NEW INVOICE MODAL ===== */}
      {showForm && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-start lg:items-center justify-center p-4 pt-8 lg:pt-4 overflow-y-auto">
          <div className="bg-white rounded-[20px] w-full max-w-2xl shadow-2xl animate-scale-in my-4 border border-border-light overflow-hidden">
            {/* Modal Header with gradient */}
            <div className="gradient-hero px-6 py-6 relative overflow-hidden">
              <div className="gradient-orb w-40 h-40 bg-pink-400 -top-20 -left-10 opacity-30" />
              <div className="relative flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">חשבונית חדשה</h2>
                  <p className="text-white/60 text-[13px] mt-0.5">הזן את פרטי החשבונית</p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl border border-white/10 cursor-pointer text-white transition-all duration-300"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 max-h-[65vh] overflow-y-auto">
              {/* Supplier + Invoice number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold mb-2 text-text-primary">ספק *</label>
                  <select
                    value={form.supplier_id}
                    onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm bg-white cursor-pointer transition-all hover:border-primary/30"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm transition-all hover:border-primary/30"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm transition-all hover:border-primary/30"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-2 text-text-primary">תאריך קבלה</label>
                  <input
                    type="date"
                    value={form.received_date}
                    onChange={e => setForm({ ...form, received_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm transition-all hover:border-primary/30"
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
                    <div key={i} className="bg-surface/60 rounded-xl p-4 border border-border-light">
                      <div className="grid grid-cols-[1fr_72px_96px_28px] gap-2.5 items-end">
                        <div>
                          <label className="block text-[11px] text-text-muted font-medium mb-1.5">שם מוצר *</label>
                          <input
                            value={item.product_name}
                            onChange={e => updateItem(i, 'product_name', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-border-light text-sm transition-all bg-white hover:border-primary/30"
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
                            className="w-full px-3 py-2 rounded-lg border border-border-light text-sm text-center transition-all bg-white hover:border-primary/30"
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
                            className="w-full px-3 py-2 rounded-lg border border-border-light text-sm transition-all bg-white hover:border-primary/30"
                            dir="ltr"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="p-1.5 text-text-muted hover:text-rose-500 bg-transparent border-none cursor-pointer transition-colors rounded-lg hover:bg-white"
                          disabled={form.items.length <= 1}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                        <input
                          value={item.sku || ''}
                          onChange={e => updateItem(i, 'sku', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-border-light text-[12px] transition-all bg-white hover:border-primary/30"
                          placeholder="מק״ט (אופציונלי)"
                          dir="ltr"
                        />
                        <input
                          value={item.category || ''}
                          onChange={e => updateItem(i, 'category', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-border-light text-[12px] transition-all bg-white hover:border-primary/30"
                          placeholder="קטגוריה (אופציונלי)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between gradient-hero-dark px-6 py-5 rounded-2xl border border-white/5">
                <span className="font-bold text-white/80 text-[15px]">סה״כ</span>
                <span className="font-extrabold text-2xl text-white num-ltr" dir="ltr">₪{form.total_amount.toLocaleString()}</span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[13px] font-semibold mb-2 text-text-primary">הערות</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm resize-none transition-all hover:border-primary/30"
                  rows={2}
                  placeholder="הערות נוספות..."
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full gradient-hero text-white py-4 rounded-xl border-none cursor-pointer font-bold text-[15px] hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-[1.01]"
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
