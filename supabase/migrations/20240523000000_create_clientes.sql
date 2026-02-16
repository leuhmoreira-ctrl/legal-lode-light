create table if not exists public.clientes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  tipo text check (tipo in ('pf', 'pj')) not null,
  nome text not null,
  cpf_cnpj text not null,
  email text,
  telefone text,
  endereco text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.clientes enable row level security;

create policy "Users can view their own clients" on public.clientes
  for select using (auth.uid() = user_id);

create policy "Users can insert their own clients" on public.clientes
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own clients" on public.clientes
  for update using (auth.uid() = user_id);

create policy "Users can delete their own clients" on public.clientes
  for delete using (auth.uid() = user_id);
