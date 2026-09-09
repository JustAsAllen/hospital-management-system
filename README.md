# MedFlow — Hospital Management System ⚕️

A beautiful, modern hospital management system. It runs **instantly in Demo Mode** (fully working, no setup, even offline), and connects to **Supabase** for a real cloud backend whenever you're ready.

```
📁 Hospital Management System/
  ├── index.html      → the app
  ├── css/styles.css  → styling
  ├── js/config.js    → Supabase settings (also editable in-app)
  ├── js/db.js        → data layer (Supabase ⇄ demo fallback)
  ├── js/app.js       → app logic
  ├── schema.sql      → run this in Supabase's SQL editor
  └── README.md       → you are here
```

## 🚀 Run it

Just **double-click `index.html`**. Everything works immediately.

> Click **"Enter as Demo Admin"** on the login screen to explore instantly.
> The demo admin credentials (works even after a refresh): `admin@medflow.io` / `medflow123`

## ☁️ Connect Supabase (5 minutes)

1. Create a free project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** → paste the contents of `schema.sql` → **Run**
3. Open **Project Settings → API** and copy your **Project URL** + **anon key**
4. Open the app → **Settings** → paste both → **Connect & Save**

That's it. All patients, doctors, appointments, invoices, and auth now live in your Supabase database, fully protected by Row Level Security.

> Tip: in Supabase, go to **Authentication → Providers → Email**, and turn **"Confirm email"** OFF if you want instant sign-ups without clicking an email link.

## ✨ Features

- **Dashboard** — live stat cards, weekly activity chart, today's schedule, department breakdown
- **Patients** — full records, search & filter, rich profile view (visits + billing)
- **Doctors** — card grid with specialties, availability, consultation fees
- **Appointments** — status filters (scheduled/completed/cancelled), smart date badges
- **Billing** — invoices with paid/unpaid/overdue tracking
- **Settings** — Supabase connection, hospital name, JSON export, demo data reset
- **Free demo mode** — works with zero configuration so you can start today

## 🔐 Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@medflow.io` | `medflow123` |

## 💾 Data

- **Demo mode:** stored in your browser's local storage
- **Supabase mode:** stored in your database tables (`patients`, `doctors`, `appointments`, `invoices`, `profiles`)
- Export everything to JSON anytime from **Settings**

Built with vanilla HTML/CSS/JS, [Supabase JS](https://supabase.com/docs/reference/javascript/introduction) and [Chart.js](https://www.chartjs.org/).