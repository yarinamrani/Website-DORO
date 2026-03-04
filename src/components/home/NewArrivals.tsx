import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
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
    <section className="max-w-7xl mx-auto px-4 py-14">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-black">כזה עוד לא ראית</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('right')}
            className="bg-pink-light border-none p-2.5 rounded-full cursor-pointer hover:bg-pink-primary hover:text-white transition-colors text-pink-primary"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => scroll('left')}
            className="bg-pink-light border-none p-2.5 rounded-full cursor-pointer hover:bg-pink-primary hover:text-white transition-colors text-pink-primary"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto hide-scrollbar pb-4"
      >
        {newProducts.map(product => (
          <div key={product.id} className="min-w-[220px] md:min-w-[260px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      <div className="text-center mt-10">
        <Link
          to="/shop"
          className="inline-block bg-pink-primary text-white no-underline px-10 py-3.5 rounded-full font-bold text-sm hover:bg-pink-dark transition-colors"
        >
          כל המוצרים החדשים
        </Link>
      </div>
    </section>
  );
}
