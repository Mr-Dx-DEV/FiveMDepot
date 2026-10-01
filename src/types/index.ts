import { UserRole, ProductCategory, ProductStatus, OrderStatus, SellerStatus } from '@prisma/client';

export type { UserRole, ProductCategory, ProductStatus, OrderStatus, SellerStatus };

export interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  password: string | null;
  image: string | null;
  role: UserRole;
  discordId: string | null;
  googleId: string | null;
  walletBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description: string;
  category: ProductCategory;
  price: number;
  screenshots: string[];
  files: string;
  tags: string[];
  version: string;
  compatibility: string[];
  status: ProductStatus;
  downloads: number;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  productId: string;
  status: OrderStatus;
  amount: number;
  paymentProof: string | null;
  adminNote: string | null;
  downloadCode: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerProfile {
  id: string;
  userId: string;
  bio: string | null;
  discordTag: string | null;
  status: SellerStatus;
  approvedAt: Date | null;
  payoutInfo: string | null;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export interface DownloadCode {
  id: string;
  orderId: string;
  code: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  order: number;
}
