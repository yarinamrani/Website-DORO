import { useState, useMemo } from 'react';
import { products, categories } from '../data/products';
import ProductCard from '../components/ui/ProductCard';

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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-black mb-2">החנות שלנו</h1>
        <p className="text-text-secondary">כל הפריטים האהובים במקום אחד</p>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-3 justify-center mb-8">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-2 rounded-full border-none font-medium text-sm cursor-pointer transition-all ${
              activeCategory === cat
                ? 'bg-pink-primary text-white shadow-md'
                : 'bg-pink-light text-text-primary hover:bg-pink-primary hover:text-white'
            }`}
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
          className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none cursor-pointer"
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
  );
}
