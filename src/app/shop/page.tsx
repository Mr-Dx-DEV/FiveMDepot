import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/shop/ProductCard';
import CategoryFilter from '@/components/shop/CategoryFilter';
import SearchBar from '@/components/shop/SearchBar';
import SortDropdown from '@/components/shop/SortDropdown';

async function getProducts(category?: string, search?: string, sort?: string) {
  const where: any = { status: 'PUBLISHED' };

  if (category && category !== 'all') {
    where.category = category.toUpperCase();
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } },
    ];
  }

  const orderBy: any = {};
  switch (sort) {
    case 'price-low':
      orderBy.price = 'asc';
      break;
    case 'price-high':
      orderBy.price = 'desc';
      break;
    case 'newest':
      orderBy.createdAt = 'desc';
      break;
    case 'popular':
      orderBy.downloads = 'desc';
      break;
    default:
      orderBy.featured = 'desc';
      orderBy.createdAt = 'desc';
  }

  return prisma.product.findMany({
    where,
    orderBy,
    include: {
      seller: { select: { name: true, image: true } },
    },
    take: 100,
  });
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const products = await getProducts(params.category, params.search, params.sort);
  const categories = await prisma.category.findMany({ orderBy: { order: 'asc' } });

  // Default categories if none in DB
  const defaultCategories = [
    { id: 'all', name: 'All', slug: 'all' },
    { id: 'script', name: 'Scripts', slug: 'script' },
    { id: 'mlo', name: 'MLOs & Maps', slug: 'mlo' },
    { id: 'vehicle', name: 'Vehicles', slug: 'vehicle' },
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold gradient-text mb-2">
            Browse Assets
          </h1>
          <p className="text-gray-400">
            {products.length} assets available
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <SearchBar />
          </div>
          <div className="flex gap-4">
            <SortDropdown />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="md:w-56 shrink-0">
            <CategoryFilter categories={categories.length > 0 ? categories : defaultCategories} />
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {products.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-xl mb-4">No assets found</p>
                <p className="text-sm">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
