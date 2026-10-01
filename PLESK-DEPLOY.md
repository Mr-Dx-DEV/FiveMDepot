# FiveMDepot — Plesk Deployment Guide

## Step 1: Install Node.js Extension in Plesk

1. Log into your Plesk panel: `https://panel.plesk-steve.zap.cloud/`
2. Go to **Extensions → My Extensions → Add Extensions**
3. Search for **"Node.js"** (by Plesk) and click **Install**
4. Wait for installation to complete

## Step 2: Create a Node.js Application

1. Go to **Hosting → Node.js apps** (or **Node.js Applications**)
2. Click **Add Node.js application**
3. Fill in:
   - **Application mode:** `production`
   - **Application root:** `/httpdocs` (or a subfolder like `/httpdocs/fivemdepot`)
   - **Application entry point:** `server.js`
   - **Start command:** `node server.js`
   - **Node.js version:** `18` or `20` (pick the latest available)
   - **Application URL:** `http://localhost:3000` (or your domain)
4. Click **OK**

## Step 3: Upload Files via FTP

Upload ALL these files to your Plesk web root (`/httpdocs` or your chosen folder):

```
package.json          ← MUST have
server.js             ← Entry point
ecosystem.config.js   ← PM2 config
.next/                ← Built Next.js files
node_modules/         ← Installed dependencies
public/               ← Static assets
prisma/               ← Schema + migrations
src/                  ← All source code
.env                  ← Environment variables
```

**Important:** You MUST run `npm install` and `npm run build` on the server before the app works.

## Step 4: Install Dependencies on Server

1. In Plesk, go to **Hosting → Node.js apps**
2. Click **Terminal** or **SSH** access
3. Run:

```bash
cd /httpdocs
npm install --production
npx prisma generate
```

If `npm install` fails, check the Node.js version in Plesk.

## Step 5: Set Environment Variables

In Plesk, go to **Hosting → Node.js apps** → your app → **Environment** section:

Add these environment variables:

```
DATABASE_URL=mysql://fivemdepot:FIVVEM@22316@localhost:3306/fivemdepot
NEXTAUTH_SECRET=599f09ed4af2b6ab52a86cba087177c60af6ce5fde7becf747c5d0eca5672cdb
RESEND_API_KEY=re_b38ek2oT_Ne3FZacbWj1EVyhNmUCZSiQJ
NODE_ENV=production
```

Or put them in the `.env` file (which I've already created).

## Step 6: Start the Application

1. In Plesk, go to **Hosting → Node.js apps**
2. Click **Start** on your application
3. Check the **Logs** to verify it started

You should see:
```
> Ready on http://localhost:3000
```

## Troubleshooting

### App won't start
- Check **Node.js version** in Plesk (must be 18+)
- Check **Logs** for specific errors
- Run `node server.js` manually via SSH to debug

### Database connection fails
- Verify database host in `.env` is `localhost` (not external IP)
- Check that the `fivemdepot` database exists in Plesk
- Import `database.sql` via phpMyAdmin first

### Port already in use
- Change the port in Plesk's Node.js app settings to `3001` or higher
- Update `PORT` in environment variables

### Blank page / 500 error
- Run `npm run build` on the server
- Check that `.next/` folder exists
- Check Plesk logs for errors

### Missing modules
- Run `npm install --production` on the server
- Make sure `node_modules/` was uploaded
