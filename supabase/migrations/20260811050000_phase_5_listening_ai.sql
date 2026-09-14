create extension if not exists vector;

create type public.listening_link_status as enum ('active', 'revoked', 'expired');

create table public.listening_links (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  version_id uuid not null references public.track_versions(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  label text check (label is null or char_length(btrim(label)) between 1 and 120),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  access_count bigint not null default 0 check (access_count >= 0),
  constraint listening_links_expiry_after_creation check (expires_at > created_at)
);

create function public.enforce_listening_link_version_track()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.track_versions
    where id = new.version_id and track_id = new.track_id
  ) then
    raise exception 'Listening version does not belong to track.';
  end if;
  return new;
end;
$$;

create trigger listening_links_validate_version_track
before insert or update of track_id, version_id on public.listening_links
for each row execute function public.enforce_listening_link_version_track();

create index listening_links_track_id_created_at_idx
  on public.listening_links (track_id, created_at desc);
create index listening_links_active_expiry_idx
  on public.listening_links (expires_at)
  where revoked_at is null;

alter table public.listening_links enable row level security;

revoke all on public.listening_links from anon, authenticated;

create function public.list_listening_link_summaries(p_track_id uuid)
returns table (
  id uuid, version_id uuid, version_label text, label text,
  expires_at timestamptz, revoked_at timestamptz, created_at timestamptz,
  last_accessed_at timestamptz, access_count bigint
)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.can_manage_track(p_track_id) then
    raise exception 'Listening link unavailable.';
  end if;
  return query
  select l.id, l.version_id, concat('Version ', v.version_num), l.label,
    l.expires_at, l.revoked_at, l.created_at, l.last_accessed_at, l.access_count
  from public.listening_links l
  join public.track_versions v on v.id = l.version_id
  where l.track_id = p_track_id
  order by l.created_at desc;
end;
$$;

create function public.create_listening_link(
  p_track_id uuid, p_version_id uuid, p_token_hash text,
  p_label text, p_expires_at timestamptz
)
returns table (
  id uuid, version_id uuid, version_label text, label text,
  expires_at timestamptz, revoked_at timestamptz, created_at timestamptz,
  last_accessed_at timestamptz, access_count bigint
)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare inserted public.listening_links; version_row public.track_versions;
begin
  if auth.uid() is null or not public.can_manage_track(p_track_id) then raise exception 'Listening link unavailable.'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_expires_at <= now() then raise exception 'Listening link unavailable.'; end if;
  select * into version_row from public.track_versions
  where id = p_version_id and track_id = p_track_id and status = 'ready'
    and storage_provider = 'supabase' and storage_bucket = 'playback'
    and storage_url <> '' and storage_url !~ '(^/|\\|\.\.|://|[[:cntrl:]])';
  if not found then raise exception 'Listening link unavailable.'; end if;
  insert into public.listening_links (track_id, version_id, token_hash, label, expires_at, created_by)
  values (p_track_id, p_version_id, p_token_hash, nullif(btrim(p_label), ''), p_expires_at, auth.uid())
  returning * into inserted;
  return query select inserted.id, inserted.version_id,
    concat('Version ', version_row.version_num), inserted.label, inserted.expires_at,
    inserted.revoked_at, inserted.created_at, inserted.last_accessed_at, inserted.access_count;
end;
$$;

create function public.revoke_listening_link(p_link_id uuid)
returns table (
  id uuid, version_id uuid, version_label text, label text,
  expires_at timestamptz, revoked_at timestamptz, created_at timestamptz,
  last_accessed_at timestamptz, access_count bigint
)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare updated public.listening_links;
begin
  if auth.uid() is null then raise exception 'Listening link unavailable.'; end if;
  update public.listening_links l set revoked_at = now()
  where l.id = p_link_id and l.revoked_at is null and public.can_manage_track(l.track_id)
  returning * into updated;
  if not found then raise exception 'Listening link unavailable.'; end if;
  return query select updated.id, updated.version_id, concat('Version ', v.version_num),
    updated.label, updated.expires_at, updated.revoked_at, updated.created_at,
    updated.last_accessed_at, updated.access_count
  from public.track_versions v where v.id = updated.version_id;
end;
$$;

create function public.record_listening_link_access(p_link_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.listening_links
  set access_count = access_count + 1, last_accessed_at = now()
  where id = p_link_id;
  if not found then raise exception 'Listening link unavailable.'; end if;
end;
$$;

revoke all on function public.list_listening_link_summaries(uuid) from public;
revoke all on function public.create_listening_link(uuid, uuid, text, text, timestamptz) from public;
revoke all on function public.revoke_listening_link(uuid) from public;
revoke all on function public.record_listening_link_access(uuid) from public, anon, authenticated;
grant execute on function public.record_listening_link_access(uuid) to service_role;
grant execute on function public.list_listening_link_summaries(uuid) to authenticated;
grant execute on function public.create_listening_link(uuid, uuid, text, text, timestamptz) to authenticated;
grant execute on function public.revoke_listening_link(uuid) to authenticated;

create type public.veo_document_kind as enum ('action', 'comment');

create table public.veo_documents (
  id uuid primary key default gen_random_uuid(),
  source_kind public.veo_document_kind not null,
  source_id uuid not null,
  track_id uuid references public.tracks(id) on delete cascade,
  content text not null check (char_length(content) > 0),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_kind, source_id)
);
create index veo_documents_embedding_cosine_hnsw_idx
  on public.veo_documents using hnsw (embedding vector_cosine_ops);
create index veo_documents_source_idx on public.veo_documents (source_kind, source_id);
alter table public.veo_documents enable row level security;

revoke all on public.veo_documents from anon, authenticated;

create function public.match_veo_documents(
  query_embedding vector(1536),
  match_count integer
)
returns table (
  id uuid, source_kind public.veo_document_kind, source_id uuid,
  track_id uuid, content text, metadata jsonb, similarity double precision
)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'VEO AI is unavailable.';
  end if;
  return query
  select d.id, d.source_kind, d.source_id, d.track_id, d.content, d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.veo_documents d
  where (
    d.source_kind = 'action'
    and exists (select 1 from public.actions a where a.id = d.source_id)
  ) or (
    d.source_kind = 'comment'
    and exists (
      select 1
      from public.comments c
      join public.track_versions v on v.id = c.version_id
      join public.tracks t on t.id = v.track_id
      where c.id = d.source_id
    )
  )
  order by d.embedding <=> query_embedding
  limit least(8, greatest(1, match_count));
end;
$$;

create table public.veo_ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index veo_ai_requests_user_created_at_idx
  on public.veo_ai_requests (user_id, created_at desc);
alter table public.veo_ai_requests enable row level security;
revoke all on public.veo_ai_requests from anon, authenticated;

create function public.consume_veo_ai_request()
returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare remaining integer;
begin
  if auth.uid() is null then
    raise exception 'VEO AI is unavailable.';
  end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  delete from public.veo_ai_requests
  where user_id = auth.uid() and created_at < now() - interval '1 minute';
  select count(*) into remaining
  from public.veo_ai_requests
  where user_id = auth.uid();
  if remaining >= 10 then
    return false;
  end if;
  insert into public.veo_ai_requests (user_id) values (auth.uid());
  return true;
end;
$$;

revoke all on function public.match_veo_documents(vector, integer) from public, anon;
grant execute on function public.match_veo_documents(vector, integer) to authenticated;
revoke all on function public.consume_veo_ai_request() from public, anon;
grant execute on function public.consume_veo_ai_request() to authenticated;
