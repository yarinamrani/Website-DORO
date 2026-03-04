import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CartItem, Product } from '../types';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, size: string, color: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  totalItems: number;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode: string;
  setCouponCode: (code: string) => void;
  applyCoupon: () => void;
  couponApplied: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  const addToCart = (product: Product, size: string, color: string) => {
    setItems(prev => {
      const existing = prev.find(
        item => item.product.id === product.id && item.size === size && item.color === color
      );
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id && item.size === size && item.color === color
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, size, color }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = couponApplied ? Math.round(subtotal * 0.1) : 0;
  const shipping = subtotal > 200 ? 0 : 30;
  const total = subtotal - discount + shipping;

  const applyCoupon = () => {
    if (couponCode.trim().toUpperCase() === 'DORO10') {
      setCouponApplied(true);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items, addToCart, removeFromCart, updateQuantity,
        totalItems, subtotal, discount, shipping, total,
        couponCode, setCouponCode, applyCoupon, couponApplied,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
