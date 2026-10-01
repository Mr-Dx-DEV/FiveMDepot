'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function DownloadPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const code = window.location.pathname.split('/download/')[1];
    if (!code) {
      setStatus('error');
      setMessage('Invalid download code');
      return;
    }

    fetch(`/api/download/${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setMessage('Download link sent to your email!');
          // Trigger actual download
          window.location.href = data.downloadUrl;
        } else {
          setStatus('error');
          setMessage(data.error || 'Invalid or expired download link');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Failed to process download');
      });
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="text-4xl text-luxury-gold mb-4"
          >
            ⟳
          </motion.div>
        )}
        {status === 'success' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-4xl text-green-400 mb-4"
          >
            ✓
          </motion.div>
        )}
        {status === 'error' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-4xl text-red-400 mb-4"
          >
            ✕
          </motion.div>
        )}
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
}
