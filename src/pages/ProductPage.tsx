import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { ShoppingBag, Heart, ChevronLeft } from 'lucide-react';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ui/ProductCard';
import LoyaltyBanner from '../components/home/LoyaltyBanner';

export default function ProductPage() {
  const { id } = useParams();
  const product = products.find(p => p.id === id);
  const { addToCart } = useCart();

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [currentImage, setCurrentImage] = useState(0);
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">המוצר לא נמצא</h2>
        <Link to="/shop" className="text-pink-primary no-underline font-medium">
          חזרה לחנות
        </Link>
      </div>
    );
  }

  const images = product.images || [product.image];
  const relatedProducts = products.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4);
  const complementary = products.filter(p => p.id !== product.id && p.category !== product.category).slice(0, 4);

  const handleAddToCart = () => {
    const size = selectedSize || product.sizes[0];
    const color = selectedColor || product.colors[0]?.name || '';
    addToCart(product, size, color);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-secondary mb-6">
        <Link to="/" className="text-text-secondary no-underline hover:text-pink-primary">דף הבית</Link>
        <ChevronLeft size={14} />
        <Link to="/shop" className="text-text-secondary no-underline hover:text-pink-primary">חנות</Link>
        <ChevronLeft size={14} />
        <span className="text-text-primary">{product.name}</span>
      </div>

      {/* Product Detail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        {/* Images */}
        <div>
          <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-beige mb-4">
            <img
              src={images[currentImage]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-3">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 cursor-pointer p-0 ${
                    currentImage === i ? 'border-pink-primary' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.badge && (
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-4 ${
              product.isSale ? 'bg-red-400' : 'bg-pink-primary'
            }`}>
              {product.badge}
            </span>
          )}

          <h1 className="text-2xl md:text-3xl font-black mb-2">{product.name}</h1>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl font-black text-pink-primary">₪{product.price}</span>
            {product.originalPrice && (
              <span className="text-lg text-text-secondary line-through">₪{product.originalPrice}</span>
            )}
            {product.originalPrice && (
              <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded text-sm font-bold">
                -{Math.round((1 - product.price / product.originalPrice) * 100)}%
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-text-secondary leading-relaxed mb-6">{product.description}</p>
          )}

          {/* Size Selection */}
          <div className="mb-6">
            <h3 className="font-bold mb-3">מידה</h3>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`min-w-[56px] py-2 px-4 rounded-lg border-2 font-medium text-sm cursor-pointer transition-all ${
                    selectedSize === size
                      ? 'border-pink-primary bg-pink-light text-pink-primary'
                      : 'border-gray-200 bg-white text-text-primary hover:border-pink-primary'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="mb-8">
            <h3 className="font-bold mb-3">צבע</h3>
            <div className="flex gap-3">
              {product.colors.map(color => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.name)}
                  className={`w-10 h-10 rounded-full border-2 cursor-pointer p-0 transition-all ${
                    selectedColor === color.name ? 'border-pink-primary scale-110' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              className={`flex-1 py-4 rounded-xl border-none font-bold text-base cursor-pointer transition-all flex items-center justify-center gap-2 ${
                added
                  ? 'bg-green-500 text-white'
                  : 'bg-pink-primary text-white hover:bg-pink-dark'
              }`}
            >
              <ShoppingBag size={20} />
              {added ? 'נוסף בהצלחה! ✓' : 'הוסף לסל'}
            </button>
            <button className="p-4 rounded-xl border-2 border-gray-200 bg-white cursor-pointer hover:border-pink-primary hover:text-pink-primary transition-all">
              <Heart size={20} />
            </button>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-beige rounded-xl">
              <div className="text-lg mb-1">🚚</div>
              <p className="text-xs text-text-secondary">משלוח חינם מעל ₪200</p>
            </div>
            <div className="text-center p-3 bg-beige rounded-xl">
              <div className="text-lg mb-1">↩️</div>
              <p className="text-xs text-text-secondary">החזרה תוך 14 יום</p>
            </div>
            <div className="text-center p-3 bg-beige rounded-xl">
              <div className="text-lg mb-1">💯</div>
              <p className="text-xs text-text-secondary">100% כותנה</p>
            </div>
          </div>
        </div>
      </div>

      {/* Complementary Products */}
      {complementary.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-black mb-6">💫 משלימים את הסטייל עם</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {complementary.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-black mb-6">🛍️ מוצרים דומים</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Loyalty Banner */}
      <LoyaltyBanner />
    </div>
  );
}
