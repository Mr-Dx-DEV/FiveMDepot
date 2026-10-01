import HeroBanner from '@/components/homepage/HeroBanner';
import CategoryShowcase from '@/components/homepage/CategoryShowcase';
import FeaturedProducts from '@/components/homepage/FeaturedProducts';
import StatsCounter from '@/components/homepage/StatsCounter';

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <CategoryShowcase />
      <FeaturedProducts />
      <StatsCounter />
    </>
  );
}
