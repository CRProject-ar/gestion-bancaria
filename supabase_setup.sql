-- ============================================================
-- GESTIÓN BANCARIA - Script de configuración Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. USUARIOS
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password text not null,
  nombre text not null,
  rol text not null check (rol in ('administrador','consulta')),
  created_at timestamptz default now()
);

-- Usuario administrador por defecto (cambiar contraseña luego)
insert into usuarios (email, password, nombre, rol)
values ('admin@empresa.com', 'admin123', 'Administrador', 'administrador')
on conflict (email) do nothing;

-- 2. BANCOS
create table if not exists bancos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  saldo numeric(18,2) not null default 0,
  acuerdo numeric(18,2) not null default 0,
  created_at timestamptz default now()
);

-- 3. CHEQUES
create table if not exists cheques (
  id uuid primary key default gen_random_uuid(),
  nro text not null,
  orden text,
  emision date,
  vencimiento date not null,
  banco_id uuid references bancos(id) on delete cascade,
  importe numeric(18,2) not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente','cancelado')),
  created_at timestamptz default now()
);

-- 4. PRÉSTAMOS
create table if not exists prestamos (
  id uuid primary key default gen_random_uuid(),
  banco_id uuid references bancos(id) on delete cascade,
  nombre text not null,
  monto numeric(18,2) not null default 0,
  created_at timestamptz default now()
);

-- 5. CUOTAS DE PRÉSTAMOS
create table if not exists cuotas_prestamo (
  id uuid primary key default gen_random_uuid(),
  prestamo_id uuid references prestamos(id) on delete cascade,
  fecha date not null,
  capital numeric(18,2) not null default 0,
  interes numeric(18,2) not null default 0,
  iva numeric(18,2) not null default 0,
  otros_imp numeric(18,2) not null default 0,
  cuota_total numeric(18,2) not null default 0,
  orden integer not null default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Acceso público autenticado vía app
-- Dejamos acceso abierto porque la auth la maneja la propia app.
-- Si querés RLS más estricto, consultá la documentación de Supabase.
-- ============================================================
alter table usuarios enable row level security;
alter table bancos enable row level security;
alter table cheques enable row level security;
alter table prestamos enable row level security;
alter table cuotas_prestamo enable row level security;

-- Políticas: acceso total via anon key (la app controla auth propia)
create policy "allow_all_usuarios" on usuarios for all using (true) with check (true);
create policy "allow_all_bancos" on bancos for all using (true) with check (true);
create policy "allow_all_cheques" on cheques for all using (true) with check (true);
create policy "allow_all_prestamos" on prestamos for all using (true) with check (true);
create policy "allow_all_cuotas" on cuotas_prestamo for all using (true) with check (true);
