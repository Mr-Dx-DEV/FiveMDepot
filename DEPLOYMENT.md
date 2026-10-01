# FiveMDepot — Deployment Guide

## Prerequisites

1. **Plesk Hosting** with Node.js support (check your panel)
2. **PostgreSQL database** on your Plesk server (your current DB at 185.223.31.164)
3. **FTP access** to your Plesk server
4. **Node.js 18+** installed locally

## Step 1: Enable External PostgreSQL Access

Your database is at `185.223.31.164`. To connect from your local machine:

1. Log into your Plesk panel
2. Go to **Tools & Settings → Firewall**
3. Add a rule to allow incoming connections on port **5432** from your IP
4. Or go to **Databases → pgAdmin** and ensure remote connections are enabled

If your hosting provider doesn't allow external PostgreSQL connections, you'll need to:
- Use `prisma db push` on the server itself (via SSH), OR
- Switch to Prisma Postgres (free tier) for development

## Step 2: Run Database Migration

Once external access is enabled:

```bash
cd E:\Project\FiveMDepot
npx prisma migrate dev --name init
```

This creates all tables in your Plesk PostgreSQL database.

## Step 3: Configure Environment Variables

Copy `.env.local` to your production server and update:

```env
# Update NEXTAUTH_URL to your domain
NEXTAUTH_URL="https://fivemdepot.com"

# Update RESEND_API_KEY
RESEND_API_KEY="re_b38ek2oT_Ne3FZacbWj1EVyhNmUCZSiQJ"

# Update Discord/Google OAuth URIs to your domain
DISCORD_REDIRECT_URI="https://fivemdepot.com/api/auth/callback/discord"
GOOGLE_REDIRECT_URI="https://fivemdepot.com/api/auth/callback/google"

# Update NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_URL="https://fivemdepot.com"
```

## Step 4: Create Admin User

After migration, create your admin account manually:

```bash
# In Prisma Studio
npx prisma studio

# Or via Node:
node -e "
const { prisma } = require('./src/lib/prisma');
const bcrypt = require('bcryptjs');
prisma.user.create({
  data: {
    name: 'Admin',
    email: 'your-email@example.com',
    password: bcrypt.hashSync('your-password', 12),
    role: 'ADMIN',
  }
}).then(() => console.log('Admin created'));
"
```

## Step 5: Build & Deploy to Plesk

### Option A: Using Plesk Node.js App Manager

1. Log into Plesk panel
2. Go to **Extensions → My Extensions → Add Extensions**
3. Search for and install **Node.js** extension
4. Create a new Node.js application
5. Upload files via FTP to the app directory
6. Set start file to `server.js` or use `next start`
7. Set environment variables in the Plesk panel

### Option B: Manual Deployment via FTP

1. Build the project locally:
   ```bash
   npm run build
   ```

2. Upload the following via FTP to your Plesk web root:
   - `package.json`
   - `node_modules/` (run `npm install` on server first)
   - `.next/`
   - `public/`
   - `prisma/`
   - `src/`
   - `next.config.ts`
   - `tailwind.config.ts`
   - `tsconfig.json`
   - `.env.local`

3. On the server, run:
   ```bash
   npx prisma generate
   npx prisma db push
   npm start
   ```

### Option C: Using PM2 (Recommended)

1. Install PM2 on your server
2. Create `ecosystem.config.js`:
   ```js
   module.exports = {
     apps: [{
       name: 'fivemdepot',
       script: 'node_modules/next/dist/bin/next',
       args: 'start',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3000,
       },
     }],
   };
   ```
3. Run:
   ```bash
   npm install --production
   npx prisma generate
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

## Step 6: Configure OAuth

### Discord
1. Go to https://discord.com/developers/applications
2. Update OAuth2 redirect URI to: `https://yourdomain.com/api/auth/callback/discord`
3. Copy Client ID and Client Secret to `.env.local`

### Google
1. Go to https://console.cloud.google.com/
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`
4. Copy Client ID and Client Secret to `.env.local`

## Step 7: Domain & SSL

1. Point your domain's A record to your Plesk server IP
2. Enable SSL in Plesk (Let's Encrypt)
3. Update all URLs to use HTTPS

## Troubleshooting

### Database connection fails
- Check firewall allows port 5432
- Verify DATABASE_URL in `.env.local`
- Try `telnet 185.223.31.164 5432` to test connectivity

### Next.js won't start on Plesk
- Ensure Node.js 18+ is installed
- Check Plesk logs for errors
- Try running `npm install --production` on the server

### OAuth not working
- Verify redirect URIs match exactly
- Check Client ID/Secret are correct
- Ensure Discord app has "members.read" scope
