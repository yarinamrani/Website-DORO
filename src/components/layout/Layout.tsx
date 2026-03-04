import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ShabbatOverlay from './ShabbatOverlay';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ShabbatOverlay />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
