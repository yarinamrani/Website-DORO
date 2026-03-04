export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  sizes: string[];
  colors: ProductColor[];
  description?: string;
  badge?: string;
  isNew?: boolean;
  isSale?: boolean;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
  color: string;
}
