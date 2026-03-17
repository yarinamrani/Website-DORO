import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Phone, Mail, MapPin, X, Users, RefreshCw, Search } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');

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

  const filtered = suppliers.filter(s =>
    !searchTerm ||
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-border-light">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">ספקים</h1>
            <p className="text-text-secondary text-sm mt-0.5">{suppliers.length} ספקים פעילים</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl border-none cursor-pointer font-medium text-sm hover:bg-primary-light transition-colors shadow-sm"
          >
            <Plus size={18} />
            ספק חדש
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

        {/* Search */}
        <div className="relative max-w-md mb-5">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            placeholder="חפש ספק..."
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-surface-warm rounded-3xl flex items-center justify-center mx-auto mb-5">
              <Users size={36} className="text-text-muted" />
            </div>
            <p className="text-text-primary text-lg font-medium mb-2">
              {suppliers.length === 0 ? 'אין ספקים עדיין' : 'לא נמצאו תוצאות'}
            </p>
            <p className="text-text-secondary text-sm mb-5">
              {suppliers.length === 0 ? 'התחל בהוספת ספק ראשון' : 'נסה לשנות את החיפוש'}
            </p>
            {suppliers.length === 0 && (
              <button onClick={openNew} className="bg-primary text-white px-6 py-2.5 rounded-xl border-none cursor-pointer font-medium text-sm hover:bg-primary-light transition-colors">
                + ספק ראשון
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(s => (
              <div key={s.id} className="bg-white rounded-2xl p-5 border border-border-light hover:shadow-md transition-all duration-200 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-lg">{s.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary">{s.name}</h3>
                      {s.contact_name && (
                        <p className="text-text-secondary text-sm">{s.contact_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(s)} className="p-2 text-text-muted hover:text-primary cursor-pointer bg-transparent border-none rounded-lg hover:bg-primary/5 transition-all">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(s.id, s.name)} className="p-2 text-text-muted hover:text-danger cursor-pointer bg-transparent border-none rounded-lg hover:bg-danger-light transition-all">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-sm text-text-secondary">
                  {s.phone && (
                    <span className="flex items-center gap-2.5">
                      <Phone size={14} className="text-text-muted shrink-0" />
                      <span dir="ltr">{s.phone}</span>
                    </span>
                  )}
                  {s.email && (
                    <span className="flex items-center gap-2.5">
                      <Mail size={14} className="text-text-muted shrink-0" />
                      <span className="truncate" dir="ltr">{s.email}</span>
                    </span>
                  )}
                  {s.address && (
                    <span className="flex items-center gap-2.5">
                      <MapPin size={14} className="text-text-muted shrink-0" />
                      {s.address}
                    </span>
                  )}
                </div>
                {s.notes && (
                  <p className="mt-3 text-sm text-text-secondary bg-surface px-3.5 py-2.5 rounded-lg border border-border-light">{s.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border-light">
              <h2 className="text-lg font-bold text-text-primary">{editingId ? 'עריכת ספק' : 'ספק חדש'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 bg-surface hover:bg-border-light rounded-lg border-none cursor-pointer text-text-secondary transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-text-primary">שם ספק *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  placeholder="לדוגמה: טקסטיל ישראל"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-text-primary">איש קשר</label>
                <input
                  value={form.contact_name}
                  onChange={e => setForm({ ...form, contact_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-text-primary">טלפון</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-text-primary">אימייל</label>
                  <input
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-text-primary">כתובת</label>
                <input
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-text-primary">הערות</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm outline-none resize-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-white py-3.5 rounded-xl border-none cursor-pointer font-bold text-base hover:bg-primary-light transition-colors shadow-sm"
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
