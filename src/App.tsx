import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import InvoiceDashboard from './pages/InvoiceDashboard';
import InvoicesPage from './pages/InvoicesPage';
import SuppliersPage from './pages/SuppliersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PaseoLayout from './components/layout/PaseoLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PaseoLayout />}>
          <Route index element={<InvoiceDashboard />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
