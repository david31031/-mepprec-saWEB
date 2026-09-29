-- ============================================================
-- Mepprec SA website — Supabase setup
-- Paste this whole file into the Supabase SQL Editor and run it.
-- ============================================================

-- ---------- Live chat ("The Open Space") ----------
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  guest_tag text not null,
  guest_color text not null,
  message text not null,
  created_at timestamptz not null default now()
);
alter table comments enable row level security;
create policy "public read comments" on comments for select using (true);
create policy "public insert comments" on comments for insert with check (true);
create policy "public delete comments" on comments for delete using (true);

-- Optional but recommended: guarantee 24h cleanup even with no visitors.
-- Requires the pg_cron extension (enable it under Database > Extensions),
-- then run this once:
-- select cron.schedule('delete-old-comments', '0 * * * *',
--   $$ delete from comments where created_at < now() - interval '24 hours' $$);

-- ---------- Pastoral team ----------
create table if not exists pastors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  bio text,
  photo_url text,
  video_url text,
  created_at timestamptz not null default now()
);
alter table pastors enable row level security;
create policy "public read pastors" on pastors for select using (true);
create policy "public insert pastors" on pastors for insert with check (true);
create policy "public delete pastors" on pastors for delete using (true);

insert into storage.buckets (id, name, public)
  values ('pastor-photos', 'pastor-photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('pastor-videos', 'pastor-videos', true)
  on conflict (id) do nothing;
create policy "public read pastor-photos" on storage.objects for select using (bucket_id = 'pastor-photos');
create policy "public upload pastor-photos" on storage.objects for insert with check (bucket_id = 'pastor-photos');
create policy "public read pastor-videos" on storage.objects for select using (bucket_id = 'pastor-videos');
create policy "public upload pastor-videos" on storage.objects for insert with check (bucket_id = 'pastor-videos');

-- ---------- Calendar programs ----------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  title text not null,
  items text, -- newline-separated list of items for that date
  created_at timestamptz not null default now()
);
alter table events enable row level security;
create policy "public read events" on events for select using (true);
create policy "public insert events" on events for insert with check (true);
create policy "public delete events" on events for delete using (true);

-- ---------- Sermon library ----------
create table if not exists sermons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date text not null,
  video_url text not null,
  created_at timestamptz not null default now()
);
alter table sermons enable row level security;
create policy "public read sermons" on sermons for select using (true);
create policy "public insert sermons" on sermons for insert with check (true);

insert into storage.buckets (id, name, public)
  values ('sermons', 'sermons', true)
  on conflict (id) do nothing;
create policy "public read sermons bucket" on storage.objects for select using (bucket_id = 'sermons');
create policy "public upload sermons bucket" on storage.objects for insert with check (bucket_id = 'sermons');
