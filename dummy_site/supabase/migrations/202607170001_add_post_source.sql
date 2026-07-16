alter table public.posts
  add column if not exists source text not null default 'admin';

comment on column public.posts.source is
  'Who/what created the post: admin (manual UI) or automation (AUTOMATION_API_KEY route).';
