import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, Tag } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartPage() {
  const {
    items, removeFromCart, updateQuantity,
    subtotal, discount, shipping, total,
    couponCode, setCouponCode, applyCoupon, couponApplied,
  } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6">🛒</div>
        <h2 className="text-2xl font-bold mb-4">העגלה ריקה</h2>
        <p className="text-text-secondary mb-8">נראה שעוד לא הוספת מוצרים לעגלה</p>
        <Link
          to="/shop"
          className="inline-block bg-pink-primary text-white no-underline px-8 py-3 rounded-full font-bold hover:bg-pink-dark transition-colors"
        >
          לחנות
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-8">🛒 העגלה שלי</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {items.map(item => (
            <div
              key={item.product.id}
              className="flex gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-50"
            >
              {/* Image */}
              <Link to={`/product/${item.product.id}`} className="shrink-0">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-24 h-28 md:w-28 md:h-32 object-cover rounded-xl"
                />
              </Link>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <Link to={`/product/${item.product.id}`} className="no-underline">
                    <h3 className="font-bold text-text-primary mb-1">{item.product.name}</h3>
                  </Link>
                  <p className="text-text-secondary text-sm">
                    מידה: {item.size} | צבע: {item.color}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 bg-beige rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="bg-transparent border-none p-2 cursor-pointer text-text-primary hover:text-pink-primary"
                    >
                      <Plus size={16} />
                    </button>
                    <span className="font-bold min-w-[20px] text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="bg-transparent border-none p-2 cursor-pointer text-text-primary hover:text-pink-primary"
                    >
                      <Minus size={16} />
                    </button>
                  </div>

                  <span className="font-bold text-lg text-pink-primary">
                    ₪{item.product.price * item.quantity}
                  </span>
                </div>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeFromCart(item.product.id)}
                className="bg-transparent border-none p-1 cursor-pointer text-text-secondary hover:text-red-400 self-start transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 sticky top-24">
            <h2 className="font-bold text-lg mb-6">סיכום הזמנה</h2>

            {/* Coupon */}
            <div className="flex gap-2 mb-6">
              <div className="flex-1 flex items-center bg-beige rounded-lg overflow-hidden">
                <Tag size={16} className="mr-3 text-text-secondary" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  placeholder="קוד קופון"
                  className="bg-transparent border-none outline-none flex-1 py-2.5 text-sm"
                  dir="rtl"
                />
              </div>
              <button
                onClick={applyCoupon}
                className="bg-pink-primary text-white border-none px-4 py-2.5 rounded-lg font-bold text-sm cursor-pointer hover:bg-pink-dark transition-colors whitespace-nowrap"
              >
                החל
              </button>
            </div>

            {couponApplied && (
              <p className="text-green-600 text-sm mb-4 font-medium">✓ קופון הופעל! 10% הנחה</p>
            )}

            {/* Breakdown */}
            <div className="flex flex-col gap-3 text-sm border-b border-gray-100 pb-4 mb-4">
              <div className="flex justify-between">
                <span className="text-text-secondary">סכום ביניים</span>
                <span className="font-medium">₪{subtotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>הנחת קופון</span>
                  <span className="font-medium">-₪{discount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">משלוח</span>
                <span className="font-medium">{shipping === 0 ? 'חינם!' : `₪${shipping}`}</span>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold text-lg">סה״כ</span>
              <span className="font-black text-2xl text-pink-primary">₪{total}</span>
            </div>

            <button className="w-full bg-pink-primary text-white border-none py-4 rounded-xl font-bold text-base cursor-pointer hover:bg-pink-dark transition-colors flex items-center justify-center gap-2">
              <ShoppingBag size={20} />
              לתשלום
            </button>

            <Link
              to="/shop"
              className="block text-center mt-4 text-text-secondary no-underline text-sm hover:text-pink-primary transition-colors"
            >
              המשך קניות →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
