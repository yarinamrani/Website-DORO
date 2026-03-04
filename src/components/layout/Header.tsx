import { Link } from 'react-router-dom';
import { ShoppingBag, Search, User, Heart, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '../../context/CartContext';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Mobile menu button */}
        <button
          className="md:hidden bg-transparent border-none p-1"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center no-underline">
          <h1 className="text-3xl font-black tracking-wider text-pink-primary" style={{ fontFamily: 'Heebo' }}>
            DORO
          </h1>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/shop" className="text-text-primary no-underline hover:text-pink-primary transition-colors font-medium text-sm">
            חנות
          </Link>
          <a href="#about" className="text-text-primary no-underline hover:text-pink-primary transition-colors font-medium text-sm">
            מי אנחנו
          </a>
          <a href="#loyalty" className="text-text-primary no-underline hover:text-pink-primary transition-colors font-medium text-sm">
            הצטרפות לדורו
          </a>
          <a href="#contact" className="text-text-primary no-underline hover:text-pink-primary transition-colors font-medium text-sm">
            יצירת קשר
          </a>
        </nav>

        {/* Icons */}
        <div className="flex items-center gap-5">
          <button className="bg-transparent border-none p-0 cursor-pointer text-text-primary hover:text-pink-primary transition-colors">
            <Search size={20} />
          </button>
          <button className="bg-transparent border-none p-0 cursor-pointer text-text-primary hover:text-pink-primary transition-colors">
            <User size={20} />
          </button>
          <button className="bg-transparent border-none p-0 cursor-pointer text-text-primary hover:text-pink-primary transition-colors">
            <Heart size={20} />
          </button>
          <Link to="/cart" className="relative text-text-primary hover:text-pink-primary transition-colors">
            <ShoppingBag size={20} />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-pink-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4">
          <nav className="flex flex-col gap-4">
            <Link to="/shop" onClick={() => setMenuOpen(false)} className="text-text-primary no-underline hover:text-pink-primary font-medium py-2">
              חנות
            </Link>
            <a href="#about" onClick={() => setMenuOpen(false)} className="text-text-primary no-underline hover:text-pink-primary font-medium py-2">
              מי אנחנו
            </a>
            <a href="#loyalty" onClick={() => setMenuOpen(false)} className="text-text-primary no-underline hover:text-pink-primary font-medium py-2">
              הצטרפות לדורו
            </a>
            <a href="#contact" onClick={() => setMenuOpen(false)} className="text-text-primary no-underline hover:text-pink-primary font-medium py-2">
              יצירת קשר
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
