# Pokémon - The Model: Setup Guide

This guide will get your app running in about **10 minutes**.

---

## Overview

| Step | Time | What You'll Do |
|------|------|----------------|
| 1 | 2 min | Install Node.js (if you don't have it) |
| 2 | 2 min | Set up the project files |
| 3 | 3 min | Create Supabase database |
| 4 | 1 min | Add credentials to project |
| 5 | 2 min | Deploy to Netlify |

---

## Step 1: Install Node.js (One-Time)

**Check if you already have it:**
```bash
node --version
```
If you see a version number (like `v18.17.0`), skip to Step 2.

**If not installed:**
1. Go to https://nodejs.org
2. Download the **LTS** version (recommended)
3. Run the installer, click Next through everything
4. Restart your terminal

---

## Step 2: Set Up Project Files

**2.1 Extract the zip file** you downloaded to a folder (e.g., Desktop or Documents)

**2.2 Open a terminal in that folder:**
- **Mac:** Right-click folder → "New Terminal at Folder"
- **Windows:** Open folder, type `cmd` in address bar, press Enter
- **Or:** Open terminal and `cd` to the folder:
  ```bash
  cd ~/Desktop/pokemon-the-model
  ```

**2.3 Install dependencies:**
```bash
npm install
```
Wait about 30 seconds for it to finish.

**2.4 Test that it works:**
```bash
npm run dev
```
Open http://localhost:5173 in your browser. You should see the app!

> ⚠️ At this point, the app works but data won't persist. Continue to set up Supabase.

Press `Ctrl+C` to stop the dev server.

---

## Step 3: Create Supabase Database (Free)

**3.1 Create an account:**
- Go to https://supabase.com
- Click "Start your project"
- Sign up with GitHub (easiest) or email

**3.2 Create a new project:**
- Click "New Project"
- **Name:** `pokemon-the-model`
- **Database Password:** Create one and save it somewhere
- **Region:** Choose closest to you
- Click "Create new project"
- Wait ~2 minutes for it to set up

**3.3 Create the database table:**
- In your project dashboard, click **SQL Editor** (left sidebar)
- Click **+ New query**
- Copy the ENTIRE contents of `supabase-setup.sql` from your project folder
- Paste it into the SQL editor
- Click **Run** (or press Cmd/Ctrl + Enter)
- You should see "Success. No rows returned" - this is correct!

**3.4 Get your credentials:**
- Click **Settings** (gear icon, left sidebar)
- Click **API**
- Copy these two values:
  - **Project URL** (looks like `https://abcdefg.supabase.co`)
  - **anon public** key (long string starting with `eyJ...`)

---

## Step 4: Add Credentials to Project

**4.1 Create your .env file:**
```bash
cp .env.example .env
```

**4.2 Edit the .env file** (use any text editor):
```
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

**4.3 Test it:**
```bash
npm run dev
```
- Open http://localhost:5173
- Upload the sample CSV
- Refresh the page - your cards should still be there!

---

## Step 5: Deploy to Netlify (Free)

Now let's put it online so anyone can access it.

**5.1 Push to GitHub** (if you haven't already):
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pokemon-the-model.git
git push -u origin main
```

**5.2 Deploy on Netlify:**
1. Go to https://netlify.com and sign up (GitHub login is easiest)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** and select your repo
4. Settings should auto-detect:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **"Deploy site"**

**5.3 Add environment variables:**
1. Go to **Site settings** → **Environment variables**
2. Add these:
   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | Your Supabase URL |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
3. Go to **Deploys** → Click **"Trigger deploy"** → **"Deploy site"**

**5.4 Done!**
Your app is now live at something like:
```
https://pokemon-the-model.netlify.app
```

Share this link with friends - they can all view and add to the collection!

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Build for production | `npm run build` |
| Preview production build | `npm run preview` |

| File | Purpose |
|------|---------|
| `.env` | Your secret credentials (don't share!) |
| `supabase-setup.sql` | Database setup (run once in Supabase) |

---

## Troubleshooting

**"npm not found"**
→ Node.js isn't installed. Go back to Step 1.

**"VITE_SUPABASE_URL is undefined"**
→ Your .env file isn't set up correctly. Make sure it's named `.env` (not `.env.txt`)

**Cards disappear on refresh (locally)**
→ Supabase isn't configured. Check your .env values.

**Cards disappear on Netlify**
→ Environment variables aren't set in Netlify. Go to Site settings → Environment variables.

**Build fails on Netlify**
→ Check the deploy log for specific errors. Usually a missing dependency or typo.

---

## Need Help?

Check these resources:
- [Supabase Docs](https://supabase.com/docs)
- [Netlify Docs](https://docs.netlify.com)
- [Vite Docs](https://vitejs.dev)

---

Enjoy tracking your Pokémon cards! 🎴⚡
