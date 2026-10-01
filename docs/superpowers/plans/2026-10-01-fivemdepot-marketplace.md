# FiveMDepot Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full multi-vendor FiveM asset marketplace with animated dark luxury homepage, neon cyberpunk product sections, Discord/Google auth, manual payment verification, and buyer/seller/admin dashboards.

**Architecture:** Next.js 15 monolith with App Router — single codebase serving frontend pages, API routes, and admin dashboard. PostgreSQL on Plesk hosting for data, FTP for file storage, Resend for email delivery.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL, NextAuth.js (Discord + Google + Email), Framer Motion, GSAP, Resend, Sharp

**Spec:** [docs/superpowers/specs/2026-10-01-fivemdepot-marketplace-design.md](./2026-10-01-fivemdepot-marketplace-design.md)

## Global Constraints

- Next.js 15 with App Router (`next@^15.0.0`)
- PostgreSQL database on Plesk (host: 185.223.31.164, db: fivemdepot)
- Password hashing with bcrypt (`bcryptjs@^5.0.0`)
- All API routes must implement rate limiting (100 req/min per IP)
- Download links expire after 7 days
- File uploads validated: max 50MB, images only for screenshots/proofs, ZIP for assets
- SQL injection prevention via Prisma parameterized queries (no raw SQL for user input)
- Content Security Policy header on all responses
- Responsive design: mobile (320px+), tablet (768px+), desktop (1280px+)
- Color: dark luxury `#0a0a0a` background on homepage, neon cyberpunk `#0d1117` on product sections
- Typography: Space Grotesk for headings, Inter for body, JetBrains Mono for code
- Animation: Framer Motion for page/card transitions, GSAP for hero/logo, particles.js for background

## Review Focus

- OAuth redirect URI mismatch — Discord/Google callback URLs must match exactly what's registered in developer portals
- FTP file upload failure — ensure credentials and path resolution work on Windows dev machine and Linux production
- Download link forgery — verify download codes are unpredictable (crypto random) and one-time use
- Payment proof access control — ensure buyers can only see their own proofs, admins can see all
- Image optimization bypass — Sharp must process all uploaded images; never serve raw uploads

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/styles/globals.css`

**Interfaces:**
- Produces: Project with Next.js, Tailwind, TypeScript configured
- Produces: Root layout with Inter font and global styles

- [ ] **Step 1: Initialize package.json with all dependencies**

```json
{
  "name": "fivemdepot",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "test": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^6.0.0",
    "next-auth": "^4.24.7",
    "bcryptjs": "^2.4.3",
    "resend": "^4.0.0",
    "sharp": "^0.33.0",
    "nodemailer": "^6.9.0",
    "zod": "^3.23.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "framer-motion": "^11.0.0",
    "lottie-react": "^2.4.0",
    "react-icons": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/nodemailer": "^6.4.0",
    "typescript": "^5.6.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "prisma": "^6.0.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@playwright/test": "^1.48.0",
    "eslint": "^9.0.0",
    "@types/eslint": "^9.6.0"
  }
}
```

- [ ] **Step 2: Create next.config.ts**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 3: Create tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark Luxury (Homepage)
        luxury: {
          bg: '#0a0a0a',
          gold: '#d4af37',
          goldDark: '#b8860b',
          card: 'rgba(255, 255, 255, 0.03)',
        },
        // Neon Cyberpunk (Product Sections)
        neon: {
          bg: '#0d1117',
          cyan: '#00f0ff',
          magenta: '#ff00aa',
          border: 'rgba(0, 240, 255, 0.2)',
        },
        // Neutrals
        surface: {
          DEFAULT: '#18181b',
          input: '#09090b',
          border: '#27272a',
        },
      },
      fontFamily: {
        heading: ['var(--font-space-grotesk)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.8', filter: 'brightness(1.3)' },
        },
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 240, 255, 0.3)',
        'neon-magenta': '0 0 20px rgba(255, 0, 170, 0.3)',
        'gold': '0 0 20px rgba(212, 175, 55, 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Create .env.example**

```env
# Database
DATABASE_URL="postgresql://fivemdepot:FIVVEM@22316@185.223.31.164:5432/fivemdepot"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Discord OAuth
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
DISCORD_REDIRECT_URI="http://localhost:3000/api/auth/callback/discord"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/callback/google"

