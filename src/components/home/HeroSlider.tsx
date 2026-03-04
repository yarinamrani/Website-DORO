import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=1400&h=700&fit=crop',
    title: 'DORO',
    subtitle: 'בגדי תינוקות לבנים',
    cta: 'לחנות',
  },
  {
    image: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=1400&h=700&fit=crop',
    title: 'קולקציית אביב',
    subtitle: 'פריטים חדשים שרק הגיעו',
    cta: 'לקולקציה',
  },
  {
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=1400&h=700&fit=crop',
    title: 'מבצעי סוף עונה',
    subtitle: 'עד 50% הנחה על פריטים נבחרים',
    cta: 'למבצעים',
  },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-[450px] md:h-[600px] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black/40 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-4 w-full">
              <div className="max-w-lg">
                <h2 className="text-5xl md:text-7xl font-black text-white mb-3 leading-tight tracking-wide">
                  {slide.title}
                </h2>
                <p className="text-lg md:text-2xl text-white/90 mb-8 font-light">
                  {slide.subtitle}
                </p>
                <Link
                  to="/shop"
                  className="inline-block bg-white text-text-primary no-underline px-10 py-3.5 rounded-full font-bold text-sm hover:bg-pink-light transition-colors"
                >
                  {slide.cta}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation arrows */}
      <button
        onClick={() => setCurrent(prev => (prev + 1) % slides.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm border-none text-white p-2.5 rounded-full cursor-pointer hover:bg-white/40 transition-colors"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={() => setCurrent(prev => (prev - 1 + slides.length) % slides.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm border-none text-white p-2.5 rounded-full cursor-pointer hover:bg-white/40 transition-colors"
      >
        <ChevronRight size={24} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`h-2.5 rounded-full border-none cursor-pointer transition-all ${
              index === current ? 'bg-white w-8' : 'bg-white/40 w-2.5'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
