import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PaseoLayout from './components/layout/PaseoLayout';
import InvoiceDashboard from './pages/InvoiceDashboard';
import InvoicesPage from './pages/InvoicesPage';
import SuppliersPage from './pages/SuppliersPage';
import AnalyticsPage from './pages/AnalyticsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PaseoLayout />}>
          <Route index element={<InvoiceDashboard />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
