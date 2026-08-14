create extension if not exists pgcrypto;

create type public.team_role as enum ('admin', 'producer', 'member');
create type public.track_status as enum ('draft', 'active', 'completed', 'cancelled');
create type public.track_version_status as enum ('processing', 'ready', 'archived', 'failed');
create type public.storage_provider as enum ('supabase', 'r2');
create type public.file_type as enum ('stem', 'flp', 'zip', 'artwork', 'mix', 'master', 'other');
create type public.action_status as enum ('planned', 'in_progress', 'completed', 'cancelled');
create type public.content_status as enum ('idea', 'planned', 'in_production', 'published', 'archived');
create type public.content_difficulty as enum ('low', 'medium', 'high');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.team_role not null default 'member',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_full_name_length check (char_length(full_name) <= 160)
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status public.track_status not null default 'draft',
  description text not null default '',
  artwork_path text,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracks_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint tracks_description_length check (char_length(description) <= 4000),
  constraint tracks_artwork_path_is_not_url check (artwork_path is null or artwork_path !~* '^https?://')
);

create table public.track_versions (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  version_num integer not null,
  storage_url text not null,
  storage_provider public.storage_provider not null default 'supabase',
  storage_bucket text not null default 'playback',
  original_filename text not null,
  mime_type text,
  size_bytes bigint,
  duration_seconds double precision,
  status public.track_version_status not null default 'processing',
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint track_versions_track_version_unique unique (track_id, version_num),
  constraint track_versions_version_positive check (version_num > 0),
  constraint track_versions_object_key_is_not_url check (storage_url !~* '^https?://'),
  constraint track_versions_filename_length check (char_length(btrim(original_filename)) between 1 and 512),
  constraint track_versions_size_nonnegative check (size_bytes is null or size_bytes >= 0),
  constraint track_versions_duration_finite_nonnegative check (
    duration_seconds is null or (
      duration_seconds >= 0
      and duration_seconds < 'Infinity'::double precision
      and duration_seconds <> 'NaN'::double precision
    )
  )
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.track_versions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  timestamp_marker double precision not null,
  content text not null,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  constraint comments_timestamp_finite_nonnegative check (
    timestamp_marker >= 0
    and timestamp_marker < 'Infinity'::double precision
    and timestamp_marker <> 'NaN'::double precision
  ),
  constraint comments_content_trimmed_length check (char_length(btrim(content)) between 1 and 2000)
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  type public.file_type not null,
  storage_url text not null,
  storage_provider public.storage_provider not null default 'supabase',
  storage_bucket text not null,
  original_filename text not null,
  mime_type text,
  size_bytes bigint not null,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint files_object_key_is_not_url check (storage_url !~* '^https?://'),
  constraint files_filename_length check (char_length(btrim(original_filename)) between 1 and 512),
  constraint files_size_nonnegative check (size_bytes >= 0)
);

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  event_date timestamptz,
  status public.action_status not null default 'planned',
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint actions_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint actions_description_length check (char_length(description) <= 4000)
);

create table public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  platform text not null,
  difficulty public.content_difficulty not null default 'medium',
  status public.content_status not null default 'idea',
  reference_url text,
  notes text not null default '',
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_ideas_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint content_ideas_platform_length check (char_length(btrim(platform)) between 1 and 80),
  constraint content_ideas_notes_length check (char_length(notes) <= 4000),
  constraint content_ideas_reference_url_length check (reference_url is null or char_length(reference_url) <= 2048)
);

create index tracks_created_by_idx on public.tracks (created_by);
create index tracks_status_updated_at_idx on public.tracks (status, updated_at desc);
create index track_versions_track_id_version_num_idx on public.track_versions (track_id, version_num desc);
create index comments_version_id_created_at_idx on public.comments (version_id, created_at asc);
create index files_track_id_idx on public.files (track_id);
create index actions_event_date_idx on public.actions (event_date);
create index content_ideas_status_idx on public.content_ideas (status);

create function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

create function public.can_manage_track(track_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.tracks
      where id = track_id and created_by = auth.uid()
    )
    or exists (
      select 1
      from public.users
      where id = auth.uid() and role = 'producer'
    );
$$;

create function public.validate_comment_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  version_duration double precision;
  version_status public.track_version_status;
  comment_timestamp_tolerance_seconds constant double precision := 0.25;
begin
  select duration_seconds, status
  into version_duration, version_status
  from public.track_versions
  where id = new.version_id;

  if version_status is distinct from 'ready'
    or version_duration is null
    or version_duration < 0
    or version_duration >= 'Infinity'::double precision
    or version_duration = 'NaN'::double precision
    or new.timestamp_marker > version_duration + comment_timestamp_tolerance_seconds then
    raise exception 'Comment timestamp is outside the ready version duration' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create function public.protect_user_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'Profile identity fields are immutable' using errcode = 'check_violation';
  end if;

  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only administrators may change roles' using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger users_protect_update
