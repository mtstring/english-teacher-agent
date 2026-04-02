-- Supabase で実行するテーブル作成 SQL
-- Supabase Dashboard > SQL Editor で実行してください

create table if not exists progress (
  user_id text primary key default 'default',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- updated_at を自動更新するトリガー
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger progress_updated_at
  before update on progress
  for each row
  execute function update_updated_at();

-- RLS (Row Level Security) を有効化
-- API キーで認証するため、anon キーでのアクセスを許可
alter table progress enable row level security;

create policy "Allow all access with anon key"
  on progress for all
  using (true)
  with check (true);
