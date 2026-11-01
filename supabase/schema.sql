-- Margin schema. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Ids are the client's UUIDs and timestamps are epoch milliseconds, so local rows copy over unchanged.

create table if not exists boards (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at bigint not null,
  last_opened_at bigint not null,
  page_count int,
  last_page int,
  divider_ratio real,
  pane_visibility jsonb,
  paper text,
  paper_color text,
  note_pages int,
  pdf_zoom real,
  active_doc_id uuid,
  doc_count int
);

create table if not exists documents (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  name text not null,
  page_count int not null default 0,
  last_page int not null default 1,
  zoom real,
  added_at bigint not null
);
create index if not exists documents_board_idx on documents(board_id);

create table if not exists highlights (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  doc_id uuid references documents(id) on delete cascade,
  data jsonb not null -- the whole Highlight object (page, rects, color, text, font, noteId, ...)
);
create index if not exists highlights_board_idx on highlights(board_id);

-- One row per board. Embedded images live in the scene-files bucket, not in `files`.
create table if not exists scenes (
  board_id uuid primary key references boards(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  elements jsonb not null default '[]',
  app_state jsonb not null default '{}',
  files jsonb not null default '{}', -- file id -> {mimeType, created}; image bytes are in Storage
  version int not null default 1,
  updated_at timestamptz not null default now()
);

-- No foreign key on board_id: sessions are kept when a board is deleted, so streaks survive.
create table if not exists focus_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  board_id uuid not null,
  started_at bigint not null,
  data jsonb not null -- the whole FocusSession object
);
create index if not exists focus_sessions_user_idx on focus_sessions(user_id, started_at desc);

alter table boards enable row level security;
alter table documents enable row level security;
alter table highlights enable row level security;
alter table scenes enable row level security;
alter table focus_sessions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['boards','documents','highlights','scenes','focus_sessions'] loop
    execute format('drop policy if exists "own rows" on %I', t);
    execute format(
      'create policy "own rows" on %I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t);
    -- Tables may not be exposed to the Data API automatically; signed-in users only, never anon.
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

-- Private buckets. Objects live under {user id}/..., and only that user can touch them.
insert into storage.buckets (id, name, public) values ('pdfs', 'pdfs', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('scene-files', 'scene-files', false) on conflict (id) do nothing;

drop policy if exists "own pdfs" on storage.objects;
create policy "own pdfs" on storage.objects for all to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own scene files" on storage.objects;
create policy "own scene files" on storage.objects for all to authenticated
  using (bucket_id = 'scene-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'scene-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- Removes a PDF, its highlights, and fixes the board's doc count and active doc, in one transaction.
-- Returns false (and changes nothing) when it is the board's last PDF. The caller deletes the Storage object.
create or replace function remove_doc(p_doc_id uuid) returns boolean
language plpgsql security invoker set search_path = public as $$
declare
  v_board uuid;
  v_rest uuid[];
begin
  select board_id into v_board from documents where id = p_doc_id;
  if v_board is null then return false; end if;
  select array_agg(id order by added_at) into v_rest
    from documents where board_id = v_board and id <> p_doc_id;
  if v_rest is null then return false; end if;
  delete from documents where id = p_doc_id; -- highlights cascade
  update boards set
    doc_count = array_length(v_rest, 1),
    active_doc_id = case when active_doc_id = p_doc_id then v_rest[1] else active_doc_id end
  where id = v_board;
  return true;
end $$;
revoke execute on function remove_doc(uuid) from public, anon;
grant execute on function remove_doc(uuid) to authenticated;
