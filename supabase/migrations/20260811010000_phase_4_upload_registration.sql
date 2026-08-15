do $$
begin
  if exists (select 1 from public.actions where event_date is null) then
    raise exception 'Phase 4 requires every action to have event_date before migration.';
  end if;
end;
$$;

alter table public.actions
  alter column event_date set not null;

alter table public.content_ideas
  drop constraint if exists content_ideas_title_length,
  drop constraint if exists content_ideas_notes_length,
  drop constraint if exists content_ideas_reference_url_length;

alter table public.content_ideas
  add constraint content_ideas_title_length
    check (char_length(btrim(title)) between 1 and 200),
  add constraint content_ideas_notes_length
    check (char_length(notes) <= 5000),
  add constraint content_ideas_reference_url_length
    check (reference_url is null or char_length(reference_url) <= 2048),
  add constraint content_ideas_reference_url_http
    check (reference_url is null or reference_url ~* '^https?://');

alter table public.track_versions
  add constraint track_versions_storage_locator_unique
  unique (storage_provider, storage_bucket, storage_url);

alter table public.files
  add constraint files_storage_locator_unique
  unique (storage_provider, storage_bucket, storage_url);

revoke insert on table public.track_versions from authenticated;
revoke insert on table public.files from authenticated;

drop policy if exists "track_versions_insert_manage" on public.track_versions;
drop policy if exists "files_insert_manage" on public.files;

create or replace function public.register_r2_track_version(
  p_user_id uuid,
  p_track_id uuid,
  p_bucket text,
  p_object_key text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint
)
returns public.track_versions
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  existing_row public.track_versions;
  inserted_row public.track_versions;
  next_version integer;
begin
  if p_user_id is null
     or not exists (select 1 from public.users where id = p_user_id)
     or not exists (select 1 from public.tracks where id = p_track_id)
     or p_bucket is null
     or btrim(p_bucket) = ''
     or p_object_key not like format(
       'teams/default/%s/%s/%%', p_user_id::text, p_track_id::text
     )
     or p_object_key ~ '(^|/)\.\.(/|$)'
     or p_original_filename is null
     or char_length(btrim(p_original_filename)) not between 1 and 512
     or p_mime_type is null
     or btrim(p_mime_type) = ''
     or p_size_bytes is null
     or p_size_bytes <= 0 then
    raise check_violation using message = 'Upload metadata is invalid.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('track-version:' || p_track_id::text, 0));

  select * into existing_row
  from public.track_versions
  where storage_provider = 'r2'
    and storage_bucket = p_bucket
    and storage_url = p_object_key;

  if found then
    if existing_row.track_id <> p_track_id
       or existing_row.created_by <> p_user_id
       or existing_row.original_filename <> btrim(p_original_filename)
       or existing_row.mime_type is distinct from btrim(p_mime_type)
       or existing_row.size_bytes is distinct from p_size_bytes then
      raise check_violation using message = 'Existing upload metadata does not match.';
    end if;
    return existing_row;
  end if;

  select coalesce(max(version_num), 0) + 1
  into next_version
  from public.track_versions
  where track_id = p_track_id;

  insert into public.track_versions (
    track_id,
    version_num,
    storage_url,
    storage_provider,
    storage_bucket,
    original_filename,
    mime_type,
    size_bytes,
    status,
    created_by
  ) values (
    p_track_id,
    next_version,
    p_object_key,
    'r2',
    p_bucket,
    btrim(p_original_filename),
    btrim(p_mime_type),
    p_size_bytes,
    'processing',
    p_user_id
  )
  returning * into inserted_row;

  return inserted_row;
end;
$$;

create or replace function public.register_r2_file(
  p_user_id uuid,
  p_track_id uuid,
  p_file_type public.file_type,
  p_bucket text,
  p_object_key text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint
)
returns public.files
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  existing_row public.files;
  inserted_row public.files;
begin
  if p_user_id is null
     or not exists (select 1 from public.users where id = p_user_id)
     or not exists (select 1 from public.tracks where id = p_track_id)
     or p_file_type is null
     or p_bucket is null
     or btrim(p_bucket) = ''
     or p_object_key not like format(
       'teams/default/%s/%s/%%', p_user_id::text, p_track_id::text
     )
     or p_object_key ~ '(^|/)\.\.(/|$)'
     or p_original_filename is null
     or char_length(btrim(p_original_filename)) not between 1 and 512
     or p_mime_type is null
     or btrim(p_mime_type) = ''
     or p_size_bytes is null
     or p_size_bytes <= 0 then
    raise check_violation using message = 'Upload metadata is invalid.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('file:' || p_bucket || ':' || p_object_key, 0)
  );

  select * into existing_row
  from public.files
  where storage_provider = 'r2'
    and storage_bucket = p_bucket
    and storage_url = p_object_key;

  if found then
    if existing_row.track_id <> p_track_id
       or existing_row.uploaded_by <> p_user_id
       or existing_row.type <> p_file_type
       or existing_row.original_filename <> btrim(p_original_filename)
       or existing_row.mime_type is distinct from btrim(p_mime_type)
       or existing_row.size_bytes is distinct from p_size_bytes then
      raise check_violation using message = 'Existing upload metadata does not match.';
    end if;
    return existing_row;
  end if;

  insert into public.files (
    track_id,
    type,
    storage_url,
    storage_provider,
    storage_bucket,
    original_filename,
    mime_type,
    size_bytes,
    uploaded_by
  ) values (
    p_track_id,
    p_file_type,
    p_object_key,
    'r2',
    p_bucket,
    btrim(p_original_filename),
    btrim(p_mime_type),
    p_size_bytes,
    p_user_id
  )
  returning * into inserted_row;

  return inserted_row;
end;
$$;

revoke all on function public.register_r2_track_version(uuid, uuid, text, text, text, text, bigint) from public, anon, authenticated;
revoke all on function public.register_r2_file(uuid, uuid, public.file_type, text, text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.register_r2_track_version(uuid, uuid, text, text, text, text, bigint) to service_role;
grant execute on function public.register_r2_file(uuid, uuid, public.file_type, text, text, text, text, bigint) to service_role;
