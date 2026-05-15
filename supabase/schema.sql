-- Supabase setup for Stones cloud sync.
-- Run this in the Supabase SQL editor, then create .env from frontend/.env.example.

create extension if not exists "pgcrypto";

-- ═══════════════════════════════════════════════════════════════
-- Helper: auto-update updated_at on every row change
-- ═══════════════════════════════════════════════════════════════
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- WORKSPACES
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.workspaces (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists workspaces_user_idx on public.workspaces (user_id);

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;

drop policy if exists "Users can read their own workspaces" on public.workspaces;
create policy "Users can read their own workspaces"
on public.workspaces for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own workspaces" on public.workspaces;
create policy "Users can insert their own workspaces"
on public.workspaces for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own workspaces" on public.workspaces;
create policy "Users can update their own workspaces"
on public.workspaces for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own workspaces" on public.workspaces;
create policy "Users can delete their own workspaces"
on public.workspaces for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- SECTIONS
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.sections (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null,
  title text not null default '',
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists sections_user_idx on public.sections (user_id);

drop trigger if exists sections_set_updated_at on public.sections;
create trigger sections_set_updated_at
before update on public.sections
for each row execute function public.set_updated_at();

alter table public.sections enable row level security;

drop policy if exists "Users can read their own sections" on public.sections;
create policy "Users can read their own sections"
on public.sections for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own sections" on public.sections;
create policy "Users can insert their own sections"
on public.sections for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own sections" on public.sections;
create policy "Users can update their own sections"
on public.sections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own sections" on public.sections;
create policy "Users can delete their own sections"
on public.sections for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- PAGES
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.pages (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null,
  section_id text,
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists pages_user_idx on public.pages (user_id);

drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at
before update on public.pages
for each row execute function public.set_updated_at();

alter table public.pages enable row level security;

drop policy if exists "Users can read their own pages" on public.pages;
create policy "Users can read their own pages"
on public.pages for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own pages" on public.pages;
create policy "Users can insert their own pages"
on public.pages for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own pages" on public.pages;
create policy "Users can update their own pages"
on public.pages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own pages" on public.pages;
create policy "Users can delete their own pages"
on public.pages for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- BLOCKS (all block types: task, note, checklist, code, link, image)
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.blocks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id text not null,
  type text not null default 'note',
  "order" integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  source_block_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists blocks_user_idx on public.blocks (user_id);
create index if not exists blocks_page_idx on public.blocks (page_id);

drop trigger if exists blocks_set_updated_at on public.blocks;
create trigger blocks_set_updated_at
before update on public.blocks
for each row execute function public.set_updated_at();

alter table public.blocks enable row level security;

drop policy if exists "Users can read their own blocks" on public.blocks;
create policy "Users can read their own blocks"
on public.blocks for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own blocks" on public.blocks;
create policy "Users can insert their own blocks"
on public.blocks for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own blocks" on public.blocks;
create policy "Users can update their own blocks"
on public.blocks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own blocks" on public.blocks;
create policy "Users can delete their own blocks"
on public.blocks for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- LEGACY: tasks table (kept for backward compat, not actively used)
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content jsonb not null default '{}'::jsonb,
  completed boolean not null default false,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists tasks_user_updated_idx
  on public.tasks (user_id, updated_at desc);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before insert or update on public.tasks
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

drop policy if exists "Users can read their own tasks" on public.tasks;
create policy "Users can read their own tasks"
on public.tasks for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own tasks" on public.tasks;
create policy "Users can insert their own tasks"
on public.tasks for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
on public.tasks for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- STORAGE: task-images bucket
-- ═══════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-images',
  'task-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own task images" on storage.objects;
create policy "Users can read their own task images"
on storage.objects for select
using (
  bucket_id = 'task-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can upload their own task images" on storage.objects;
create policy "Users can upload their own task images"
on storage.objects for insert
with check (
  bucket_id = 'task-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update their own task images" on storage.objects;
create policy "Users can update their own task images"
on storage.objects for update
using (
  bucket_id = 'task-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'task-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete their own task images" on storage.objects;
create policy "Users can delete their own task images"
on storage.objects for delete
using (
  bucket_id = 'task-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
