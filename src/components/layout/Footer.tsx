import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-beige mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-black text-pink-primary mb-4">DORO</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              בגדי תינוקות איכותיים ומעוצבים, עשויים מחומרים טבעיים ובטוחים לעור הרך של התינוק שלכם.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold mb-4 text-text-primary">קישורים מהירים</h4>
            <ul className="list-none flex flex-col gap-2">
              <li><a href="/" className="text-text-secondary no-underline hover:text-pink-primary text-sm transition-colors">דף הבית</a></li>
              <li><a href="/shop" className="text-text-secondary no-underline hover:text-pink-primary text-sm transition-colors">חנות</a></li>
              <li><a href="#" className="text-text-secondary no-underline hover:text-pink-primary text-sm transition-colors">מבצעים</a></li>
              <li><a href="#" className="text-text-secondary no-underline hover:text-pink-primary text-sm transition-colors">אודות</a></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-bold mb-4 text-text-primary">שירות לקוחות</h4>
            <ul className="list-none flex flex-col gap-2">
              <li><a href="#" className="text-text-secondary no-underline hover:text-pink-primary text-sm transition-colors">מדיניות משלוחים</a></li>
              <li><a href="#" className="text-text-secondary no-underline hover:text-pink-primary text-sm transition-colors">החזרות והחלפות</a></li>
              <li><a href="#" className="text-text-secondary no-underline hover:text-pink-primary text-sm transition-colors">תנאי שימוש</a></li>
              <li><a href="#" className="text-text-secondary no-underline hover:text-pink-primary text-sm transition-colors">מדיניות פרטיות</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold mb-4 text-text-primary">צרו קשר</h4>
            <ul className="list-none flex flex-col gap-2 text-text-secondary text-sm">
              <li>📞 054-1234567</li>
              <li>✉️ info@doro.co.il</li>
              <li>📍 תל אביב, ישראל</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-beige-dark mt-8 pt-8 text-center">
          <p className="text-text-secondary text-sm flex items-center justify-center gap-1">
            נבנה באהבה <Heart size={14} className="text-pink-primary fill-pink-primary" /> DORO © 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