before update on public.users
for each row execute procedure public.protect_user_update();

create trigger users_set_updated_at before update on public.users
for each row execute procedure public.set_updated_at();
create trigger tracks_set_updated_at before update on public.tracks
for each row execute procedure public.set_updated_at();
create trigger actions_set_updated_at before update on public.actions
for each row execute procedure public.set_updated_at();
create trigger content_ideas_set_updated_at before update on public.content_ideas
for each row execute procedure public.set_updated_at();
create trigger comments_validate_timestamp
before insert or update of version_id, timestamp_marker on public.comments
for each row execute procedure public.validate_comment_timestamp();

-- Migration-only backfill for auth users that predate the profile trigger.
insert into public.users (id, full_name)
select
  id,
  left(coalesce(raw_user_meta_data ->> 'full_name', ''), 160)
from auth.users
on conflict (id) do nothing;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('playback', 'playback', false)
on conflict (id) do update set public = false;

alter table public.users enable row level security;
alter table public.tracks enable row level security;
alter table public.track_versions enable row level security;
alter table public.comments enable row level security;
alter table public.files enable row level security;
alter table public.actions enable row level security;
alter table public.content_ideas enable row level security;

revoke all on public.users, public.tracks, public.track_versions, public.comments, public.files, public.actions, public.content_ideas from anon, authenticated;
grant select on public.users, public.tracks, public.track_versions, public.comments, public.files, public.actions, public.content_ideas to authenticated;
grant update (full_name, avatar_url, role) on public.users to authenticated;
grant insert, delete on public.tracks to authenticated;
grant update (title, status, description, artwork_path) on public.tracks to authenticated;
-- Deliberately grant no INSERT, UPDATE, or DELETE on track_versions or files to
-- authenticated/browser clients. Phase 4 will add a trusted server-only registration boundary.
grant insert, delete on public.comments to authenticated;
grant update (content, is_resolved) on public.comments to authenticated;
grant insert, delete on public.actions to authenticated;
grant update (title, description, event_date, status) on public.actions to authenticated;
grant insert, delete on public.content_ideas to authenticated;
grant update (title, platform, difficulty, status, reference_url, notes) on public.content_ideas to authenticated;

create policy "users_read_authenticated" on public.users
for select to authenticated using (true);
create policy "users_update_self_or_admin" on public.users
for update to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

create policy "tracks_read_authenticated" on public.tracks
for select to authenticated using (true);
create policy "tracks_insert_creator" on public.tracks
for insert to authenticated with check (created_by = auth.uid());
create policy "tracks_update_manage" on public.tracks
for update to authenticated
using (public.can_manage_track(id))
with check (public.can_manage_track(id));
create policy "tracks_delete_manage" on public.tracks
for delete to authenticated using (public.can_manage_track(id));

create policy "track_versions_read_authenticated" on public.track_versions
for select to authenticated using (true);

create policy "files_read_authenticated" on public.files
for select to authenticated using (true);

create policy "comments_read_authenticated" on public.comments
for select to authenticated using (true);
create policy "comments_insert_author" on public.comments
for insert to authenticated with check (user_id = auth.uid());
create policy "comments_update_author_or_admin" on public.comments
for update to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
create policy "comments_delete_author_or_admin" on public.comments
for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "actions_read_authenticated" on public.actions
for select to authenticated using (true);
create policy "actions_insert_creator" on public.actions
for insert to authenticated with check (created_by = auth.uid());
create policy "actions_update_creator_or_admin" on public.actions
for update to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());
create policy "actions_delete_creator_or_admin" on public.actions
for delete to authenticated using (created_by = auth.uid() or public.is_admin());

create policy "content_ideas_read_authenticated" on public.content_ideas
for select to authenticated using (true);
create policy "content_ideas_insert_creator" on public.content_ideas
for insert to authenticated with check (created_by = auth.uid());
create policy "content_ideas_update_creator_or_admin" on public.content_ideas
for update to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());
create policy "content_ideas_delete_creator_or_admin" on public.content_ideas
for delete to authenticated using (created_by = auth.uid() or public.is_admin());

revoke execute on function public.set_updated_at() from public, anon;
revoke execute on function public.handle_new_user() from public, anon;
revoke execute on function public.protect_user_update() from public, anon;
revoke execute on function public.validate_comment_timestamp() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.can_manage_track(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_manage_track(uuid) to authenticated;

-- Do not create any storage.objects policy. Only the narrowly isolated server-only
-- admin signing client accesses Storage, after the request-scoped RLS authorization.
