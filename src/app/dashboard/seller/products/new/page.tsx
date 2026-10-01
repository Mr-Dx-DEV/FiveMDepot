'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ProductCategory } from '@prisma/client';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'SCRIPT' as ProductCategory,
    price: '',
    tags: '',
    version: '1.0.0',
    compatibility: '',
  });
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [assetFile, setAssetFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const form = new FormData();
    form.append('title', formData.title);
    form.append('description', formData.description);
    form.append('category', formData.category);
    form.append('price', formData.price);
    form.append('tags', formData.tags);
    form.append('version', formData.version);
    form.append('compatibility', formData.compatibility);
    screenshotFiles.forEach((f) => form.append('screenshots', f));
    if (assetFile) form.append('files', assetFile);

    const res = await fetch('/api/products', {
      method: 'POST',
      body: form,
    });

    setLoading(false);

    if (res.ok) {
      router.push('/dashboard/seller');
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-heading font-bold gradient-text mb-2">Upload New Asset</h1>
        <p className="text-gray-400 mb-8">Add a new product to your store</p>

        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Product Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-primary"
              placeholder="e.g., Premium Police Script Pack"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
              className="input-primary"
            >
              <option value="SCRIPT">Script</option>
              <option value="MLO">MLO / Map</option>
              <option value="VEHICLE">Vehicle</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-primary min-h-32"
              placeholder="Describe your asset..."
              required
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="input-primary"
              placeholder="9.99"
              required
            />
          </div>

          {/* Tags & Compatibility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="input-primary"
                placeholder="police, script, esx"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Compatibility (comma-separated)</label>
              <input
                type="text"
                value={formData.compatibility}
                onChange={(e) => setFormData({ ...formData, compatibility: e.target.value })}
                className="input-primary"
                placeholder="ESX, QBCore"
              />
            </div>
          </div>

          {/* Version */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Version</label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              className="input-primary"
              placeholder="1.0.0"
            />
          </div>

          {/* Screenshots */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Screenshots</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setScreenshotFiles(Array.from(e.target.files || []))}
              className="input-primary file:bg-luxury-gold/20 file:text-luxury-gold file:border-0 file:rounded-lg file:px-4 file:py-2 file:cursor-pointer"
            />
          </div>

          {/* Asset File */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Asset File (ZIP)</label>
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setAssetFile(e.target.files?.[0] || null)}
              className="input-primary file:bg-luxury-gold/20 file:text-luxury-gold file:border-0 file:rounded-lg file:px-4 file:py-2 file:cursor-pointer"
            />
          </div>

          <motion.button
            type="submit"
            className="w-full btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            {loading ? 'Uploading...' : 'Upload Asset'}
          </motion.button>
        </form>
      </div>
    </div>
  );
}
