import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { products } from '../../data/products';
import ProductCard from '../ui/ProductCard';

export default function NewArrivals() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = dir === 'left' ? -300 : 300;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const newProducts = products.filter(p => p.isNew || p.isSale).slice(0, 8);

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-black">✨ כזה עוד לא ראית</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('right')}
            className="bg-pink-light border-none p-2 rounded-full cursor-pointer hover:bg-pink-primary hover:text-white transition-colors text-pink-primary"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => scroll('left')}
            className="bg-pink-light border-none p-2 rounded-full cursor-pointer hover:bg-pink-primary hover:text-white transition-colors text-pink-primary"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto hide-scrollbar pb-4"
      >
        {newProducts.map(product => (
          <div key={product.id} className="min-w-[220px] md:min-w-[260px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
