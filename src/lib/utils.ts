import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateDownloadCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint32Array(32);
  crypto.getRandomValues(array);
  for (let i = 0; i < 32; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');
}

export function getCategoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    SCRIPT: 'Script',
    MLO: 'MLO/Map',
    VEHICLE: 'Vehicle',
  };
  return labels[cat] || cat;
}

export function getCategoryColor(cat: string): string {
  const colors: Record<string, string> = {
    SCRIPT: 'text-luxury-gold',
    MLO: 'text-neon-cyan',
    VEHICLE: 'text-neon-magenta',
  };
  return colors[cat] || 'text-gray-400';
}
