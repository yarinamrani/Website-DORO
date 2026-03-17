import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Phone, Mail, MapPin, X } from 'lucide-react';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../lib/invoiceService';
import type { Supplier, SupplierFormData } from '../types/invoices';

const emptyForm: SupplierFormData = {
  name: '', contact_name: '', phone: '', email: '', address: '', notes: '',
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierFormData>(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => { loadSuppliers(); }, []);

  async function loadSuppliers() {
    try {
      setLoading(true);
      setSuppliers(await getSuppliers());
    } catch (e) {
      setError('שגיאה בטעינת ספקים');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(s: Supplier) {
    setForm({
      name: s.name,
      contact_name: s.contact_name || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      notes: s.notes || '',
    });
    setEditingId(s.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('שם ספק הוא שדה חובה'); return; }
    try {
      if (editingId) {
        await updateSupplier(editingId, form);
      } else {
        await createSupplier(form);
      }
      setShowForm(false);
      setError('');
      await loadSuppliers();
    } catch (err) {
      setError('שגיאה בשמירת ספק');
      console.error(err);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`למחוק את הספק "${name}"? כל החשבוניות שלו יימחקו גם.`)) return;
    try {
      await deleteSupplier(id);
      await loadSuppliers();
    } catch (err) {
      setError('שגיאה במחיקת ספק');
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-beige/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">ספקים</h1>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-pink-primary text-white px-5 py-2.5 rounded-lg border-none cursor-pointer font-medium text-sm hover:bg-pink-dark transition-colors"
          >
            <Plus size={18} />
            ספק חדש
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-16 text-text-secondary">טוען...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-secondary text-lg mb-4">אין ספקים עדיין</p>
            <button onClick={openNew} className="text-pink-primary font-medium cursor-pointer bg-transparent border-none text-base">
              + הוסף ספק ראשון
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {suppliers.map(s => (
              <div key={s.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-text-primary">{s.name}</h3>
                    {s.contact_name && (
                      <p className="text-text-secondary text-sm">{s.contact_name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="p-2 text-text-secondary hover:text-pink-primary cursor-pointer bg-transparent border-none transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(s.id, s.name)} className="p-2 text-text-secondary hover:text-red-500 cursor-pointer bg-transparent border-none transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-sm text-text-secondary">
                  {s.phone && (
                    <span className="flex items-center gap-2"><Phone size={14} />{s.phone}</span>
                  )}
                  {s.email && (
                    <span className="flex items-center gap-2"><Mail size={14} />{s.email}</span>
                  )}
                  {s.address && (
                    <span className="flex items-center gap-2"><MapPin size={14} />{s.address}</span>
                  )}
                </div>
                {s.notes && (
                  <p className="mt-3 text-sm text-text-secondary bg-beige/50 px-3 py-2 rounded-lg">{s.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold">{editingId ? 'עריכת ספק' : 'ספק חדש'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 bg-transparent border-none cursor-pointer text-text-secondary hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם ספק *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-pink-primary"
                  placeholder="לדוגמה: טקסטיל ישראל"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">איש קשר</label>
                <input
                  value={form.contact_name}
                  onChange={e => setForm({ ...form, contact_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-pink-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">טלפון</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-pink-primary"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">אימייל</label>
                  <input
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-pink-primary"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">כתובת</label>
                <input
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-pink-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">הערות</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-pink-primary resize-none"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-pink-primary text-white py-3 rounded-lg border-none cursor-pointer font-bold text-base hover:bg-pink-dark transition-colors"
              >
                {editingId ? 'עדכן ספק' : 'הוסף ספק'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
