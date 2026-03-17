import { useState, useEffect } from 'react';
import { Plus, FileText, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
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
  received: 'bg-blue-100 text-blue-700',
  checked: 'bg-green-100 text-green-700',
  disputed: 'bg-red-100 text-red-700',
  paid: 'bg-gray-100 text-gray-600',
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
    // Recalculate total
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

  return (
    <div className="min-h-screen bg-beige/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">חשבוניות</h1>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-pink-primary text-white px-5 py-2.5 rounded-lg border-none cursor-pointer font-medium text-sm hover:bg-pink-dark transition-colors"
          >
            <Plus size={18} />
            חשבונית חדשה
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-16 text-text-secondary">טוען...</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-text-secondary text-lg mb-4">אין חשבוניות עדיין</p>
            <button onClick={openNew} className="text-pink-primary font-medium cursor-pointer bg-transparent border-none text-base">
              + הזן חשבונית ראשונה
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {invoices.map(inv => (
              <div key={inv.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Invoice Row */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold">#{inv.invoice_number}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status]}`}>
                        {statusLabels[inv.status]}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {inv.supplier?.name} · {new Date(inv.invoice_date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <span className="font-bold text-lg">₪{Number(inv.total_amount).toLocaleString()}</span>
                  {expandedId === inv.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>

                {/* Expanded Details */}
                {expandedId === inv.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {(Object.keys(statusLabels) as InvoiceStatus[]).map(st => (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(inv.id, st)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer transition-colors ${
                            inv.status === st
                              ? statusColors[st]
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {statusLabels[st]}
                        </button>
                      ))}
                      <button
                        onClick={() => handleDelete(inv.id, inv.invoice_number)}
                        className="mr-auto p-1.5 text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {inv.notes && (
                      <p className="text-sm text-text-secondary mb-3 bg-white px-3 py-2 rounded-lg">{inv.notes}</p>
                    )}
                    <p className="text-xs text-text-secondary">
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold">חשבונית חדשה</h2>
              <button onClick={() => setShowForm(false)} className="p-1 bg-transparent border-none cursor-pointer text-text-secondary">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              {/* Supplier & Invoice Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ספק *</label>
                  <select
                    value={form.supplier_id}
                    onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none bg-white"
                    dir="rtl"
                  >
                    <option value="">בחר ספק</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">מספר חשבונית *</label>
                  <input
                    value={form.invoice_number}
                    onChange={e => setForm({ ...form, invoice_number: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-pink-primary"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך חשבונית</label>
                  <input
                    type="date"
                    value={form.invoice_date}
                    onChange={e => setForm({ ...form, invoice_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך קבלה</label>
                  <input
                    type="date"
                    value={form.received_date}
                    onChange={e => setForm({ ...form, received_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold">פריטים</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-pink-primary text-sm font-medium bg-transparent border-none cursor-pointer"
                  >
                    + הוסף פריט
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {form.items.map((item, i) => (
                    <div key={i} className="bg-beige/50 rounded-lg p-3">
                      <div className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end">
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">שם מוצר *</label>
                          <input
                            value={item.product_name}
                            onChange={e => updateItem(i, 'product_name', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-pink-primary"
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
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none text-center"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">מחיר יחידה</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price || ''}
                            onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none"
                            dir="ltr"
                            placeholder="₪"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="p-2 text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer"
                          disabled={form.items.length <= 1}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <input
                          value={item.sku || ''}
                          onChange={e => updateItem(i, 'sku', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none"
                          placeholder="מק״ט (אופציונלי)"
                          dir="ltr"
                        />
                        <input
                          value={item.category || ''}
                          onChange={e => updateItem(i, 'category', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none"
                          placeholder="קטגוריה (אופציונלי)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-pink-light px-4 py-3 rounded-lg">
                <span className="font-bold">סה״כ</span>
                <span className="font-bold text-xl">₪{form.total_amount.toLocaleString()}</span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">הערות</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none resize-none"
                  rows={2}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-pink-primary text-white py-3 rounded-lg border-none cursor-pointer font-bold text-base hover:bg-pink-dark transition-colors"
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
