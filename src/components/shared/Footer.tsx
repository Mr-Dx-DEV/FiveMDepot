import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface-input mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-heading font-bold gradient-text mb-4">
              FiveMDepot
            </h3>
            <p className="text-gray-400 text-sm">
              The #1 marketplace for premium FiveM assets. Scripts, MLOs, maps, and vehicles.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/shop"
                  className="text-gray-400 hover:text-luxury-gold transition-colors"
                >
                  Shop
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-gray-400 hover:text-luxury-gold transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/register"
                  className="text-gray-400 hover:text-luxury-gold transition-colors"
                >
                  Register
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Categories</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/shop?category=script"
                  className="text-gray-400 hover:text-luxury-gold transition-colors"
                >
                  Scripts
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=mlo"
                  className="text-gray-400 hover:text-luxury-gold transition-colors"
                >
                  MLOs & Maps
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=vehicle"
                  className="text-gray-400 hover:text-luxury-gold transition-colors"
                >
                  Vehicles
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/docs"
                  className="text-gray-400 hover:text-luxury-gold transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-400 hover:text-luxury-gold transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-gray-400 hover:text-luxury-gold transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-surface-border mt-8 pt-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} FiveMDepot. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
