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
    'from-violet-500 to-purple-600',
    'from-indigo-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-amber-400 to-orange-500',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-sky-600',
    'from-fuchsia-500 to-purple-600',
    'from-teal-500 to-emerald-600',
    'from-orange-500 to-red-500',
    'from-pink-500 to-rose-600',
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
      {/* ===== GRADIENT HERO HEADER ===== */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #2d1b4e 100%)' }}>
        <div className="gradient-orb w-96 h-96 bg-violet-600 -top-48 right-10 opacity-25" />
        <div className="gradient-orb w-72 h-72 bg-pink-500 bottom-0 -left-20 opacity-15" />
        <div className="gradient-orb w-48 h-48 bg-amber-500 top-20 left-1/3 opacity-10" />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-10 lg:pt-12 pb-20 lg:pb-24">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/80 text-xs font-medium px-3.5 py-1.5 rounded-full mb-3 border border-white/10">
                <User size={13} />
                <span>ניהול ספקים</span>
              </div>
              <h1 className="text-3xl lg:text-[38px] font-extrabold text-white tracking-tight">ספקים</h1>
              <p className="text-white/50 text-sm mt-2">
                <span className="num-ltr" dir="ltr">{suppliers.length}</span> ספקים פעילים
              </p>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 gradient-accent text-white px-6 py-3 rounded-xl border-none cursor-pointer font-bold text-sm transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02]"
            >
              <Plus size={18} />
              ספק חדש
            </button>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
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

        {/* Search - floating card */}
        <div className="bg-white rounded-2xl p-3 lg:p-4 border border-border-light shadow-xl shadow-purple-500/5 mb-6">
          <div className="relative max-w-lg">
            <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-11 pl-4 py-2.5 rounded-xl border border-border-light bg-surface/50 text-sm placeholder:text-text-muted transition-all focus:bg-white"
              placeholder="חפש ספק לפי שם או איש קשר..."
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-border-light shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-14 h-14 rounded-xl animate-shimmer" />
                  <div className="flex-1">
                    <div className="h-4 w-28 rounded-lg animate-shimmer mb-2.5" />
                    <div className="h-3 w-36 rounded-lg animate-shimmer" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-3 w-full rounded-lg animate-shimmer" />
                  <div className="h-3 w-3/4 rounded-lg animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 animate-scale-in">
            <div className="w-28 h-28 gradient-subtle rounded-full flex items-center justify-center mx-auto mb-7 shadow-inner">
              <Building2 size={44} className="text-primary/40" />
            </div>
            <p className="text-text-primary text-xl font-bold mb-2">
              {suppliers.length === 0 ? 'אין ספקים עדיין' : 'לא נמצאו תוצאות'}
            </p>
            <p className="text-text-secondary text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              {suppliers.length === 0
                ? 'הוסף את הספק הראשון שלך כדי להתחיל לנהל חשבוניות'
                : 'נסה לשנות את מילות החיפוש'}
            </p>
            {suppliers.length === 0 && (
              <button
                onClick={openNew}
                className="gradient-hero text-white px-7 py-3.5 rounded-xl border-none cursor-pointer font-bold text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-[1.02]"
              >
                <Plus size={16} className="inline ml-1.5 -mt-0.5" />
                ספק ראשון
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
            {filtered.map(s => (
              <div
                key={s.id}
                className="card-premium group relative overflow-hidden"
              >
                {/* Top gradient accent */}
                <div className={`h-1.5 bg-gradient-to-l ${getAvatarColor(s.name)} rounded-t-[20px]`} />

                <div className="p-5 lg:p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-13 h-13 rounded-xl bg-gradient-to-br ${getAvatarColor(s.name)} flex items-center justify-center shadow-lg`} style={{ width: '52px', height: '52px' }}>
                        <span className="text-white font-bold text-xl">{s.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-text-primary text-[16px] truncate">{s.name}</h3>
                        {s.contact_name && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <User size={12} className="text-text-muted shrink-0" />
                            <p className="text-text-secondary text-[13px] truncate">{s.contact_name}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-2.5 text-text-muted hover:text-primary cursor-pointer bg-transparent border-none rounded-xl hover:bg-primary-50 transition-all duration-300"
                        title="ערוך"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-2.5 text-text-muted hover:text-rose-500 cursor-pointer bg-transparent border-none rounded-xl hover:bg-rose-50 transition-all duration-300"
                        title="מחק"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="flex flex-col gap-2.5">
                    {s.phone && (
                      <div className="flex items-center gap-3 text-[13px]">
                        <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0 border border-border-light">
                          <Phone size={14} className="text-primary/60" />
                        </div>
                        <span className="text-text-secondary font-medium num-ltr" dir="ltr">{s.phone}</span>
                      </div>
                    )}
                    {s.email && (
                      <div className="flex items-center gap-3 text-[13px]">
                        <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0 border border-border-light">
                          <Mail size={14} className="text-primary/60" />
                        </div>
                        <span className="text-text-secondary font-medium truncate num-ltr" dir="ltr">{s.email}</span>
                      </div>
                    )}
                    {s.address && (
                      <div className="flex items-center gap-3 text-[13px]">
                        <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0 border border-border-light">
                          <MapPin size={14} className="text-primary/60" />
                        </div>
                        <span className="text-text-secondary font-medium truncate">{s.address}</span>
                      </div>
                    )}
                    {!s.phone && !s.email && !s.address && (
                      <div className="flex items-center gap-2.5 text-[13px] text-text-muted py-2 px-3 bg-surface/50 rounded-lg">
                        <span>אין פרטי קשר</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {s.notes && (
                    <div className="mt-4 pt-4 border-t border-border-light">
                      <p className="text-[12px] text-text-muted leading-relaxed line-clamp-2">{s.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== MODAL FORM ===== */}
      {showForm && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-start lg:items-center justify-center p-4 pt-8 lg:pt-4 overflow-y-auto">
          <div className="bg-white rounded-[20px] w-full max-w-lg shadow-2xl animate-scale-in my-4 border border-border-light overflow-hidden">
            {/* Modal Header with gradient */}
            <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 100%)' }} className="px-6 py-6 relative overflow-hidden">
              <div className="gradient-orb w-40 h-40 bg-violet-500 -top-20 -right-10 opacity-30" />
              <div className="relative flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{editingId ? 'עריכת ספק' : 'ספק חדש'}</h2>
                  <p className="text-white/50 text-[13px] mt-0.5">
                    {editingId ? 'עדכן את פרטי הספק' : 'הזן את פרטי הספק החדש'}
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl border border-white/10 cursor-pointer text-white transition-all duration-300"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              {/* Name */}
              <div>
                <label className="block text-[13px] font-semibold mb-2 text-text-primary">שם ספק *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm transition-all hover:border-primary/30"
                  placeholder="לדוגמה: שוק הירקות"
                />
              </div>

              {/* Contact */}
              <div>
                <label className="block text-[13px] font-semibold mb-2 text-text-primary">איש קשר</label>
                <input
                  value={form.contact_name}
                  onChange={e => setForm({ ...form, contact_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm transition-all hover:border-primary/30"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm transition-all hover:border-primary/30"
                    dir="ltr"
                    placeholder="050-000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-2 text-text-primary">אימייל</label>
                  <input
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm transition-all hover:border-primary/30"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm transition-all hover:border-primary/30"
                  placeholder="כתובת מלאה"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[13px] font-semibold mb-2 text-text-primary">הערות</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border-light text-sm resize-none transition-all hover:border-primary/30"
                  rows={3}
                  placeholder="הערות נוספות על הספק..."
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full gradient-hero text-white py-4 rounded-xl border-none cursor-pointer font-bold text-[15px] hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-[1.01] mt-1"
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
