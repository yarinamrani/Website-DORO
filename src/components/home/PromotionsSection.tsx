import { Link } from 'react-router-dom';

const promos = [
  {
    image: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600&h=400&fit=crop',
    title: 'מבצעים חמים',
    subtitle: 'עד 40% הנחה',
    color: 'from-pink-primary/80',
  },
  {
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&h=400&fit=crop',
    title: 'קולקציה חדשה',
    subtitle: 'פריטים שרק הגיעו',
    color: 'from-brown/80',
  },
  {
    image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&h=400&fit=crop',
    title: 'סטים תואמים',
    subtitle: 'הלוק המושלם',
    color: 'from-pink-dark/80',
  },
];

export default function PromotionsSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <h2 className="text-2xl md:text-3xl font-black text-center mb-8">
        🔥 מבצעים חמים בחנות
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {promos.map((promo, index) => (
          <Link
            key={index}
            to="/shop"
            className="relative h-52 md:h-64 rounded-2xl overflow-hidden group no-underline"
          >
            <img
              src={promo.image}
              alt={promo.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${promo.color} to-transparent`} />
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
