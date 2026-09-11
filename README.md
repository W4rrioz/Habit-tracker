# HabitTrack — Full-Stack Habit & Productivity Tracker

A calm, focused, full-stack habit tracking application built with React (Vite), Express, and Supabase PostgreSQL.

## 🚀 Quick Start (Local)

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and provide your Supabase PostgreSQL connection string:
   ```env
   DATABASE_URL=postgresql://postgres.pfxagecixashlsunxhxq:Amaniitk##2010@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres
   JWT_SECRET=habittrack-dev-jwt-secret-key-2026
   SESSION_SECRET=habittrack-dev-session-secret-2026
   PORT=3001
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   - Client: http://localhost:5173
   - Server: http://localhost:3001

## 🔑 Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Administrator (`is_admin: true`)

## ☁️ Deployment (Vercel)

This repository is pre-configured with `vercel.json` for one-click deployment to Vercel:

1. Import this repository into Vercel.
2. In Project Settings > Environment Variables, add:
   - `DATABASE_URL`: `postgresql://postgres.pfxagecixashlsunxhxq:Amaniitk##2010@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`
   - `JWT_SECRET`: `habittrack-production-jwt-secret-2026`
   - `SESSION_SECRET`: `habittrack-production-session-secret-2026`
   - `NODE_ENV`: `production`
3. Click **Deploy**.

## 📁 Architecture
- `client/`: React + Vite SPA with Calm Progress design tokens & responsive mobile navigation
- `server/`: Express REST API with streak calculation engine, Monday-week leftover tracking, and auth
- `api/`: Vercel serverless functions adapter
- `server/migrations/`: PostgreSQL schema migrations (all 7 tables)
