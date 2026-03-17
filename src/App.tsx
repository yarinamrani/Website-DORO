import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Layout from './components/layout/Layout';
import PaseoLayout from './components/layout/PaseoLayout';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import InvoiceDashboard from './pages/InvoiceDashboard';
import InvoicesPage from './pages/InvoicesPage';
import SuppliersPage from './pages/SuppliersPage';

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="product/:id" element={<ProductPage />} />
            <Route path="cart" element={<CartPage />} />
          </Route>
          <Route path="/invoices" element={<PaseoLayout />}>
            <Route index element={<InvoiceDashboard />} />
            <Route path="list" element={<InvoicesPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;
