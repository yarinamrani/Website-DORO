import HeroSlider from '../components/home/HeroSlider';
import PromotionsSection from '../components/home/PromotionsSection';
import NewArrivals from '../components/home/NewArrivals';
import LoyaltyBanner from '../components/home/LoyaltyBanner';

export default function HomePage() {
  return (
    <>
      <HeroSlider />
      <PromotionsSection />
      <NewArrivals />
      <LoyaltyBanner />
    </>
  );
}
