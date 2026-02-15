# JustWrite — Setup Guide

## Quick Start (Local Only, No Account Needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000 and start writing. Files are saved in your browser's local storage.

---

## Full Setup with Supabase (Cloud Sync + Auth)

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **"New Project"**
3. Give it a name (e.g., "justwrite")
4. Choose a strong database password (save it somewhere)
5. Select your preferred region
6. Click **"Create new project"** and wait ~2 minutes

### Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings > API**
2. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy the **anon/public key** (the long string under "Project API keys")

### Step 3: Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Open the file `supabase/migration.sql` from this repo
4. Copy-paste the entire contents into the SQL editor
5. Click **"Run"**
6. You should see "Success. No rows returned" — that means it worked

### Step 4: Configure Auth

1. Go to **Authentication > Providers**
2. Make sure **Email** is enabled (it is by default)
3. Optionally disable "Confirm email" for faster testing:
   - Go to **Authentication > Settings**
   - Under "Email Auth", toggle off "Enable email confirmations"

### Step 5: Set Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
2. Fill in your Supabase values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Step 6: Run the App

```bash
npm run dev
```

Now sign up works, and cloud users get their files synced across devices.

---

## Stripe Setup (Payments)

### Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. In the Stripe Dashboard, go to **Developers > API Keys**
3. Copy the **Publishable key** and **Secret key**

### Step 2: Create Products

1. Go to **Products** in Stripe Dashboard
2. Create two products:

   **Cloud Plan:**
   - Name: "JustWrite Cloud"
   - Price: €4.99/month (recurring)
   - Copy the Price ID (starts with `price_`)

   **Desktop Plan:**
   - Name: "JustWrite Desktop"
   - Price: €14.99/month (recurring)
   - Copy the Price ID

### Step 3: Set Up Webhook

1. Go to **Developers > Webhooks**
2. Add endpoint: `https://your-domain.com/api/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copy the **Webhook signing secret**

### Step 4: Update Environment Variables

Add to your `.env.local`:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_CLOUD_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_DESKTOP_PRICE_ID=price_...
```

### Step 5: Install Stripe

```bash
npm install stripe @stripe/stripe-js
```

Then uncomment the Stripe code in the API route files under `src/app/api/`.

---

## Desktop App (Electron)

### Development

```bash
# Install Electron (already in devDependencies)
npm install

# Run Next.js dev server first
npm run dev

# In another terminal, run Electron
npm run electron:dev
```

### Build for Distribution

```bash
npm run electron:build
```

This creates distributable packages in `dist-electron/`.

The desktop app provides **true focus mode**: it goes fullscreen, stays on top of all windows, and blocks keyboard shortcuts like Alt+Tab during your writing session.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Styles (dark/warm theme)
│   ├── auth/
│   │   ├── signin/page.tsx   # Sign in
│   │   └── signup/page.tsx   # Sign up
│   ├── dashboard/
│   │   └── page.tsx          # File management
│   ├── write/
│   │   └── [id]/page.tsx     # The writing editor + timer
│   └── api/
│       ├── checkout/route.ts # Stripe checkout
│       ├── portal/route.ts   # Stripe billing portal
│       └── webhook/route.ts  # Stripe webhooks
├── lib/
│   ├── auth-context.tsx      # Auth state management
│   ├── constants.ts          # Plans, limits, config
│   ├── storage.ts            # Local + cloud storage
│   ├── stripe.ts             # Stripe client helpers
│   └── supabase.ts           # Supabase client
electron/
├── main.js                   # Electron main process
└── preload.js                # Bridge to renderer
supabase/
└── migration.sql             # Database schema
```
