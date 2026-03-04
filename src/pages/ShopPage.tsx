import { useState, useMemo } from 'react';
import { products, categories } from '../data/products';
import ProductCard from '../components/ui/ProductCard';
import LoyaltyBanner from '../components/home/LoyaltyBanner';

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState('הכל');
  const [sortBy, setSortBy] = useState('default');

  const filtered = useMemo(() => {
    let result = activeCategory === 'הכל'
      ? products
      : products.filter(p => p.category === activeCategory);

    if (sortBy === 'price-asc') result = [...result].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') result = [...result].sort((a, b) => b.price - a.price);
    if (sortBy === 'newest') result = [...result].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));

    return result;
  }, [activeCategory, sortBy]);

  return (
    <div>
      {/* Hero Banner */}
      <div className="relative h-48 md:h-64 bg-pink-light overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-l from-pink-primary/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center relative z-10">
          <div>
            <h1 className="text-3xl md:text-5xl font-black mb-2 text-text-primary">החנות שלנו</h1>
            <p className="text-text-secondary text-base md:text-lg">כל הפריטים האהובים במקום אחד</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-full border-none font-medium text-sm cursor-pointer transition-all ${
                activeCategory === cat
                  ? 'bg-pink-primary text-white shadow-md'
                  : 'bg-white text-text-primary border border-gray-200 hover:bg-pink-light'
              }`}
              style={activeCategory !== cat ? { border: '1px solid #e5e7eb' } : {}}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort & Count */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-text-secondary text-sm">{filtered.length} מוצרים</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none cursor-pointer"
            dir="rtl"
          >
            <option value="default">מיון: ברירת מחדל</option>
            <option value="price-asc">מחיר: מהנמוך לגבוה</option>
            <option value="price-desc">מחיר: מהגבוה לנמוך</option>
            <option value="newest">חדשים ראשון</option>
          </select>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filtered.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-text-secondary text-lg">לא נמצאו מוצרים בקטגוריה זו</p>
          </div>
        )}
      </div>

      <LoyaltyBanner />
    </div>
  );
}
