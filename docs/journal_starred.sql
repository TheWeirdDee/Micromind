-- Adds a non-destructive "starred" flag to journal entries. Starring an entry
-- never changes its folder_id — it just also surfaces in the pinned Starred
-- section in the sidebar (see src/app/app/journal/page.tsx).

alter table journal_entries
  add column if not exists starred boolean not null default false;
