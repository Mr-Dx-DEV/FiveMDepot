'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaTrash, FaShoppingCart } from 'react-icons/fa';

interface CartItem {
  id: string;
  slug: string;
  title: string;
  price: number;
  screenshots: string[];
  seller: { name: string };
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('fivemdepot-cart');
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch {
        setItems([]);
      }
    }
  }, []);

  const removeItem = (slug: string) => {
    const updated = items.filter((i) => i.slug !== slug);
    setItems(updated);
    localStorage.setItem('fivemdepot-cart', JSON.stringify(updated));
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-heading font-bold gradient-text mb-8">
          Shopping Cart
        </h1>

        {items.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-2xl">
            <FaShoppingCart size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-6">Your cart is empty</p>
            <Link href="/shop">
              <motion.button className="btn-primary" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                Browse Assets
              </motion.button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <motion.div
                  key={item.slug}
                  className="glass-card rounded-xl p-4 flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="w-24 h-16 shrink-0 rounded-lg bg-surface-input overflow-hidden">
                    {item.screenshots.length > 0 ? (
                      <img src={item.screenshots[0]} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No preview</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-white truncate">{item.title}</h3>
                    <p className="text-sm text-gray-400">by {item.seller.name}</p>
                    <span className="text-luxury-gold font-bold">${item.price.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => removeItem(item.slug)}
                    className="text-gray-500 hover:text-red-400 transition-colors self-start"
                  >
                    <FaTrash size={16} />
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Summary */}
            <div className="glass-card rounded-xl p-6 h-fit sticky top-24">
              <h3 className="font-heading font-bold text-white mb-4">Order Summary</h3>
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.slug} className="flex justify-between text-sm">
                    <span className="text-gray-400 truncate max-w-32">{item.title}</span>
                    <span className="text-white">${item.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-surface-border pt-4 mb-6 flex justify-between">
                <span className="font-semibold text-white">Total</span>
                <span className="font-heading font-bold text-xl gradient-text">${total.toFixed(2)}</span>
              </div>
              <Link href="/checkout">
                <motion.button className="w-full btn-primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  Proceed to Checkout
                </motion.button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
