import { Link } from 'react-router-dom';
import { ShoppingBag, Heart } from 'lucide-react';
import type { Product } from '../../types';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, product.sizes[0], product.colors[0]?.name || '');
  };

  return (
    <Link to={`/product/${product.id}`} className="group no-underline block">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-50">
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-beige">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Badge */}
          {product.badge && (
            <span className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold text-white ${
              product.isSale ? 'bg-red-400' : 'bg-pink-primary'
            }`}>
              {product.badge}
            </span>
          )}
          {/* Wishlist */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm text-text-primary border-none p-2 rounded-full cursor-pointer hover:bg-white hover:text-pink-primary transition-all opacity-0 group-hover:opacity-100"
          >
            <Heart size={16} />
          </button>
          {/* Add to cart */}
          <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={handleAddToCart}
              className="w-full bg-pink-primary text-white border-none py-2.5 rounded-xl font-bold text-sm cursor-pointer hover:bg-pink-dark transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag size={16} />
              הוסף לסל
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="text-text-primary font-medium text-sm mb-2 truncate">{product.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-pink-primary font-bold text-lg">{product.price} &#8362;</span>
            {product.originalPrice && (
              <span className="text-text-secondary line-through text-sm">{product.originalPrice} &#8362;</span>
            )}
          </div>
          {/* Color dots */}
          {product.colors.length > 1 && (
            <div className="flex gap-1.5 mt-2">
              {product.colors.map(color => (
                <span
                  key={color.name}
                  className="w-4 h-4 rounded-full border border-gray-200"
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
