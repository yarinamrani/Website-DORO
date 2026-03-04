import { Link } from 'react-router-dom';

const promos = [
  {
    image: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600&h=500&fit=crop',
    title: 'סטים לתינוקות',
    subtitle: 'קולקציה חדשה',
  },
  {
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&h=500&fit=crop',
    title: 'אקססוריז',
    subtitle: 'להשלמת הלוק',
  },
  {
    image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&h=500&fit=crop',
    title: 'מבצעים',
    subtitle: 'עד 40% הנחה',
  },
];

export default function PromotionsSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-14">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {promos.map((promo, index) => (
          <Link
            key={index}
            to="/shop"
            className="relative h-56 md:h-72 rounded-2xl overflow-hidden group no-underline"
          >
            <img
              src={promo.image}
              alt={promo.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-0 right-0 p-6 text-white">
              <h3 className="font-bold text-xl mb-1">{promo.title}</h3>
              <p className="text-white/80 text-sm">{promo.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
