'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaBolt, FaMoneyBillWave, FaLandmark } from 'react-icons/fa';

export default function CheckoutPage() {
  const router = useRouter();
  const [method, setMethod] = useState<'bkash' | 'nagad' | 'bank'>('bkash');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem('fivemdepot-cart');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setItems(parsed);
        setTotal(parsed.reduce((sum: number, i: any) => sum + i.price, 0));
      } catch {
        setItems([]);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) return;

    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('method', method);
    formData.append('files', proofFile);
    formData.append('items', JSON.stringify(items));
    formData.append('total', total.toString());

    const res = await fetch('/api/orders', {
      method: 'POST',
      body: formData,
    });

    setLoading(false);

    if (res.ok) {
      localStorage.removeItem('fivemdepot-cart');
      router.push('/dashboard/buyer');
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">Your cart is empty</p>
          <a href="/shop" className="btn-primary">
            Browse Assets
          </a>
        </div>
      </div>
    );
  }

  const paymentInfo: Record<string, string[]> = {
    bkash: ['Send to: 01XXXXXXXXX', 'App: bKash', 'Type: Personal'],
    nagad: ['Send to: 01XXXXXXXXX', 'App: Nagad', 'Type: Personal'],
    bank: ['Bank: DBBL', 'Account: 0000000000000', 'Branch: Dhaka'],
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-heading font-bold gradient-text mb-8">Checkout</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Payment Method */}
          <div className="glass-card rounded-xl p-6">
            <h2 className="font-heading font-bold text-white mb-4">Payment Method</h2>
            <div className="space-y-3 mb-6">
              {[
                { id: 'bkash' as const, label: 'bKash', icon: FaBolt, color: 'text-pink-400' },
                { id: 'nagad' as const, label: 'Nagad', icon: FaMoneyBillWave, color: 'text-orange-400' },
                { id: 'bank' as const, label: 'Bank Transfer', icon: FaLandmark, color: 'text-blue-400' },
              ].map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                    method === id
                      ? 'border-luxury-gold bg-luxury-gold/10'
                      : 'border-surface-border hover:border-gray-500'
                  }`}
                >
                  <Icon className={`${color} text-xl`} />
                  <span className="text-white font-medium">{label}</span>
                </button>
              ))}
            </div>

            {paymentInfo[method] && (
              <div className="bg-surface-input rounded-lg p-4 border border-surface-border">
                <p className="text-sm text-gray-400 mb-2">Send payment to:</p>
                {paymentInfo[method].map((line, i) => (
                  <p key={i} className="text-luxury-gold text-sm font-mono">{line}</p>
                ))}
              </div>
            )}
          </div>

          {/* Upload Proof */}
          <div className="glass-card rounded-xl p-6">
            <h2 className="font-heading font-bold text-white mb-4">Upload Payment Proof</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-primary"
                  placeholder="Your name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Your Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-primary"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Payment Screenshot</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="input-primary file:bg-luxury-gold/20 file:text-luxury-gold file:border-0 file:rounded-lg file:px-4 file:py-2 file:cursor-pointer"
                  required
                />
              </div>

              {/* Order Summary */}
              <div className="border-t border-surface-border pt-4">
                <div className="flex justify-between font-heading font-bold text-lg">
                  <span className="text-white">Total</span>
                  <span className="gradient-text">${total.toFixed(2)}</span>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  You'll receive download links via email after payment verification
                </p>
              </div>

              <motion.button
                type="submit"
                className="w-full btn-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading || !proofFile}
              >
                {loading ? 'Submitting...' : 'Submit Payment Proof'}
              </motion.button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
