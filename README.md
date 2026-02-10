# Cheers 🍻 - Social Discovery PWA

## Overview
"Cheers" is a location-based social discovery app. Instead of dating profiles, users post "Beacons" — temporary statuses showing what they have (e.g., "0.7L Jack Daniels") or what they want ("Looking for party").

## Tech Stack
- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + Shadcn/UI
- **Database:** Supabase (PostgreSQL + PostGIS)
- **State:** Zustand
- **Maps:** Яндекс.Карты (@pbe/react-yandex-maps)
- **Icons:** Lucide React
- **Animations:** Framer Motion

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase
1. Create a Supabase project at https://supabase.com
2. Copy `.env.local.example` to `.env.local`
3. Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

### 3. Setup Database Schema
Run the SQL from `docs/DB_SCHEMA.md` in your Supabase SQL Editor.

### 4. Generate Types (Optional)
After setting up the database schema:
```bash
npx supabase gen types typescript --project-id <project-id> > types/supabase.ts
```

### 5. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure
```
├── app/              # Next.js App Router pages
├── components/       # React components
│   └── ui/          # Shadcn/UI components
├── lib/             # Utility functions
├── store/           # Zustand stores
├── types/           # TypeScript types
├── utils/           # Helper utilities
│   └── supabase/   # Supabase client helpers
└── docs/            # Project documentation
```

## Documentation
- `docs/PRD.md` - Product Requirements Document
- `docs/DB_SCHEMA.md` - Database schema
- `docs/TECH_STACK.md` - Technology stack details