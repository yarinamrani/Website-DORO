import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, FileText, Users, Package,
  ArrowLeft, BarChart3, X, Loader2,
} from 'lucide-react';
import { globalSearch } from '../lib/analyticsService';
import type { SearchResult } from '../types/analytics';

const TYPE_ICONS = {
  invoice: FileText,
  supplier: Users,
  product: Package,
};

const TYPE_LABELS = {
  invoice: 'חשבונית',
  supplier: 'ספק',
  product: 'מוצר',
};

const TYPE_COLORS = {
  invoice: 'bg-info/10 text-info',
  supplier: 'bg-violet-100 text-violet-600',
  product: 'bg-accent-light text-accent-dark',
};

const QUICK_LINKS = [
  { label: 'דשבורד', route: '/', icon: BarChart3 },
  { label: 'חשבוניות', route: '/invoices', icon: FileText },
  { label: 'ספקים', route: '/suppliers', icon: Users },
  { label: 'אנליטיקס', route: '/analytics', icon: BarChart3 },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Global keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      try {
        const r = await globalSearch(query);
        setResults(r);
        setSelectedIndex(0);
      } catch (e) {
        console.error('Search error:', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query]);

  const navigateTo = useCallback((route: string) => {
    navigate(route);
    setOpen(false);
  }, [navigate]);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    const items = query.length < 2 ? QUICK_LINKS : results;
    const count = items.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % count);
      scrollToSelected((selectedIndex + 1) % count);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + count) % count);
      scrollToSelected((selectedIndex - 1 + count) % count);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.length < 2 && QUICK_LINKS[selectedIndex]) {
        navigateTo(QUICK_LINKS[selectedIndex].route);
      } else if (results[selectedIndex]) {
        navigateTo(results[selectedIndex].route);
      }
    }
  }

  function scrollToSelected(index: number) {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-palette-item]');
    items[index]?.scrollIntoView({ block: 'nearest' });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white px-3 py-1.5 rounded-lg border border-white/20 cursor-pointer text-xs font-medium transition-all"
        title="Ctrl+K"
      >
        <Search size={13} />
        <span className="hidden sm:inline">חיפוש מהיר</span>
        <kbd className="hidden sm:inline bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-blue-200 border border-white/10">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in border border-border-light"
        onClick={e => e.stopPropagation()}
        style={{
          animation: 'paletteIn 0.15s ease-out',
        }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-light">
          <Search size={18} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-base outline-none border-none bg-transparent text-text-primary placeholder:text-text-muted"
            placeholder="חפש חשבוניות, ספקים, מוצרים, סכומים..."
            dir="auto"
          />
          {loading && <Loader2 size={16} className="text-primary animate-spin shrink-0" />}
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 bg-surface hover:bg-border-light rounded-lg border-none cursor-pointer text-text-muted transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {query.length < 2 ? (
            /* Quick Links */
            <div>
              <p className="text-xs text-text-muted px-5 py-2 font-medium">ניווט מהיר</p>
              {QUICK_LINKS.map((link, i) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.route}
                    data-palette-item
                    onClick={() => navigateTo(link.route)}
                    className={`w-full flex items-center gap-3 px-5 py-3 border-none cursor-pointer text-right transition-colors ${
                      selectedIndex === i
                        ? 'bg-primary/5 text-primary'
                        : 'bg-transparent text-text-primary hover:bg-surface'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedIndex === i ? 'bg-primary/10' : 'bg-surface'
                    }`}>
                      <Icon size={15} className={selectedIndex === i ? 'text-primary' : 'text-text-muted'} />
                    </div>
                    <span className="text-sm font-medium">{link.label}</span>
                    <ArrowLeft size={14} className="mr-auto text-text-muted" />
                  </button>
                );
              })}
              <div className="px-5 py-3 border-t border-border-light mt-2">
                <p className="text-xs text-text-muted">
                  הקלד לפחות 2 תווים לחיפוש · הקלד מספר לחיפוש לפי סכום
                </p>
              </div>
            </div>
          ) : results.length > 0 ? (
            /* Search Results */
            <div>
              <p className="text-xs text-text-muted px-5 py-2 font-medium">
                {results.length} תוצאות עבור &ldquo;{query}&rdquo;
              </p>
              {results.map((result, i) => {
                const Icon = TYPE_ICONS[result.icon];
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    data-palette-item
                    onClick={() => navigateTo(result.route)}
                    className={`w-full flex items-center gap-3 px-5 py-3 border-none cursor-pointer text-right transition-colors ${
                      selectedIndex === i
                        ? 'bg-primary/5'
                        : 'bg-transparent hover:bg-surface'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLORS[result.icon]}`}>
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary truncate">{result.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[result.icon]}`}>
                          {TYPE_LABELS[result.icon]}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted truncate mt-0.5">{result.subtitle}</p>
                    </div>
                    {result.amount !== undefined && (
                      <span className="text-sm font-bold text-text-primary shrink-0">
                        ₪{result.amount.toLocaleString()}
                      </span>
                    )}
                    <ArrowLeft size={14} className="text-text-muted shrink-0" />
                  </button>
                );
              })}
            </div>
          ) : !loading ? (
            /* No Results */
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center mb-3">
                <Search size={20} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-secondary font-medium">לא נמצאו תוצאות</p>
              <p className="text-xs text-text-muted mt-1">נסה מילות חיפוש אחרות או מספר חשבונית</p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-border-light bg-surface/50 text-[11px] text-text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-white px-1 py-0.5 rounded border border-border text-[10px]">↑↓</kbd>
              ניווט
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white px-1 py-0.5 rounded border border-border text-[10px]">Enter</kbd>
              בחירה
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white px-1 py-0.5 rounded border border-border text-[10px]">Esc</kbd>
              סגירה
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes paletteIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
