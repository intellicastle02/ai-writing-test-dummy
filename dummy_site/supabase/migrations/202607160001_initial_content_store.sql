create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug)),
  title text not null check (length(trim(title)) > 0),
  content text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'deleted')),
  excerpt text,
  meta_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  deleted_at timestamptz,
  constraint published_posts_have_date check (status <> 'published' or published_at is not null),
  constraint deleted_posts_have_date check (status <> 'deleted' or deleted_at is not null)
);

create index if not exists posts_public_listing_idx
  on public.posts (published_at desc)
  where status = 'published' and deleted_at is null;

create table if not exists public.post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  title text not null,
  content text not null,
  status text not null,
  change_source text not null default 'admin',
  created_at timestamptz not null default now()
);

create index if not exists post_revisions_post_id_created_at_idx
  on public.post_revisions (post_id, created_at desc);

create table if not exists public.post_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  event_type text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists post_events_post_id_created_at_idx
  on public.post_events (post_id, created_at desc);

create or replace function public.set_post_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create or replace function public.audit_post_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.post_events (post_id, event_type, message)
    values (new.id, 'created', 'Post created');
  elsif tg_op = 'UPDATE' then
    insert into public.post_revisions (post_id, title, content, status)
    values (old.id, old.title, old.content, old.status);

    insert into public.post_events (post_id, event_type, message, metadata)
    values (
      new.id,
      case when new.status = 'deleted' and old.status <> 'deleted' then 'deleted' else 'updated' end,
      case when new.status = 'deleted' and old.status <> 'deleted' then 'Post soft deleted' else 'Post updated' end,
      jsonb_build_object('previous_status', old.status, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists posts_set_timestamps on public.posts;
create trigger posts_set_timestamps
before insert or update on public.posts
for each row execute function public.set_post_timestamps();

drop trigger if exists posts_audit_change on public.posts;
create trigger posts_audit_change
after insert or update on public.posts
for each row execute function public.audit_post_change();

alter table public.posts enable row level security;
alter table public.post_revisions enable row level security;
alter table public.post_events enable row level security;

revoke all on public.posts from anon, authenticated;
revoke all on public.post_revisions from anon, authenticated;
revoke all on public.post_events from anon, authenticated;
grant select on public.posts to anon, authenticated;

drop policy if exists "Public can read published posts" on public.posts;
create policy "Public can read published posts"
on public.posts
for select
to anon, authenticated
using (status = 'published' and deleted_at is null);