# Email
RESEND_API_KEY="your-resend-api-key"
NEXT_PUBLIC_FROM_EMAIL="noreply@fivemdepot.com"

# FTP
FTP_HOST="185.223.31.164"
FTP_USER="fivemdepot"
FTP_PASSWORD="your-ftp-password"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 6: Create src/styles/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --font-space-grotesk: 'Space Grotesk', sans-serif;
    --font-inter: 'Inter', sans-serif;
    --font-jetbrains-mono: 'JetBrains Mono', monospace;
  }

  * {
    border-color: theme('colors.surface.border');
  }

  body {
    background-color: #0a0a0a;
    color: #ffffff;
    font-family: var(--font-inter), sans-serif;
  }

  ::selection {
    background-color: rgba(212, 175, 55, 0.3);
    color: #ffffff;
  }
}

@layer components {
  .glass-card {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .neon-border {
    border: 1px solid rgba(0, 240, 255, 0.2);
    box-shadow: 0 0 20px rgba(0, 240, 255, 0.1);
  }

  .gold-border {
    border: 1px solid rgba(212, 175, 55, 0.3);
    box-shadow: 0 0 20px rgba(212, 175, 55, 0.1);
  }

  .gradient-text {
    background: linear-gradient(135deg, #d4af37, #f0c75e, #d4af37);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: gradient-x 3s ease infinite;
  }

  .gradient-text-neon {
    background: linear-gradient(135deg, #00f0ff, #ff00aa, #00f0ff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: gradient-x 3s ease infinite;
  }

  .btn-primary {
    @apply px-6 py-3 rounded-lg font-medium transition-all duration-300;
    background: linear-gradient(135deg, #d4af37, #b8860b);
    color: #0a0a0a;
  }

  .btn-primary:hover {
    @apply shadow-gold transform scale-105;
  }

  .btn-neon {
    @apply px-6 py-3 rounded-lg font-medium transition-all duration-300;
    background: linear-gradient(135deg, #00f0ff, #0088cc);
    color: #0d1117;
    box-shadow: 0 0 15px rgba(0, 240, 255, 0.2);
  }

  .btn-neon:hover {
    @apply shadow-neon-cyan transform scale-105;
  }
}
```

- [ ] **Step 7: Create src/app/layout.tsx**

```typescript
import type { Metadata } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FiveMDepot — Premium FiveM Assets Marketplace',
  description: 'Buy and sell premium FiveM scripts, MLOs, maps, and vehicles. The #1 marketplace for FiveM developers.',
  keywords: ['fivem', 'gta v', 'marketplace', 'scripts', 'MLO', 'vehicles', 'five m'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable} font-body antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create src/app/page.tsx (placeholder)**

```typescript
export default function HomePage() {
  return (
    <main>
      <h1>FiveMDepot</h1>
      <p>Coming soon — premium FiveM assets marketplace.</p>
    </main>
  );
}
```

- [ ] **Step 9: Install dependencies**

```bash
npm install
npx prisma init
```

- [ ] **Step 10: Commit**

```bash
git add package.json next.config.ts tailwind.config.ts tsconfig.json .env.example src/app/layout.tsx src/app/page.tsx src/styles/globals.css prisma/
git commit -m "feat: scaffold Next.js project with Tailwind and Prisma"
```

---

### Task 2: Database Schema & Prisma

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Create: `src/types/index.ts`

**Interfaces:**
- Consumes: PostgreSQL connection from `.env`
- Produces: Prisma client with all models, migrations ready to run

- [ ] **Step 1: Create prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  BUYER
  SELLER
  ADMIN
}

enum ProductCategory {
  SCRIPT
  MLO
  VEHICLE
}

enum ProductStatus {
  DRAFT
  PUBLISHED
  REJECTED
}

enum OrderStatus {
  PENDING
  VERIFIED
  REJECTED
  COMPLETED
}

enum PaymentMethod {
  BKASH
  NAGAD
  BANK_TRANSFER
}

enum SellerStatus {
  PENDING
  APPROVED
  REJECTED
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String       @id @default(cuid())
  name          String?
  email         String       @unique
  emailVerified DateTime?
  password      String?
  image         String?
  role          UserRole     @default(BUYER)
  discordId     String?      @unique
  googleId      String?      @unique
  walletBalance Float        @default(0)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  accounts    Account[]
  sessions    Session[]
  products    Product[]       @relation("ProductSeller")
  orders      Order[]         @relation("OrderBuyer")
  sellerProfile SellerProfile?
  reviews     Review[]        @relation("ReviewAuthor")
  verifiedOrders Order[]      @relation("OrderVerifier")
  downloadCodes DownloadCode[]

  @@index([email])
}

model Product {
  id            String           @id @default(cuid())
  userId        String
  slug          String           @unique
  title         String
  description   String           @db.Text
  category      ProductCategory
  price         Float
  screenshots   String[]         // FTP paths
  files         String           // FTP path to ZIP
  tags          String[]
  version       String           @default("1.0.0")
  compatibility String[]         // ESX, QBCore, etc.
  status        ProductStatus    @default(DRAFT)
  downloads     Int              @default(0)
  featured      Boolean          @default(false)
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  seller    User      @relation("ProductSeller", fields: [userId], references: [id])
  orders    Order[]
  reviews   Review[]

  @@index([slug])
  @@index([category, status])
  @@index([featured, status])
}

model Order {
  id             String        @id @default(cuid())
  userId         String
  productId      String
  status         OrderStatus   @default(PENDING)
  amount         Float
  paymentProof   String?       // FTP path
  adminNote      String?       @db.Text
  downloadCode   String?       @unique
  verifiedBy     String?
  verifiedAt     DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  buyer    User    @relation("OrderBuyer", fields: [userId], references: [id])
  product  Product @relation(fields: [productId], references: [id])
  verifier User?   @relation("OrderVerifier", fields: [verifiedBy], references: [id])
  downloadCodeEntry DownloadCode?

  @@index([userId, status])
  @@index([productId, status])
}

model SellerProfile {
  id         String      @id @default(cuid())
  userId     String      @unique
  bio        String?     @db.Text
  discordTag String?
  status     SellerStatus @default(PENDING)
  approvedAt DateTime?
  payoutInfo String?     @db.Text // Bank/Bkash details JSON string

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Review {
  id        String     @id @default(cuid())
  userId    String
  productId String
  rating    Int
  comment   String?    @db.Text
  createdAt DateTime   @default(now())

  user    User    @relation("ReviewAuthor", fields: [userId], references: [id])
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
}

model DownloadCode {
  id        String   @id @default(cuid())
  orderId   String   @unique
  code      String   @unique
  expiresAt DateTime
  isUsed    Boolean  @default(false)
  createdAt DateTime @default(now())

  order Order @relation(fields: [orderId], references: [id])

  @@index([code])
  @@index([expiresAt])
}

model Category {
  id    String @id @default(cuid())
  name  String @unique
  slug  String @unique
  icon  String // icon class name
  order Int    @default(0)

  products Product[]
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

- [ ] **Step 2: Create src/lib/prisma.ts**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
```

- [ ] **Step 3: Create src/types/index.ts**

```typescript
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
```

- [ ] **Step 4: Run Prisma migration**

```bash
npx prisma migrate dev --name init
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/prisma.ts src/types/index.ts
git commit -m "feat: define database schema with Prisma"
```

---

### Task 3: Authentication System

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/auth-config.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/lib/bcrypt.ts`
- Create: `src/lib/session.ts`

**Interfaces:**
- Consumes: Prisma client, Discord/Google OAuth credentials from env
- Produces: NextAuth with Discord + Google + email/password, session helpers, role-based guards

- [ ] **Step 1: Create src/lib/auth-config.ts**

```typescript
import { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { comparePassword } from './bcrypt';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        const isValid = await comparePassword(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'discord' || account?.provider === 'google') {
        // Create or update user from OAuth
        if (profile?.email) {
          await prisma.user.upsert({
            where: { email: profile.email as string },
            create: {
              email: profile.email as string,
              name: (profile.name as string) || (profile.login as string) || 'User',
              image: profile.image?.url || profile.picture?.url || profile.avatar_url || null,
              role: 'BUYER',
            },
            update: {},
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  refreshInterval: 300, // 5 minutes
};
```

- [ ] **Step 2: Create src/lib/bcrypt.ts**

```typescript
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
```

- [ ] **Step 3: Create src/app/api/auth/[...nextauth]/route.ts**

```typescript
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-config';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

- [ ] **Step 4: Create src/lib/session.ts**

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from './auth-config';
import { prisma } from './prisma';
import { UserRole } from '@prisma/client';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) throw new Error('Forbidden');
  return user;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-config.ts src/lib/bcrypt.ts src/lib/session.ts src/app/api/auth/\[...nextauth\]/route.ts
git commit -m "feat: add authentication with Discord, Google, and email/password"
```

---

### Task 4: Core Layout Components

**Files:**
- Create: `src/components/shared/Navbar.tsx`
- Create: `src/components/shared/Footer.tsx`
- Create: `src/components/shared/ThemeProvider.tsx`

**Interfaces:**
- Consumes: NextAuth session, Tailwind classes
- Produces: Animated navbar with logo, nav links, auth buttons; responsive footer

- [ ] **Step 1: Create src/components/shared/Navbar.tsx**

```typescript
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { FaBars, FaTimes, FaUserCircle } from 'react-icons/fa';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/shop', label: 'Shop' },
    { href: '/dashboard', label: 'Dashboard' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <motion.div
              className="text-2xl font-heading font-bold gradient-text"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              FiveMDepot
            </motion.div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-300 hover:text-luxury-gold transition-colors duration-300 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-luxury-gold group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/auth/login">
              <motion.button
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Login
              </motion.button>
            </Link>
            <Link href="/auth/register">
              <motion.button
                className="btn-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Register
              </motion.button>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden text-gray-300"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          className="md:hidden glass-card border-t-0"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
        >
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-gray-300 hover:text-luxury-gold transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/auth/login">
              <span className="block text-gray-300 hover:text-luxury-gold">Login</span>
            </Link>
            <Link href="/auth/register">
              <span className="block btn-primary text-center">Register</span>
            </Link>
          </div>
        </motion.div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Create src/components/shared/Footer.tsx**

```typescript
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
              <li><Link href="/shop" className="text-gray-400 hover:text-luxury-gold transition-colors">Shop</Link></li>
              <li><Link href="/" className="text-gray-400 hover:text-luxury-gold transition-colors">Home</Link></li>
              <li><Link href="/auth/register" className="text-gray-400 hover:text-luxury-gold transition-colors">Register</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Categories</h4>
            <ul className="space-y-2">
              <li><Link href="/shop?category=script" className="text-gray-400 hover:text-luxury-gold transition-colors">Scripts</Link></li>
              <li><Link href="/shop?category=mlo" className="text-gray-400 hover:text-luxury-gold transition-colors">MLOs & Maps</Link></li>
              <li><Link href="/shop?category=vehicle" className="text-gray-400 hover:text-luxury-gold transition-colors">Vehicles</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link href="/docs" className="text-gray-400 hover:text-luxury-gold transition-colors">Documentation</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-luxury-gold transition-colors">Contact</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-luxury-gold transition-colors">Terms of Service</Link></li>
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
```

- [ ] **Step 3: Update src/app/layout.tsx to include Navbar and Footer**

```typescript
import type { Metadata } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FiveMDepot — Premium FiveM Assets Marketplace',
  description: 'Buy and sell premium FiveM scripts, MLOs, maps, and vehicles.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable} font-body antialiased bg-luxury-bg`}>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 pt-16">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/Navbar.tsx src/components/shared/Footer.tsx src/app/layout.tsx
git commit -m "feat: add animated navbar and footer layout"
```

---

## Phase 2: Homepage & Shop

### Task 5: Animated Homepage

**Files:**
- Create: `src/components/homepage/HeroBanner.tsx`
- Create: `src/components/homepage/CategoryShowcase.tsx`
- Create: `src/components/homepage/FeaturedProducts.tsx`
- Create: `src/components/homepage/StatsCounter.tsx`
- Create: `src/components/homepage/ParticleBackground.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: Navbar, Footer (from Task 4)
- Produces: Full animated homepage with hero, categories, featured products, stats

- [ ] **Step 1: Create src/components/homepage/ParticleBackground.tsx**

```typescript
'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: Particle[] = [];
    const particleCount = 60;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const createParticles = () => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.1,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(212, 175, 55, ${0.1 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    resize();
    createParticles();
    animate();

    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  );
}
```

- [ ] **Step 2: Create src/components/homepage/HeroBanner.tsx**

```typescript
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import ParticleBackground from './ParticleBackground';

export default function HeroBanner() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Particle Background */}
      <div className="absolute inset-0 bg-luxury-bg">
        <ParticleBackground />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-luxury-bg/50 to-luxury-bg" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-heading font-bold mb-6">
            <span className="gradient-text">Premium</span>
            <br />
            <span className="text-white">FiveM</span>
            <br />
            <span className="gradient-text">Assets</span>
          </h1>
        </motion.div>

        <motion.p
          className="text-xl sm:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Buy and sell the best scripts, MLOs, maps, and vehicles
          for your FiveM server.
        </motion.p>

        <motion.div
          className="flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Link href="/shop">
            <motion.button
              className="btn-primary text-lg px-8 py-4"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Browse Assets
            </motion.button>
          </Link>
          <Link href="/auth/register">
            <motion.button
              className="px-8 py-4 rounded-lg font-medium border border-luxury-gold/30 text-luxury-gold hover:bg-luxury-gold/10 transition-all duration-300 text-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Selling
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-luxury-gold/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-luxury-gold rounded-full mt-2" />
        </div>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 3: Create src/components/homepage/CategoryShowcase.tsx**

```typescript
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaCode, FaMapMarkedAlt, FaCar } from 'react-icons/fa';

const categories = [
  {
    name: 'Scripts',
    slug: 'script',
    icon: FaCode,
    description: 'Ready-to-use scripts for your server',
    count: '120+ assets',
    gradient: 'from-luxury-gold/20 to-luxury-gold/5',
    borderColor: 'border-luxury-gold/30',
    hoverColor: 'hover:border-luxury-gold',
  },
  {
    name: 'MLOs & Maps',
    slug: 'mlo',
    icon: FaMapMarkedAlt,
    description: 'Custom interiors and exterior maps',
    count: '80+ assets',
    gradient: 'from-neon-cyan/20 to-neon-cyan/5',
    borderColor: 'border-neon-cyan/30',
    hoverColor: 'hover:border-neon-cyan',
  },
  {
    name: 'Vehicles',
    slug: 'vehicle',
    icon: FaCar,
    description: 'High-quality custom vehicles',
    count: '200+ assets',
    gradient: 'from-neon-magenta/20 to-neon-magenta/5',
    borderColor: 'border-neon-magenta/30',
    hoverColor: 'hover:border-neon-magenta',
  },
];

export default function CategoryShowcase() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-heading font-bold gradient-text mb-4">
            Browse Categories
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Find exactly what your server needs
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.slug}
              className={`glass-card rounded-2xl p-8 border ${cat.borderColor} ${cat.hoverColor} transition-all duration-300 group cursor-pointer`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              whileHover={{ y: -8 }}
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center mb-6`}>
                <cat.icon className="text-3xl text-white" />
              </div>
              <h3 className="text-2xl font-heading font-bold text-white mb-2">
                {cat.name}
              </h3>
              <p className="text-gray-400 mb-2">{cat.description}</p>
              <p className="text-sm text-luxury-gold mb-6">{cat.count}</p>
              <Link href={`/shop?category=${cat.slug}`}>
                <span className="inline-flex items-center gap-2 text-luxury-gold font-medium group-hover:gap-3 transition-all">
                  Browse →
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create src/components/homepage/FeaturedProducts.tsx**

```typescript
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    title: string;
    category: string;
    price: number;
    screenshots: string[];
    seller: { name: string; image: string | null };
  };
}

function ProductCard({ product }: ProductCardProps) {
  const categoryColors: Record<string, string> = {
    SCRIPT: 'bg-luxury-gold/20 text-luxury-gold',
    MLO: 'bg-neon-cyan/20 text-neon-cyan',
    VEHICLE: 'bg-neon-magenta/20 text-neon-magenta',
  };

  const categoryLabels: Record<string, string> = {
    SCRIPT: 'Script',
    MLO: 'MLO/Map',
    VEHICLE: 'Vehicle',
  };

  return (
    <motion.div
      className="glass-card rounded-xl overflow-hidden border border-surface-border hover:border-luxury-gold/30 transition-all duration-300 group"
      whileHover={{ y: -4 }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-surface-input relative overflow-hidden">
        {product.screenshots.length > 0 ? (
          <img
            src={product.screenshots[0]}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            No preview
          </div>
        )}
        <span className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium ${categoryColors[product.category] || ''}`}>
          {categoryLabels[product.category] || product.category}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-heading font-semibold text-white truncate">{product.title}</h3>
        <p className="text-sm text-gray-400 mt-1">by {product.seller.name}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-luxury-gold font-bold text-lg">${product.price}</span>
          <Link href={`/shop/${product.slug}`}>
            <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
              View Details →
            </span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function FeaturedProducts() {
  // TODO: Fetch from API in Phase 3
  const featuredProducts = [];

  return (
    <section className="py-24 px-4 bg-surface-input/50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-heading font-bold gradient-text mb-4">
            Featured Assets
          </h2>
          <p className="text-gray-400 text-lg">Hand-picked quality content</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/shop">
            <motion.button
              className="btn-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View All Assets
            </motion.button>
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create src/components/homepage/StatsCounter.tsx**

```typescript
'use client';

import { motion } from 'framer-motion';

interface StatItemProps {
  value: number;
  suffix: string;
  label: string;
}

function StatItem({ value, suffix, label }: StatItemProps) {
  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-5xl font-heading font-bold gradient-text mb-2">
        {value.toLocaleString()}{suffix}
      </div>
      <div className="text-gray-400">{label}</div>
    </motion.div>
  );
}

export default function StatsCounter() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        <StatItem value={400} suffix="+" label="Assets" />
        <StatItem value={1200} suffix="+" label="Happy Buyers" />
        <StatItem value={200} suffix="+" label="Sellers" />
        <StatItem value={50} suffix="+" label="Countries" />
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Update src/app/page.tsx**

```typescript
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
```

- [ ] **Step 7: Commit**

```bash
git add src/components/homepage/ src/app/page.tsx
git commit -m "feat: build animated homepage with hero, categories, featured products, and stats"
```

---

## Phase 3: Shop & Product Pages

### Task 6: Shop/Browse Page

**Files:**
- Create: `src/app/shop/page.tsx`
- Create: `src/components/shop/ProductCard.tsx`
- Create: `src/components/shop/CategoryFilter.tsx`
- Create: `src/components/shop/SearchBar.tsx`
- Create: `src/components/shop/SortDropdown.tsx`

**Interfaces:**
- Consumes: Products from database
- Produces: Browse page with category filter, search, sort, grid/list toggle

### Task 7: Product Detail Page

**Files:**
- Create: `src/app/shop/[slug]/page.tsx`
- Create: `src/components/product/ImageGallery.tsx`
- Create: `src/components/product/ProductInfo.tsx`
- Create: `src/components/product/ReviewList.tsx`
- Create: `src/components/product/RelatedProducts.tsx`

**Interfaces:**
- Consumes: Product by slug from database
- Produces: Full product page with gallery, info, reviews, related products

---

## Phase 4: Commerce

### Task 8: Shopping Cart

**Files:**
- Create: `src/lib/cart.ts` (in-memory cart for now)
- Create: `src/app/cart/page.tsx`
- Create: `src/components/cart/CartItem.tsx`
- Create: `src/components/cart/CartSummary.tsx`

**Interfaces:**
- Produces: Cart page with items, quantity, total, checkout button

### Task 9: Checkout & Payment Upload

**Files:**
- Create: `src/app/checkout/page.tsx`
- Create: `src/components/checkout/PaymentMethodSelector.tsx`
- Create: `src/components/checkout/PaymentProofUpload.tsx`
- Create: `src/app/api/orders/route.ts`
- Create: `src/lib/ftp.ts`

**Interfaces:**
- Produces: Checkout flow with Bkash/Nagad/Bank options, payment proof upload to FTP
- Produces: Order creation API with download code generation

### Task 10: Email Notifications

**Files:**
- Create: `src/lib/email.ts`
- Create: `src/lib/email-templates.ts`

**Interfaces:**
- Produces: Email sending via Resend for order verification, download links

---

## Phase 5: Dashboards

### Task 11: Buyer Dashboard

**Files:**
- Create: `src/app/dashboard/buyer/page.tsx`
- Create: `src/components/dashboard/buyer/OrderHistory.tsx`
- Create: `src/components/dashboard/buyer/DownloadManager.tsx`
- Create: `src/components/dashboard/buyer/WalletDisplay.tsx`

### Task 12: Seller Dashboard

**Files:**
- Create: `src/app/dashboard/seller/page.tsx`
- Create: `src/app/dashboard/seller/products/page.tsx`
- Create: `src/app/dashboard/seller/products/new/page.tsx`
- Create: `src/components/dashboard/seller/ProductList.tsx`
- Create: `src/components/dashboard/seller/EarningsChart.tsx`
- Create: `src/app/api/products/route.ts`

**Interfaces:**
- Produces: Product upload form with file/screenshot upload to FTP
- Produces: Earnings analytics and withdrawal request flow

### Task 13: Admin Panel

**Files:**
- Create: `src/app/dashboard/admin/page.tsx`
- Create: `src/app/dashboard/admin/orders/page.tsx`
- Create: `src/app/dashboard/admin/sellers/page.tsx`
- Create: `src/app/dashboard/admin/products/page.tsx`
- Create: `src/app/dashboard/admin/settings/page.tsx`
- Create: `src/app/api/admin/orders/[id]/verify/route.ts`
- Create: `src/app/api/admin/sellers/[id]/approve/route.ts`

**Interfaces:**
- Produces: Payment verification queue
- Produces: Seller approval/rejection
- Produces: Product management (approve/reject)
- Produces: User management and site settings

---

## Phase 6: Auth Pages

### Task 14: Login & Register Pages

**Files:**
- Create: `src/app/auth/login/page.tsx`
- Create: `src/app/auth/register/page.tsx`
- Create: `src/app/auth/error/page.tsx`
- Create: `src/components/auth/SocialLoginButtons.tsx`
- Create: `src/components/auth/PasswordInput.tsx`

**Interfaces:**
- Produces: Login with Discord/Google buttons + email/password form
- Produces: Register with Discord/Google buttons + email/password form
- Produces: Account creation flow with seller onboarding option

---

## Phase 7: Testing & Polish

### Task 15: Testing Suite

**Files:**
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/unit/auth.test.ts`
- Create: `tests/unit/cart.test.ts`
- Create: `tests/component/product-card.test.tsx`
- Create: `tests/e2e/checkout.spec.ts`

### Task 16: Performance & Deployment

**Files:**
- Create: `src/lib/seo.ts`
- Create: `src/middleware.ts`
- Create: `src/lib/ftp.ts` (deployment helper)
- Create: `DEPLOYMENT.md`

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|------------------|
| 1: Foundation | 1-4 | Project setup, DB schema, auth, layout |
| 2: Homepage & Shop | 5 | Animated homepage |
| 3: Shop & Products | 6-7 | Browse, filters, product pages |
| 4: Commerce | 8-10 | Cart, checkout, payment upload, email |
| 5: Dashboards | 11-13 | Buyer, seller, admin panels |
| 6: Auth Pages | 14 | Login/register with OAuth |
| 7: Testing & Polish | 15-16 | Tests, performance, deployment |

**Total: 16 tasks across 7 phases**
