# FiveMDepot — Multi-Vendor FiveM Asset Marketplace

## Design Specification

**Date:** 2026-10-01
**Status:** Draft — awaiting user review

---

## 1. Overview

FiveMDepot is a multi-vendor digital asset marketplace for the FiveM (GTA V modding) community. The platform allows:

- **Admins** (you) to sell your own assets directly
- **Third-party sellers** to register, list, and sell their assets
- **Buyers** to browse, purchase, and download FiveM assets

Assets include three categories: **Scripts**, **MLOs/Maps**, and **Vehicles**.

### Payment Model

Manual verification workflow:
1. Buyer selects asset → pays via Bkash/Nagad/Bank Transfer
2. Buyer uploads payment proof on the platform
3. Admin reviews and verifies the payment
4. Buyer receives download link via email

### Seller Payouts

Sellers have an internal wallet balance tracking their earnings. Admins manage withdrawals manually.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│                  Next.js App                     │
│                                                   │
│  Pages:                                           │
│  / → Homepage (animated hero, featured)           │
│  /shop → Browse all assets                        │
│  /shop/[slug] → Product detail                    │
│  /cart → Shopping cart                            │
│  /checkout → Payment upload                         │
│  /dashboard → Role-based routing                    │
│    /dashboard/buyer → Buyer dashboard               │
│    /dashboard/seller → Seller dashboard             │
│    /dashboard/admin → Admin panel                   │
│  /auth → Login/Register (Discord/Google/Email)      │
│                                                   │
│  API Routes:                                      │
│  /api/auth/* → NextAuth handlers                    │
│  /api/products/* → CRUD products                     │
│  /api/orders/* → Create/verify orders                │
│  /api/sellers/* → Seller onboarding                  │
│  /api/admin/* → Admin operations                     │
│                                                   │
│  Layers:                                          │
│  Prisma ORM → PostgreSQL (Plesk)                    │
│  NextAuth → Discord + Google + Email                 │
│  Resend → Email delivery (verification, downloads)   │
└─────────────────────────────────────────────────┘
```

### Technical Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Plesk) |
| ORM | Prisma |
| Auth | NextAuth.js (Discord + Google + Email/Password) |
| Animations | Framer Motion, GSAP, Lottie |
| Email | Resend.com |
| File Storage | Plesk FTP (asset files, screenshots, payment proofs) |
| Image Processing | Sharp |
| Testing | Vitest, Playwright, Chromatic |

---

## 3. Data Model

### Core Entities

#### User
- `id`, `name`, `email`, `avatar`, `role` (buyer/seller/admin)
- `password` (hashed), `discordId`, `googleId`
- `emailVerified`, `walletBalance`
- `createdAt`, `updatedAt`

#### Product
- `id`, `userId` (seller FK), `title`, `slug`
- `category` (script/mlo/vehicle), `price`
- `description`, `files` (FTP path), `screenshots` (JSON array)
- `tags` (JSON array), `version`, `compatibility` (JSON array)
- `isPublished`, `downloads` (count), `featured` (boolean)
- `createdAt`, `updatedAt`

#### Order
- `id`, `userId` (buyer FK), `status` (pending/verified/rejected/completed)
- `paymentProof` (FTP path), `amount`
- `verifiedBy` (admin FK), `verifiedAt`
- `downloadCode` (unique, expires after use)
- `createdAt`, `updatedAt`

#### SellerProfile
- `userId` (FK, PK)
- `bio`, `discordTag`
- `status` (pending/approved/rejected)
- `approvedAt`, `payoutInfo` (bank/Bkash details)

#### Category
- `id`, `name`, `slug`, `icon`, `order`

#### Review
- `id`, `userId` (reviewer FK), `productId` (FK)
- `rating` (1-5), `comment`
- `createdAt`

#### DownloadCode
- `id`, `orderId` (FK), `code` (unique)
- `expiresAt`, `isUsed`

### Relationships

```
User ──┬── Product (seller)
       ├── Order (buyer)
       ├── SellerProfile (one-to-one)
       ├── Review (reviewer)
       └── DownloadCode (issued)

Product ──┬── Order (many)
          ├── Review (many)
          └── Category (one)

Order ──┬── PaymentProof (one)
        └── DownloadCode (one)
```

---

## 4. Visual Design

### Color System

#### Dark Luxury (Homepage)
- Background: `#0a0a0a` (deep charcoal)
- Primary accent: `#d4af37` (gold)
- Secondary accent: `#b8860b` (dark gold)
- Text: `#ffffff` (white), `#a1a1aa` (muted)
- Cards: Glassmorphism (semi-transparent with blur)

#### Neon Cyberpunk (Product Sections)
- Background: `#0d1117` (dark navy)
- Primary accent: `#00f0ff` (cyan)
- Secondary accent: `#ff00aa` (magenta)
- Glows: `box-shadow: 0 0 20px rgba(0, 240, 255, 0.3)`
- Borders: `1px solid rgba(0, 240, 255, 0.2)`

#### Neutral
- Borders: `#27272a`
- Cards: `#18181b`
- Input backgrounds: `#09090b`

### Typography

| Element | Font | Weights |
|---------|------|---------|
| Headings | Space Grotesk | 600, 700 |
| Body | Inter | 400, 500 |
| Code/Tech | JetBrains Mono | 400, 500 |

### Animation System

| Element | Animation | Library |
|---------|-----------|---------|
| Logo | SVG morph + glow pulse, gold-to-neon gradient | GSAP |
| Hero Banner | Particle background, gradient text, scroll reveals | particles.js + Framer Motion |
| Navigation | Active underline animation, mobile slide | Framer Motion |
| Product Cards | Hover: scale + glow border, image zoom | Framer Motion |
| Page Transitions | Fade + slide | Framer Motion |
| CTA Buttons | Magnetic hover, ripple click, glow pulse | Framer Motion |
| Scroll Effects | Parallax hero, staggered reveals, counter | GSAP + Framer Motion |
| Micro-interactions | Heart, add-to-cart bounce, skeleton loading | Framer Motion |

---

## 5. Page Specifications

### Homepage

1. **Animated Logo** — SVG morph animation with gold glow, transitions to neon on scroll
2. **Hero Banner** — Full-screen, particle background, animated gradient headline, CTA buttons
3. **Category Showcase** — Three animated cards (Scripts, MLOs/Maps, Vehicles)
4. **Featured Products** — Horizontal scroll with staggered animation
5. **Stats Counter** — Animated numbers (products, sellers, buyers)
6. **Testimonials** — Auto-scrolling carousel
7. **Footer** — Links, social media, newsletter

### Shop/Browse Page

- Category sidebar filter
- Search bar with autocomplete
- Sort dropdown (price, newest, popular)
- Grid/list view toggle
- Product cards with category-specific layouts

### Product Detail Page

- Image gallery with zoom
- Price display with CTA
- Description tabs (Overview, Files, Compatibility)
- Reviews section
- Related products

### Checkout Flow

1. Cart review
2. Select payment method (Bkash/Nagad/Bank Transfer)
3. Upload payment proof (screenshot/receipt)
4. Order confirmation with tracking status

### Buyer Dashboard

- Purchase history
- Downloadable files (after verification)
- Wallet balance
- Profile settings

### Seller Dashboard

- Upload new product form
- Sales analytics (charts)
- Earnings tracker
- Withdrawal requests
- Product management

### Admin Panel

- Dashboard overview (stats, charts)
- Payment verification queue
- Product management (approve/reject)
- Seller approval management
- User management
- Category management
- Site settings

---

## 6. Testing Strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit | Vitest | API routes, auth helpers, utilities |
| Component | React Testing Library | Product cards, forms, dashboards |
| E2E | Playwright | Checkout, seller upload, admin verification |
| Visual | Chromatic | Animation states, responsive breakpoints |

---

## 7. Security Considerations

- Password hashing with bcrypt
- OAuth state parameter for CSRF protection
- File upload validation (type, size, virus scan)
- Rate limiting on API routes
- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (React auto-escaping, content security policy)
- Payment proof file access restricted to admin/buyer only
- Download links expire after 7 days

---

## 8. File Structure

```
FiveMDepot/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (shop)/
│   │   │   ├── shop/
│   │   │   ├── shop/[slug]/
│   │   │   ├── cart/
│   │   │   └── checkout/
│   │   ├── dashboard/
│   │   │   ├── buyer/
│   │   │   ├── seller/
│   │   │   └── admin/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   └── sellers/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/              # Reusable UI primitives
│   │   ├── homepage/        # Animated homepage sections
│   │   ├── shop/            # Product cards, filters
│   │   ├── dashboard/       # Dashboard-specific components
│   │   └── shared/          # Navigation, footer, etc.
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── ftp.ts           # FTP file management
│   │   ├── email.ts         # Resend email templates
│   │   └── utils.ts
│   ├── hooks/               # Custom React hooks
│   ├── styles/
│   │   └── globals.css
│   └── types/               # TypeScript types
├── public/
│   ├── assets/              # Static assets
│   └── logos/               # Logo files
├── tests/
│   ├── unit/
│   ├── component/
│   └── e2e/
├── .env.local
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 9. Deployment Plan

1. **Database:** Connect to Plesk PostgreSQL, run Prisma migrations
2. **Files:** Configure FTP upload for asset storage
3. **Environment:** Set up `.env` with database URL, OAuth credentials, FTP config
4. **Deploy:** Upload to Plesk via FTP/SFTP
5. **DNS:** Point domain to hosting
6. **Email:** Configure Resend API key for email delivery

### Environment Variables

```env
DATABASE_URL=postgresql://fivemdepot:<PASSWORD>@185.223.31.164:5432/fivemdepot
NEXTAUTH_SECRET=<generated>
NEXTAUTH_URL=https://yourdomain.com
DISCORD_CLIENT_ID=<from Discord developer portal>
DISCORD_CLIENT_SECRET=<from Discord developer portal>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
RESEND_API_KEY=<from resend.com>
FTP_HOST=185.223.31.164
FTP_USER=fivemdepot
FTP_PASSWORD=<encrypted>
```

---

## 10. Implementation Phases

### Phase 1: Foundation
- Project setup (Next.js, Tailwind, Prisma)
- Database schema & migrations
- Authentication (Discord + Google + Email)
- Core layout (navbar, footer)

### Phase 2: Homepage & Shop
- Animated homepage (logo, hero, particles)
- Product listing with filters
- Product detail pages
- Category-specific card layouts

### Phase 3: Commerce
- Shopping cart
- Checkout flow (payment upload)
- Order management
- Email notifications

### Phase 4: Dashboards
- Buyer dashboard (purchases, downloads)
- Seller dashboard (upload, analytics)
- Admin panel (verification, management)

### Phase 5: Polish
- All animations & micro-interactions
- Responsive design refinement
- Testing (unit, component, E2E)
- Performance optimization
- Deployment

---

## 11. Non-Goals (v1)

- Real-time chat between buyer/seller
- Automated payment reconciliation
- Multi-language support
- Mobile app
- API for third-party integrations

These can be added in future iterations.
