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
  paid: 'bg-gray-100 text-gray-500',
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
    <div>
      {/* ===== CLEAN HEADER ===== */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1.5 rounded-full mb-3">
                <FileText size={13} />
                <span>ניהול חשבוניות</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">חשבוניות</h1>
              <p className="text-gray-400 text-sm mt-1">
                <span className="num-ltr" dir="ltr">{invoices.length}</span> חשבוניות סה״כ
                {filterStatus !== 'all' && (
                  <span className="text-teal-600 font-medium"> · מציג {filtered.length} תוצאות</span>
                )}
              </p>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl border-none cursor-pointer font-bold text-sm transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Plus size={18} />
              חשבונית חדשה
            </button>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 pb-8">
        {/* Error */}
        {error && (
          <div className="bg-rose-50 text-rose-600 px-5 py-3.5 rounded-xl mb-5 text-sm border border-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                <X size={13} />
              </div>
              <span className="font-semibold">{error}</span>
            </div>
            <button onClick={() => setError('')} className="p-2 hover:bg-rose-100 rounded-lg bg-transparent border-none cursor-pointer text-rose-500 transition-colors">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-white rounded-xl p-3 lg:p-4 border border-gray-200 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-lg">
              <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-11 pl-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-400 transition-all focus:bg-white"
                placeholder="חפש לפי מספר חשבונית או ספק..."
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1 overflow-x-auto">
              <button
                onClick={() => setFilterStatus('all')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] font-semibold border-none cursor-pointer transition-all duration-200 whitespace-nowrap ${
                  filterStatus === 'all'
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-transparent text-gray-500 hover:bg-white hover:text-gray-700'
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
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] font-semibold border-none cursor-pointer transition-all duration-200 whitespace-nowrap ${
                    filterStatus === st
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'bg-transparent text-gray-500 hover:bg-white hover:text-gray-700'
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
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-36 rounded bg-gray-100 animate-pulse mb-2.5" />
                    <div className="h-3 w-52 rounded bg-gray-100 animate-pulse" />
                  </div>
                  <div className="h-7 w-24 rounded bg-gray-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Receipt size={40} className="text-gray-300" />
            </div>
            <p className="text-gray-900 text-xl font-bold mb-2">
              {invoices.length === 0 ? 'אין חשבוניות עדיין' : 'לא נמצאו תוצאות'}
            </p>
            <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              {invoices.length === 0
                ? 'הוסף את החשבונית הראשונה שלך כדי להתחיל לעקוב אחרי הוצאות'
                : 'נסה לשנות את מילות החיפוש או הסר פילטרים'}
            </p>
            {invoices.length === 0 && (
              <button
                onClick={openNew}
                className="bg-teal-500 hover:bg-teal-600 text-white px-7 py-3.5 rounded-xl border-none cursor-pointer font-bold text-sm transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Plus size={16} className="inline ml-1.5 -mt-0.5" />
                חשבונית ראשונה
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(inv => (
              <div key={inv.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
                {/* Invoice Row */}
                <div
                  className="p-4 lg:p-5 flex items-center gap-3 lg:gap-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                  onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                >
                  <div className={`w-11 h-11 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center shrink-0 ${statusColors[inv.status]}`}>
                    <FileText size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="font-bold text-gray-900 text-[15px]">
                        <span className="text-gray-400 font-medium">#</span>{inv.invoice_number}
                      </span>
                      <span className={`status-badge ${statusColors[inv.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ml-1.5 ${statusDots[inv.status]}`} />
                        {statusLabels[inv.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-gray-500">
                      <span className="font-medium">{inv.supplier?.name}</span>
                      <span className="text-gray-300">·</span>
                      <span className="num-ltr" dir="ltr">{new Date(inv.invoice_date).toLocaleDateString('he-IL')}</span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="font-extrabold text-lg text-gray-900 num-ltr" dir="ltr">
                      ₪{Number(inv.total_amount).toLocaleString()}
                    </span>
                  </div>

                  <div className={`text-gray-400 transition-transform duration-300 ${expandedId === inv.id ? 'rotate-180' : ''}`}>
                    <ChevronDown size={18} />
                  </div>
                </div>

                {expandedId === inv.id && (
                  <div className="border-t border-gray-200 p-4 lg:p-6 bg-gray-50">
                    <div className="mb-5">
                      <p className="text-[12px] text-gray-400 font-semibold mb-3 uppercase tracking-wide">עדכון סטטוס</p>
                      <div className="flex gap-2 flex-wrap">
                        {(Object.keys(statusLabels) as InvoiceStatus[]).map(st => (
                          <button
                            key={st}
                            onClick={() => handleStatusChange(inv.id, st)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-200 border ${
                              inv.status === st
                                ? `${statusColors[st]} border-current/20 shadow-sm`
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${inv.status === st ? statusDots[st] : 'bg-gray-300'}`} />
                            {statusLabels[st]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                      <div className="bg-white rounded-lg p-3.5 border border-gray-200">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Hash size={12} className="text-gray-400" />
                          <span className="text-[11px] text-gray-400 font-medium">מספר חשבונית</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 num-ltr" dir="ltr">{inv.invoice_number}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3.5 border border-gray-200">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <CalendarDays size={12} className="text-gray-400" />
                          <span className="text-[11px] text-gray-400 font-medium">תאריך קבלה</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 num-ltr" dir="ltr">{new Date(inv.received_date).toLocaleDateString('he-IL')}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3.5 border border-gray-200">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <CalendarDays size={12} className="text-gray-400" />
                          <span className="text-[11px] text-gray-400 font-medium">תאריך חשבונית</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 num-ltr" dir="ltr">{new Date(inv.invoice_date).toLocaleDateString('he-IL')}</p>
                      </div>
                    </div>

                    {/* Items */}
                    {inv.items && inv.items.length > 0 && (
                      <div className="mb-5">
                        <p className="text-[12px] text-gray-400 font-semibold mb-3 uppercase tracking-wide">פריטים</p>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 text-gray-500 text-[12px]">
                                <th className="text-right px-4 py-2.5 font-medium">מוצר</th>
                                <th className="text-center px-3 py-2.5 font-medium">כמות</th>
                                <th className="text-left px-3 py-2.5 font-medium">מחיר יחידה</th>
                                <th className="text-left px-4 py-2.5 font-medium">סה״כ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inv.items.map((item, idx) => (
                                <tr key={item.id || idx} className="border-t border-gray-100">
                                  <td className="px-4 py-2.5 font-medium text-gray-900">{item.product_name}</td>
                                  <td className="px-3 py-2.5 text-center text-gray-600 num-ltr" dir="ltr">{item.quantity}</td>
                                  <td className="px-3 py-2.5 text-gray-600 num-ltr" dir="ltr">₪{Number(item.unit_price).toLocaleString()}</td>
                                  <td className="px-4 py-2.5 font-bold text-gray-900 num-ltr" dir="ltr">₪{(item.total_price ?? item.quantity * item.unit_price).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-gray-200 bg-gray-50">
                                <td colSpan={3} className="px-4 py-3 font-bold text-gray-700 text-[13px]">סה״כ חשבונית</td>
                                <td className="px-4 py-3 font-extrabold text-gray-900 num-ltr text-base" dir="ltr">₪{Number(inv.total_amount).toLocaleString()}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {inv.notes && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200 mb-5">
                        <p className="text-[12px] text-gray-400 font-medium mb-1.5">הערות</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{inv.notes}</p>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleDelete(inv.id, inv.invoice_number)}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-rose-500 hover:bg-rose-50 bg-transparent border border-transparent hover:border-rose-200 rounded-lg cursor-pointer text-[13px] font-semibold transition-all duration-200"
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
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-4 border border-gray-200 overflow-hidden">
            <div className="bg-teal-500 px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">חשבונית חדשה</h2>
                  <p className="text-teal-100 text-[13px] mt-0.5">הזן את פרטי החשבונית</p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2.5 bg-white/20 hover:bg-white/30 rounded-lg border-none cursor-pointer text-white transition-all duration-200"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold mb-2 text-gray-700">ספק *</label>
                  <select
                    value={form.supplier_id}
                    onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white cursor-pointer transition-all hover:border-teal-300"
                    dir="rtl"
                  >
                    <option value="">בחר ספק</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-2 text-gray-700">מספר חשבונית *</label>
                  <input
                    value={form.invoice_number}
                    onChange={e => setForm({ ...form, invoice_number: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm transition-all hover:border-teal-300"
                    dir="ltr"
                    placeholder="INV-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold mb-2 text-gray-700">תאריך חשבונית</label>
                  <input
                    type="date"
                    value={form.invoice_date}
                    onChange={e => setForm({ ...form, invoice_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm transition-all hover:border-teal-300"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-2 text-gray-700">תאריך קבלה</label>
                  <input
                    type="date"
                    value={form.received_date}
                    onChange={e => setForm({ ...form, received_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm transition-all hover:border-teal-300"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[13px] font-bold text-gray-700">פריטים</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 text-teal-600 text-[13px] font-semibold bg-transparent border-none cursor-pointer hover:text-teal-700 transition-colors"
                  >
                    <Plus size={14} />
                    הוסף פריט
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {form.items.map((item, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="grid grid-cols-[1fr_72px_96px_28px] gap-2.5 items-end">
                        <div>
                          <label className="block text-[11px] text-gray-400 font-medium mb-1.5">שם מוצר *</label>
                          <input
                            value={item.product_name}
                            onChange={e => updateItem(i, 'product_name', e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm transition-all bg-white hover:border-teal-300"
                            placeholder="שם המוצר"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 font-medium mb-1.5">כמות</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm text-center transition-all bg-white hover:border-teal-300"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 font-medium mb-1.5">מחיר</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price || ''}
                            onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm transition-all bg-white hover:border-teal-300"
                            dir="ltr"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="p-1.5 text-gray-400 hover:text-rose-500 bg-transparent border-none cursor-pointer transition-colors rounded-md hover:bg-white"
                          disabled={form.items.length <= 1}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                        <input
                          value={item.sku || ''}
                          onChange={e => updateItem(i, 'sku', e.target.value)}
                          className="px-3 py-1.5 rounded-md border border-gray-200 text-[12px] transition-all bg-white hover:border-teal-300"
                          placeholder="מק״ט (אופציונלי)"
                          dir="ltr"
                        />
                        <input
                          value={item.category || ''}
                          onChange={e => updateItem(i, 'category', e.target.value)}
                          className="px-3 py-1.5 rounded-md border border-gray-200 text-[12px] transition-all bg-white hover:border-teal-300"
                          placeholder="קטגוריה (אופציונלי)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between bg-gray-900 px-6 py-5 rounded-xl">
                <span className="font-bold text-gray-300 text-[15px]">סה״כ</span>
                <span className="font-extrabold text-2xl text-white num-ltr" dir="ltr">₪{form.total_amount.toLocaleString()}</span>
              </div>

              <div>
                <label className="block text-[13px] font-semibold mb-2 text-gray-700">הערות</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm resize-none transition-all hover:border-teal-300"
                  rows={2}
                  placeholder="הערות נוספות..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-teal-500 hover:bg-teal-600 text-white py-4 rounded-xl border-none cursor-pointer font-bold text-[15px] transition-all duration-200 shadow-sm hover:shadow-md"
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
