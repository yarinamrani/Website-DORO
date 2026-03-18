import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Phone, Mail, MapPin, X, Search, Building2, User } from 'lucide-react';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../lib/invoiceService';
import type { Supplier, SupplierFormData } from '../types/invoices';

const emptyForm: SupplierFormData = {
  name: '', contact_name: '', phone: '', email: '', address: '', notes: '',
};

// Generate consistent avatar colors from supplier name
function getAvatarColor(name: string): string {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-violet-500 to-violet-600',
    'from-emerald-500 to-emerald-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
    'from-cyan-500 to-cyan-600',
    'from-indigo-500 to-indigo-600',
    'from-teal-500 to-teal-600',
    'from-orange-500 to-orange-600',
    'from-pink-500 to-pink-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

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
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="px-4 lg:px-8 pt-6 lg:pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-[28px] font-extrabold text-text-primary tracking-tight">ספקים</h1>
            <p className="text-text-secondary text-sm mt-1">
              <span className="num-ltr" dir="ltr">{suppliers.length}</span> ספקים פעילים
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl border-none cursor-pointer font-semibold text-sm transition-all shadow-sm shadow-primary/20 hover:shadow-primary/30"
          >
            <Plus size={18} />
            ספק חדש
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

        {/* Search */}
        <div className="relative max-w-lg mb-6">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-border bg-white text-sm placeholder:text-text-muted transition-all"
            placeholder="חפש ספק לפי שם או איש קשר..."
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-border-light">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl animate-shimmer" />
                  <div className="flex-1">
                    <div className="h-4 w-24 rounded-lg animate-shimmer mb-2" />
                    <div className="h-3 w-32 rounded-lg animate-shimmer" />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="h-3 w-full rounded-lg animate-shimmer" />
                  <div className="h-3 w-3/4 rounded-lg animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 animate-scale-in">
            <div className="w-24 h-24 bg-surface rounded-[28px] flex items-center justify-center mx-auto mb-6 border border-border-light">
              <Building2 size={40} className="text-text-muted" />
            </div>
            <p className="text-text-primary text-xl font-bold mb-2">
              {suppliers.length === 0 ? 'אין ספקים עדיין' : 'לא נמצאו תוצאות'}
            </p>
            <p className="text-text-secondary text-sm mb-6 max-w-sm mx-auto">
              {suppliers.length === 0
                ? 'הוסף את הספק הראשון שלך כדי להתחיל לנהל חשבוניות'
                : 'נסה לשנות את מילות החיפוש'}
            </p>
            {suppliers.length === 0 && (
              <button
                onClick={openNew}
                className="bg-primary text-white px-6 py-3 rounded-xl border-none cursor-pointer font-semibold text-sm hover:bg-primary-dark transition-all shadow-sm shadow-primary/20"
              >
                <Plus size={16} className="inline ml-1.5 -mt-0.5" />
                ספק ראשון
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 stagger-children">
            {filtered.map(s => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-border-light card-hover group relative overflow-hidden"
              >
                {/* Top color bar */}
                <div className={`h-1 bg-gradient-to-l ${getAvatarColor(s.name)}`} />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarColor(s.name)} flex items-center justify-center shadow-sm`}>
                        <span className="text-white font-bold text-lg">{s.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-text-primary text-[15px] truncate">{s.name}</h3>
                        {s.contact_name && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <User size={12} className="text-text-muted shrink-0" />
                            <p className="text-text-secondary text-[13px] truncate">{s.contact_name}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-2 text-text-muted hover:text-primary cursor-pointer bg-transparent border-none rounded-lg hover:bg-primary-50 transition-all"
                        title="ערוך"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-2 text-text-muted hover:text-danger cursor-pointer bg-transparent border-none rounded-lg hover:bg-danger-light transition-all"
                        title="מחק"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="flex flex-col gap-2">
                    {s.phone && (
                      <div className="flex items-center gap-2.5 text-[13px]">
                        <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0">
                          <Phone size={13} className="text-text-muted" />
                        </div>
                        <span className="text-text-secondary num-ltr" dir="ltr">{s.phone}</span>
                      </div>
                    )}
                    {s.email && (
                      <div className="flex items-center gap-2.5 text-[13px]">
                        <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0">
                          <Mail size={13} className="text-text-muted" />
                        </div>
                        <span className="text-text-secondary truncate num-ltr" dir="ltr">{s.email}</span>
                      </div>
                    )}
                    {s.address && (
                      <div className="flex items-center gap-2.5 text-[13px]">
                        <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0">
                          <MapPin size={13} className="text-text-muted" />
                        </div>
                        <span className="text-text-secondary truncate">{s.address}</span>
                      </div>
                    )}
                    {!s.phone && !s.email && !s.address && (
                      <div className="flex items-center gap-2 text-[13px] text-text-muted py-1">
                        <span>אין פרטי קשר</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {s.notes && (
                    <div className="mt-3 pt-3 border-t border-border-light">
                      <p className="text-[12px] text-text-muted leading-relaxed line-clamp-2">{s.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-start lg:items-center justify-center p-4 pt-8 lg:pt-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in my-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-light">
              <div>
                <h2 className="text-lg font-bold text-text-primary">{editingId ? 'עריכת ספק' : 'ספק חדש'}</h2>
                <p className="text-text-muted text-[13px] mt-0.5">
                  {editingId ? 'עדכן את פרטי הספק' : 'הזן את פרטי הספק החדש'}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2.5 bg-surface hover:bg-border-light rounded-xl border-none cursor-pointer text-text-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              {/* Name */}
              <div>
                <label className="block text-[13px] font-semibold mb-2 text-text-primary">שם ספק *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm transition-all"
                  placeholder="לדוגמה: שוק הירקות"
                />
              </div>

              {/* Contact */}
              <div>
                <label className="block text-[13px] font-semibold mb-2 text-text-primary">איש קשר</label>
                <input
                  value={form.contact_name}
                  onChange={e => setForm({ ...form, contact_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm transition-all"
                  placeholder="שם מלא"
                />
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold mb-2 text-text-primary">טלפון</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm transition-all"
                    dir="ltr"
                    placeholder="050-000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-2 text-text-primary">אימייל</label>
                  <input
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm transition-all"
                    dir="ltr"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-[13px] font-semibold mb-2 text-text-primary">כתובת</label>
                <input
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm transition-all"
                  placeholder="כתובת מלאה"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[13px] font-semibold mb-2 text-text-primary">הערות</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm resize-none transition-all"
                  rows={3}
                  placeholder="הערות נוספות על הספק..."
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full bg-primary text-white py-3.5 rounded-xl border-none cursor-pointer font-bold text-[15px] hover:bg-primary-dark transition-all shadow-sm shadow-primary/20 mt-1"
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
