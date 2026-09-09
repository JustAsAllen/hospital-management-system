-- ═══════════════════════════════════════════════════════════════════════
--  MEDFLOW — Hospital Management System · Supabase Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query → Run
--  (Tables + Row Level Security + helper functions used by the app)
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── Profiles: mirrors authenticated users ─────────────────────────────
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text not null default 'Staff',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- ── Patients ──────────────────────────────────────────────────────────
create table if not exists patients (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  dob date,
  gender text,
  phone text,
  email text,
  address text,
  blood_group text,
  allergies text,
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

alter table patients enable row level security;

-- ── Doctors ───────────────────────────────────────────────────────────
create table if not exists doctors (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  specialty text,
  fee numeric(10,2) not null default 0,
  phone text,
  email text,
  license text,
  available boolean not null default true,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

alter table doctors enable row level security;

-- ── Appointments ──────────────────────────────────────────────────────
create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid not null references doctors(id) on delete cascade,
  date date not null,
  time time not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  reason text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

alter table appointments enable row level security;

-- ── Invoices ──────────────────────────────────────────────────────────
create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  description text not null,
  amount numeric(10,2) not null default 0,
  status text not null default 'unpaid'
    check (status in ('paid', 'unpaid', 'overdue')),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

alter table invoices enable row level security;

--------------------------------------------------------------------------------
--  ROW LEVEL SECURITY — anyone signed in gets staff access to all data.
--  (Change these policies later if you need doctor/patient-level permissions.)
--------------------------------------------------------------------------------

create or replace function public.set_app_role(app_role text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform set_config('app.role', app_role, true);
end;
$$;

grant execute on function public.set_app_role(text) to authenticated;

create or replace function public.is_authenticated()
returns boolean
language sql security definer stable set search_path = public
as $$
  select coalesce(current_setting('app.role', true), 'staff') = 'staff'
      or auth.uid() is not null;
$$;

-- Helper to glue the created_by column to the current user
create or replace function public.current_user_id()
returns uuid language sql stable as 'select auth.uid()';

grant execute on function public.is_authenticated() to authenticated;
grant execute on function public.current_user_id() to authenticated;

-- ── policies ──────────────────────────────────────────────────────────
create policy "staff can manage profiles"     on profiles     for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "staff can manage patients"     on patients     for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "staff can manage doctors"      on doctors      for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "staff can manage appointments" on appointments for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "staff can manage invoices"     on invoices     for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- ── auto-create a profile row when a user signs up ────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'Staff');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── instant demo data (optional — you can delete this block) ─────────
insert into doctors (first_name, last_name, specialty, fee, phone, email, license) values
  ('Amara', 'Okafor', 'Cardiology', 250, '+1 555 0201', 'amara.okafor@medflow.io', 'MD-CAR-88412'),
  ('David', 'Kim',     'Neurology', 280, '+1 555 0202', 'david.kim@medflow.io',     'MD-NEU-55109'),
  ('Rosa',  'Garcia',  'Pediatrics', 180, '+1 555 0203', 'rosa.garcia@medflow.io',  'MD-PED-22034'),
  ('Omar',  'Haddad',  'Orthopedics', 220, '+1 555 0204', 'omar.haddad@medflow.io', 'MD-ORT-99071'),
  ('Lena',  'Voss',    'Dermatology', 160, '+1 555 0205', 'lena.voss@medflow.io',   'MD-DER-33258')
on conflict do nothing;